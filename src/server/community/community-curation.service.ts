import { revalidatePath } from "next/cache";
import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import { buildCommunityPostPath } from "@/lib/community-paths";
import { buildBcnCuratedCandidate, parseCommunityCurationSource } from "@/lib/community-curation";
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
  publishedCount: number;
  duplicateCount: number;
  skippedCount: number;
  publishedPostIds: string[];
  fetchedItemCount: number;
  message: string;
};

function bcnCurationEnabled() {
  return process.env.BCN_COMMUNITY_AUTOMATION_ENABLED?.trim().toLowerCase() !== "false";
}

function bcnSourceUrl() {
  return process.env.BCN_COMMUNITY_SOURCE_URL?.trim() || "";
}

function bcnSourceName() {
  return process.env.BCN_COMMUNITY_SOURCE_NAME?.trim() || "BCN Source";
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
    publishedCount: 0,
    duplicateCount: 0,
    skippedCount: 0,
    publishedPostIds: [],
    fetchedItemCount: 0,
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

  const sourceUrl = bcnSourceUrl();
  if (!sourceUrl) {
    return baseResult(
      "missing-source",
      "BCN_COMMUNITY_SOURCE_URL is blank, so there is no source feed to fetch."
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

  const sourceName = bcnSourceName();

  let payload: string;
  try {
    payload = await fetchSourcePayload(sourceUrl, options?.fetchImpl ?? fetch);
  } catch (error) {
    logServerError("bcn-curation-source-fetch-failed", error, {
      sourceUrl
    });

    return baseResult(
      "source-unavailable",
      `The configured BCN source could not be fetched from ${sourceUrl}.`
    );
  }

  let items: ReturnType<typeof parseCommunityCurationSource>;
  try {
    items = parseCommunityCurationSource(payload);
  } catch (error) {
    logServerError("bcn-curation-parse-failed", error, {
      sourceUrl,
      sourceName
    });

    return baseResult(
      "source-invalid",
      "The configured BCN source payload could not be parsed as a supported RSS, Atom, or JSON feed."
    );
  }

  if (!items.length) {
    logServerWarning("bcn-curation-no-source-items", {
      sourceUrl
    });

    return baseResult(
      "no-items",
      "The source responded, but no valid feed items could be normalized from the payload.",
      {
        fetchedItemCount: 0
      }
    );
  }

  const publishedPostIds: string[] = [];
  let duplicateCount = 0;
  let skippedCount = 0;
  const seenExternalIds = new Set<string>();

  for (const item of items.slice(0, 12)) {
    if (publishedPostIds.length >= bcnMaxPostsPerRun()) {
      break;
    }

    const candidate = buildBcnCuratedCandidate(item, sourceName);
    if (!candidate) {
      skippedCount += 1;
      logServerWarning("bcn-curation-item-skipped", {
        reason: "not-relevant",
        sourceId: item.sourceId
      });
      continue;
    }

    if (seenExternalIds.has(candidate.externalId)) {
      duplicateCount += 1;
      logServerWarning("bcn-curation-item-skipped", {
        reason: "duplicate-in-feed",
        sourceId: item.sourceId
      });
      continue;
    }

    seenExternalIds.add(candidate.externalId);

    const existingPost = await db.communityPost.findFirst({
      where: {
        OR: [
          {
            automationChecksum: candidate.checksum
          },
          {
            automationSource: sourceName,
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
        sourceId: item.sourceId
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
        automationSource: sourceName,
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

  if (publishedPostIds.length) {
    revalidateBcnUpdateSurfaces(publishedPostIds);
  }

  return baseResult(
    "completed",
    publishedPostIds.length
      ? `Published ${publishedPostIds.length} BCN update${publishedPostIds.length === 1 ? "" : "s"} into the dedicated BCN Updates feed.`
      : "The run completed, but everything was skipped as duplicate, irrelevant, or too thin to publish.",
    {
      publishedCount: publishedPostIds.length,
      duplicateCount,
      skippedCount,
      publishedPostIds,
      fetchedItemCount: items.length
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
