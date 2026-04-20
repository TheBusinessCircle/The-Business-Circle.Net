import { revalidatePath } from "next/cache";
import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import { buildCommunityPostPath } from "@/lib/community-paths";
import {
  buildBcnCuratedCandidate,
  buildBcnCurationSourceLabel,
  isLikelyEnglishCurationItem,
  parseCommunityCurationSource,
  type CommunityCurationSourceItem
} from "@/lib/community-curation";
import { db } from "@/lib/db";
import { logServerError, logServerWarning } from "@/lib/security/logging";
import { ensureCommunityChannels, resolveCommunityAutomationAuthorId } from "@/server/community/community.service";

const DEFAULT_BCN_CURATION_THROTTLE_MS = 5 * 60 * 1000;
const DEFAULT_BCN_CURATION_MAX_POSTS_PER_RUN = 5;

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
  sourceConfigured: boolean;
  authorResolved: boolean | null;
  fetchedCount: number;
  candidateCount: number;
  publishedCount: number;
  duplicateCount: number;
  skippedCount: number;
  rejectedNonEnglishCount: number;
  rejectedNotRelevantCount: number;
  rejectedStaleCount: number;
  lookbackHours: number;
  maxPostsPerRun: number;
  throttleMs: number;
  publishedPostIds: string[];
  errors: string[];
  message: string;
};

type ResolvedBcnSource = ReturnType<typeof resolveBcnSources>[number];

type QueuedBcnSourceItem = {
  item: CommunityCurationSourceItem;
  source: ResolvedBcnSource;
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

function bcnLookbackHours() {
  const value = Number(process.env.BCN_COMMUNITY_LOOKBACK_HOURS ?? 24);
  if (!Number.isFinite(value)) {
    return 24;
  }

  return Math.max(1, Math.min(168, Math.floor(value)));
}

function isWithinLookbackWindow(publishedAt: string | null, now: Date) {
  if (!publishedAt) {
    return false;
  }

  const publishedDate = new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) {
    return false;
  }

  const cutoff = now.getTime() - bcnLookbackHours() * 60 * 60 * 1000;
  return publishedDate.getTime() >= cutoff;
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
    sourceConfigured: false,
    authorResolved: null,
    fetchedCount: 0,
    candidateCount: 0,
    publishedCount: 0,
    duplicateCount: 0,
    skippedCount: 0,
    rejectedNonEnglishCount: 0,
    rejectedNotRelevantCount: 0,
    rejectedStaleCount: 0,
    lookbackHours: bcnLookbackHours(),
    maxPostsPerRun: bcnMaxPostsPerRun(),
    throttleMs: bcnCurationThrottleMs(),
    publishedPostIds: [],
    errors: [],
    ...overrides
  };
}

function itemPublishedAtTime(item: CommunityCurationSourceItem) {
  if (!item.publishedAt) {
    return 0;
  }

  const publishedAt = new Date(item.publishedAt).getTime();
  return Number.isNaN(publishedAt) ? 0 : publishedAt;
}

