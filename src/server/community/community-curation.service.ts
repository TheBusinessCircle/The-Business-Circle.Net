import { revalidatePath } from "next/cache";
import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import { buildCommunityPostPath } from "@/lib/community-paths";
import {
  buildBcnCuratedCandidate,
  buildBcnCurationSourceLabel,
  isLikelyEnglishCurationItem,
  parseCommunityCurationSource
} from "@/lib/community-curation";
import { db } from "@/lib/db";
import { logServerError, logServerWarning } from "@/lib/security/logging";
import { ensureCommunityChannels, resolveCommunityAutomationAuthorId } from "@/server/community/community.service";

const DEFAULT_BCN_CURATION_THROTTLE_MS = 15 * 60 * 1000;
const DEFAULT_BCN_CURATION_MAX_POSTS_PER_RUN = 2;

let lastBcnCurationSweepAt = 0;

export type PublishBcnCuratedPostsResult = {
  status:
    | "disabled"
    | "missing-source"
    | "missing-author"
    | "missing-channel"
    | "source-unavailable"
    | "source-invalid"
    | "no-items"
    | "completed"
    | "throttled";
  sourceCount: number;
  fetchedCount: number;
  candidateCount: number;
  publishedCount: number;
  duplicateCount: number;
  skippedCount: number;
  rejectedNonEnglishCount: number;
  publishedPostIds: string[];
  errors: string[];
  message: string;
};

function bcnCurationEnabled() {
  return process.env.BCN_COMMUNITY_AUTOMATION_ENABLED?.trim().toLowerCase() !== "false";
}

function bcnSourceUrl() {
  return process.env.BCN_COMMUNITY_SOURCE_URL?.trim() || "";
}