function buildCompletedRunMessage(result: {
  sourceCount: number;
  fetchedCount: number;
  publishedCount: number;
  duplicateCount: number;
  rejectedNonEnglishCount: number;
  rejectedNotRelevantCount: number;
  rejectedStaleCount: number;
  errors: string[];
}) {
  const itemLabel = result.fetchedCount === 1 ? "item" : "items";
  const sourceLabel = result.sourceCount === 1 ? "source" : "sources";
  const updateLabel = result.publishedCount === 1 ? "update" : "updates";
  const summary =
    `Fetched ${result.fetchedCount} ${itemLabel} from ${result.sourceCount} ${sourceLabel}. ` +
    `Skipped ${result.rejectedStaleCount} stale, ${result.rejectedNonEnglishCount} non-English, ` +
    `${result.rejectedNotRelevantCount} not relevant, and ${result.duplicateCount} duplicate items.`;

  if (result.publishedCount) {
    return `Published ${result.publishedCount} BCN ${updateLabel}. ${summary}`;
  }

  const sourceIssueSummary = result.errors.length
    ? ` ${result.errors.length} source issue${result.errors.length === 1 ? "" : "s"} were also reported.`
    : "";

  return `No BCN updates were published. ${summary}${sourceIssueSummary}`;
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
  const sources = resolveBcnSources();
  const sourceConfigured = sources.length > 0;
  const lookbackHours = bcnLookbackHours();
  const maxPostsPerRun = bcnMaxPostsPerRun();
  const throttleMs = bcnCurationThrottleMs();

  if (!bcnCurationEnabled()) {
    return baseResult("disabled", "BCN Updates automation is disabled by configuration.", {
      sourceCount: sources.length,
      sourceConfigured,
      lookbackHours,
      maxPostsPerRun,
      throttleMs
    });
  }

  if (!sources.length) {
    return baseResult(
      "missing-source",
      "No BCN source feeds are configured. Set BCN_COMMUNITY_SOURCE_URLS or BCN_COMMUNITY_SOURCE_URL.",
      {
        sourceCount: 0,
        sourceConfigured,
        lookbackHours,
        maxPostsPerRun,
        throttleMs
      }
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
      "No automation author could be resolved. Set COMMUNITY_AUTOMATION_AUTHOR_ID or ensure at least one active admin exists.",
      {
        sourceCount: sources.length,
        sourceConfigured,
        authorResolved: false,
        lookbackHours,
        maxPostsPerRun,
        throttleMs
      }
    );
  }

  if (!channel?.id) {
    return baseResult(
      "missing-channel",
      `The BCN Updates channel (${BCN_UPDATES_CHANNEL_SLUG}) could not be found.`,
      {
        sourceCount: sources.length,
        sourceConfigured,
        authorResolved: true,
        lookbackHours,
        maxPostsPerRun,
        throttleMs
      }
    );
  }

  const publishedPostIds: string[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;
  let skippedCount = 0;
  let fetchedCount = 0;
  let candidateCount = 0;
  let rejectedNonEnglishCount = 0;
  let rejectedNotRelevantCount = 0;
  let rejectedStaleCount = 0;
  const now = new Date();
  const seenExternalIds = new Set<string>();
  const seenChecksums = new Set<string>();
  const queuedItems: QueuedBcnSourceItem[] = [];

  for (const source of sources) {
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
    queuedItems.push(...items.map((item) => ({ item, source })));
  }

  queuedItems.sort((left, right) => {
    const publishedTimeDelta = itemPublishedAtTime(right.item) - itemPublishedAtTime(left.item);
    if (publishedTimeDelta !== 0) {
      return publishedTimeDelta;
    }

    return left.item.title.localeCompare(right.item.title);
  });

  for (const queuedItem of queuedItems) {
    if (publishedPostIds.length >= maxPostsPerRun) {
      break;
    }

    const { item, source } = queuedItem;

    if (!isWithinLookbackWindow(item.publishedAt, now)) {
      rejectedStaleCount += 1;
      logServerWarning("bcn-curation-item-skipped", {
        reason: "outside-lookback-window",
        sourceId: item.sourceId,
        sourceName: source.label,
        publishedAt: item.publishedAt,
        lookbackHours
      });
      continue;
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
      rejectedNotRelevantCount += 1;
      logServerWarning("bcn-curation-item-skipped", {
        reason: "not-relevant",
        sourceId: item.sourceId,
        sourceName: source.label
      });
      continue;
    }

    candidateCount += 1;

    if (
      seenExternalIds.has(`${source.label}:${candidate.externalId}`) ||
      seenChecksums.has(candidate.checksum)
    ) {
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
        sourceConfigured,
        authorResolved: true,
        errors,
        lookbackHours,
        maxPostsPerRun,
        throttleMs
      }
    );
  }

  if (!fetchedCount) {
    return baseResult(
      "no-items",
      "The configured BCN sources responded, but no valid feed items could be normalized from them.",
      {
        sourceCount: sources.length,
        sourceConfigured,
        authorResolved: true,
        errors,
        lookbackHours,
        maxPostsPerRun,
        throttleMs
      }
    );
  }

  return baseResult("completed", buildCompletedRunMessage({
    sourceCount: sources.length,
    fetchedCount,
    publishedCount: publishedPostIds.length,
    duplicateCount,
    rejectedNonEnglishCount,
    rejectedNotRelevantCount,
    rejectedStaleCount,
    errors
  }), {
    sourceCount: sources.length,
    sourceConfigured,
    authorResolved: true,
    fetchedCount,
    candidateCount,
    publishedCount: publishedPostIds.length,
    duplicateCount,
    skippedCount,
    rejectedNonEnglishCount,
    rejectedNotRelevantCount,
    rejectedStaleCount,
    lookbackHours,
    maxPostsPerRun,
    throttleMs,
    publishedPostIds,
    errors
  });
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