function bcnSourceUrls() {
  return (process.env.BCN_COMMUNITY_SOURCE_URLS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function bcnSourceName() {
  return process.env.BCN_COMMUNITY_SOURCE_NAME?.trim() || "BCN Source";
}

function resolveBcnSources() {
  const legacyUrl = bcnSourceUrl();
  const legacyLabel = bcnSourceName();
  const configured = [
    ...bcnSourceUrls().map((url) => ({
      url,
      label: buildBcnCurationSourceLabel(url)
    })),
    ...(legacyUrl
      ? [
          {
            url: legacyUrl,
            label: buildBcnCurationSourceLabel(legacyUrl, legacyLabel)
          }
        ]
      : [])
  ];

  const seen = new Set<string>();
  return configured.filter((source) => {
    if (seen.has(source.url)) {
      return false;
    }

    seen.add(source.url);
    return true;
  });
}

function bcnCurationThrottleMs() {
  const value = Number(
    process.env.BCN_COMMUNITY_AUTOMATION_THROTTLE_MS ?? DEFAULT_BCN_CURATION_THROTTLE_MS
  );
  if (!Number.isFinite(value)) {
    return DEFAULT_BCN_CURATION_THROTTLE_MS;
  }

  return Math.max(60_000, Math.floor(value));
}

function bcnMaxPostsPerRun() {
  const value = Number(
    process.env.BCN_COMMUNITY_MAX_POSTS_PER_RUN ?? DEFAULT_BCN_CURATION_MAX_POSTS_PER_RUN
  );
  if (!Number.isFinite(value)) {
    return DEFAULT_BCN_CURATION_MAX_POSTS_PER_RUN;
  }

  return Math.max(1, Math.min(5, Math.floor(value)));
}

async function fetchSourcePayload(sourceUrl: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(sourceUrl, {
    headers: {
      accept: "application/json, application/xml, text/xml, application/rss+xml"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`bcn-source-fetch-failed:${response.status}`);
  }

  return response.text();
}

function baseResult(
  status: PublishBcnCuratedPostsResult["status"],
  message: string,
  overrides?: Partial<PublishBcnCuratedPostsResult>
): PublishBcnCuratedPostsResult {
  return {
    status,
    message,
    sourceCount: 0,
    fetchedCount: 0,
    candidateCount: 0,
    publishedCount: 0,
    duplicateCount: 0,
    skippedCount: 0,
    rejectedNonEnglishCount: 0,
    publishedPostIds: [],
    errors: [],
    ...overrides
  };
}

function revalidateBcnUpdateSurfaces(postIds: string[]) {
  revalidatePath(BCN_UPDATES_MEMBER_ROUTE);
  revalidatePath("/dashboard");

  for (const postId of postIds) {
    revalidatePath(buildCommunityPostPath(postId, BCN_UPDATES_CHANNEL_SLUG));
  }
}

export async function publishBcnCuratedPosts(options?: {
  fetchImpl?: typeof fetch;
}): Promise<PublishBcnCuratedPostsResult> {
  if (!bcnCurationEnabled()) {
    return baseResult("disabled", "BCN Updates automation is disabled by configuration.");
  }

  const sources = resolveBcnSources();
  if (!sources.length) {
    return baseResult(
      "missing-source",
      "No BCN source feeds are configured. Set BCN_COMMUNITY_SOURCE_URLS or BCN_COMMUNITY_SOURCE_URL."
    );
  }

  await ensureCommunityChannels();

  const [authorId, channel] = await Promise.all([
    resolveCommunityAutomationAuthorId(),
    db.channel.findUnique({
      where: {
        slug: BCN_UPDATES_CHANNEL_SLUG
      },
      select: {
        id: true
      }
    })
  ]);

  if (!authorId) {
    return baseResult(
      "missing-author",
      "No automation author could be resolved. Set COMMUNITY_AUTOMATION_AUTHOR_ID or ensure at least one active admin exists."
    );
  }

  if (!channel?.id) {
    return baseResult(
      "missing-channel",
      `The BCN Updates channel (${BCN_UPDATES_CHANNEL_SLUG}) could not be found.`
    );
  }

  const publishedPostIds: string[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;
  let skippedCount = 0;
  let fetchedCount = 0;
  let candidateCount = 0;
  let rejectedNonEnglishCount = 0;
  const maxPostsPerRun = bcnMaxPostsPerRun();
  const seenExternalIds = new Set<string>();
  const seenChecksums = new Set<string>();

  for (const source of sources) {
    if (publishedPostIds.length >= maxPostsPerRun) {
      break;
    }

    let payload: string;
    try {
      payload = await fetchSourcePayload(source.url, options?.fetchImpl ?? fetch);
    } catch (error) {
      logServerError("bcn-curation-source-fetch-failed", error, {
        sourceUrl: source.url
      });
      errors.push(`Fetch failed for ${source.label}: ${source.url}`);
      continue;
    }

    let items: ReturnType<typeof parseCommunityCurationSource>;
    try {
      items = parseCommunityCurationSource(payload);
    } catch (error) {
      logServerError("bcn-curation-parse-failed", error, {
        sourceUrl: source.url,
        sourceName: source.label
      });
      errors.push(`Unsupported payload from ${source.label}: ${source.url}`);
      continue;
    }

    if (!items.length) {
      logServerWarning("bcn-curation-no-source-items", {
        sourceUrl: source.url
      });
      errors.push(`No valid feed items were found in ${source.label}: ${source.url}`);
      continue;
    }

    fetchedCount += items.length;

    for (const item of items) {
      if (publishedPostIds.length >= maxPostsPerRun) {
        break;
      }

      if (!isLikelyEnglishCurationItem(item)) {
        rejectedNonEnglishCount += 1;
        logServerWarning("bcn-curation-item-skipped", {
          reason: "non-english",
          sourceId: item.sourceId,
          sourceName: source.label
        });
        continue;
      }

      const candidate = buildBcnCuratedCandidate(item, source.label);
      if (!candidate) {
        skippedCount += 1;
        logServerWarning("bcn-curation-item-skipped", {
          reason: "not-relevant",
          sourceId: item.sourceId,
          sourceName: source.label
        });
        continue;
      }

      candidateCount += 1;

      if (seenExternalIds.has(`${source.label}:${candidate.externalId}`) || seenChecksums.has(candidate.checksum)) {
        duplicateCount += 1;
        logServerWarning("bcn-curation-item-skipped", {
          reason: "duplicate-in-run",
          sourceId: item.sourceId,
          sourceName: source.label
        });
        continue;
      }

      seenExternalIds.add(`${source.label}:${candidate.externalId}`);
      seenChecksums.add(candidate.checksum);

      const existingPost = await db.communityPost.findFirst({
        where: {
          OR: [
            {
              automationChecksum: candidate.checksum
            },
            {
              automationSource: source.label,
              automationExternalId: candidate.externalId
            }
          ]
        },
        select: {
          id: true
        }
      });

      if (existingPost?.id) {
        duplicateCount += 1;
        logServerWarning("bcn-curation-item-skipped", {
          reason: "duplicate",
          sourceId: item.sourceId,
          sourceName: source.label
        });
        continue;
      }

      const createdPost = await db.communityPost.create({
        data: {
          channelId: channel.id,
          userId: authorId,
          title: candidate.title,
          content: candidate.content,
          tags: candidate.tags,
          kind: CommunityPostKind.FOUNDER_POST,
          automationSource: source.label,
          automationExternalId: candidate.externalId,
          automationChecksum: candidate.checksum,
          automatedAt: new Date()
        },
        select: {
          id: true
        }
      });

      publishedPostIds.push(createdPost.id);
    }
  }

  if (publishedPostIds.length) {
    revalidateBcnUpdateSurfaces(publishedPostIds);
  }

  if (!fetchedCount && errors.length === sources.length) {
    const upstreamFailure = errors.some((error) => error.startsWith("Fetch failed"));
    return baseResult(
      upstreamFailure ? "source-unavailable" : "source-invalid",
      upstreamFailure
        ? "None of the configured BCN sources could be fetched successfully."
        : "None of the configured BCN source payloads could be parsed into valid feed items.",
      {
        sourceCount: sources.length,
        errors
      }
    );
  }

  if (!fetchedCount) {
    return baseResult(
      "no-items",
      "The configured BCN sources responded, but no valid feed items could be normalized from them.",
      {
        sourceCount: sources.length,
        errors
      }
    );
  }

  return baseResult(
    "completed",
    publishedPostIds.length
      ? `Published ${publishedPostIds.length} BCN update${publishedPostIds.length === 1 ? "" : "s"} into the dedicated BCN Updates feed.`
      : "The run completed, but everything was skipped as duplicate, irrelevant, or too thin to publish.",
    {
      sourceCount: sources.length,
      fetchedCount,
      candidateCount,
      publishedCount: publishedPostIds.length,
      duplicateCount,
      skippedCount,
      rejectedNonEnglishCount,
      publishedPostIds,
      errors
    }
  );
}

export async function maybePublishBcnCuratedPosts(
  now = new Date(),
  options?: {
    fetchImpl?: typeof fetch;
  }
): Promise<PublishBcnCuratedPostsResult> {
  if (now.getTime() - lastBcnCurationSweepAt < bcnCurationThrottleMs()) {
    return baseResult(
      "throttled",
      `BCN Updates automation was checked too recently. Waiting for the ${bcnCurationThrottleMs()}ms throttle window to pass.`
    );
  }

  lastBcnCurationSweepAt = now.getTime();
  return publishBcnCuratedPosts(options);
}
