import { revalidatePath } from "next/cache";
import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import { parseBcnStructuredContent } from "@/lib/bcn-intelligence";
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
const DEFAULT_BCN_CURATION_MAX_POSTS_PER_RUN = 2;

const BCN_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "after",
  "over",
  "amid",
  "this",
  "that",
  "will",
  "have",
  "has",
  "had",
  "been",
  "being",
  "their",
  "about",
  "business",
  "businesses",
  "company",
  "companies",
  "market",
  "markets",
  "news",
  "update",
  "updates",
  "says",
  "said",
  "more",
  "than",
  "into",
  "across"
]);

const BCN_TAG_IMPORTANCE: Record<string, number> = {
  operations: 1.45,
  growth: 1.35,
  regulation: 1.35,
  "e-commerce": 1.28,
  marketing: 1.24,
  ai: 1.22,
  retail: 1.16,
  hiring: 1.16,
  leadership: 1.1,
  economy: 1.04
};

type PreparedBcnCandidate = {
  item: CommunityCurationSourceItem;
  source: ResolvedBcnSource;
  candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>;
  normalizedTitle: string;
  titleTokens: Set<string>;
  contentTokens: Set<string>;
  entityTokens: Set<string>;
  topicFingerprint: string[];
  sourceCredibility: number;
  score: number;
};

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

type BcnCandidateCluster = {
  key: string;
  members: PreparedBcnCandidate[];
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

function normalizeSimilarityText(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSimilarityText(value: string) {
  return normalizeSimilarityText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !BCN_STOP_WORDS.has(token));
}

function extractEntityTokens(value: string) {
  const matches = value.match(/\b[A-Z][A-Za-z0-9&.-]+(?:\s+[A-Z][A-Za-z0-9&.-]+){0,2}\b/g) ?? [];
  return new Set(
    matches
      .map((match) => match.trim().toLowerCase())
      .filter((match) => match.length >= 4 && !match.includes("bcn"))
  );
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }

  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function overlapShare(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }

  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;
  for (const value of smaller) {
    if (larger.has(value)) {
      shared += 1;
    }
  }

  return shared / smaller.size;
}

function sourceCredibilityScore(source: ResolvedBcnSource) {
  const haystack = `${source.label} ${source.url}`.toLowerCase();

  if (haystack.includes("reuters")) {
    return 1.28;
  }

  if (haystack.includes("bbc")) {
    return 1.18;
  }

  if (haystack.includes("ft") || haystack.includes("financial times")) {
    return 1.22;
  }

  if (haystack.includes("apnews") || haystack.includes("ap news")) {
    return 1.18;
  }

  if (haystack.includes("cnbc") || haystack.includes("bloomberg")) {
    return 1.14;
  }

  return 1;
}

function candidateTagImportanceScore(tags: string[]) {
  return tags.reduce((score, tag) => score + (BCN_TAG_IMPORTANCE[tag] ?? 0.92), 0);
}

function countSpecificSignals(value: string) {
  return (
    (value.match(/\b(?:19|20)\d{2}\b/g) ?? []).length +
    (value.match(/\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g) ?? []).length +
    (value.match(/\b[A-Z][A-Za-z0-9&.-]+(?:\s+[A-Z][A-Za-z0-9&.-]+){0,2}\b/g) ?? []).length
  );
}

function buildTopicFingerprint(item: CommunityCurationSourceItem, candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>) {
  const rankedTokens = Array.from(
    new Set(
      [
        ...tokenizeSimilarityText(item.title),
        ...tokenizeSimilarityText(item.summary),
        ...tokenizeSimilarityText(candidate.title),
        ...candidate.tags.filter((tag) => tag !== "bcn-update" && tag !== "curated")
      ].filter(Boolean)
    )
  );

  return rankedTokens.slice(0, 8);
}

function freshnessScore(item: CommunityCurationSourceItem) {
  const publishedTime = itemPublishedAtTime(item);
  if (!publishedTime) {
    return 0.65;
  }

  const ageHours = Math.max(0, (Date.now() - publishedTime) / (60 * 60 * 1000));
  if (ageHours <= 4) {
    return 1.2;
  }

  if (ageHours <= 10) {
    return 1.08;
  }

  if (ageHours <= 24) {
    return 0.96;
  }

  return 0.8;
}

function detailRichnessScore(item: CommunityCurationSourceItem, candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>) {
  const parsed = parseBcnStructuredContent(candidate.content);
  const detailLength =
    (parsed?.articleDetail.length ?? 0) +
    (parsed?.whatHappened.length ?? 0) +
    (parsed?.keyDetail.length ?? 0);
  const rawSpecificity = countSpecificSignals(`${candidate.title} ${item.summary} ${item.content}`);

  return detailLength / 340 + rawSpecificity * 0.18;
}

function noveltyScore(prepared: PreparedBcnCandidate) {
  return Math.min(1.25, 0.7 + prepared.topicFingerprint.length * 0.06 + prepared.entityTokens.size * 0.08);
}

function discussionValueScore(candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>) {
  const parsed = parseBcnStructuredContent(candidate.content);
  if (!parsed) {
    return 0.7;
  }

  return (
    parsed.whyThisMatters.length / 220 +
    parsed.whoThisAffects.length / 200 +
    parsed.whatToWatchNext.length / 180
  );
}

function practicalImportanceScore(item: CommunityCurationSourceItem, candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>) {
  const content = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  const directSignals = [
    "pricing",
    "margin",
    "demand",
    "regulation",
    "compliance",
    "recall",
    "hiring",
    "layoff",
    "inventory",
    "operations",
    "traffic",
    "conversion",
    "forecast",
    "guidance"
  ].reduce((score, token) => score + (content.includes(token) ? 0.16 : 0), 0);

  return candidateTagImportanceScore(candidate.tags) + directSignals;
}

function buildPreparedBcnCandidate(
  queuedItem: QueuedBcnSourceItem,
  candidate: NonNullable<ReturnType<typeof buildBcnCuratedCandidate>>
): PreparedBcnCandidate {
  const titleTokens = new Set(tokenizeSimilarityText(candidate.title));
  const contentTokens = new Set(
    tokenizeSimilarityText(`${queuedItem.item.summary} ${queuedItem.item.content}`).slice(0, 28)
  );
  const entityTokens = extractEntityTokens(
    `${queuedItem.item.title} ${queuedItem.item.summary} ${queuedItem.item.content}`
  );
  const topicFingerprint = buildTopicFingerprint(queuedItem.item, candidate);
  const sourceCredibility = sourceCredibilityScore(queuedItem.source);
  const score =
    freshnessScore(queuedItem.item) * 1.1 +
    detailRichnessScore(queuedItem.item, candidate) * 1.2 +
    sourceCredibility * 0.95 +
    noveltyScore({
      item: queuedItem.item,
      source: queuedItem.source,
      candidate,
      normalizedTitle: "",
      titleTokens,
      contentTokens,
      entityTokens,
      topicFingerprint,
      sourceCredibility,
      score: 0
    } as PreparedBcnCandidate) *
      0.7 +
    discussionValueScore(candidate) * 1.05 +
    practicalImportanceScore(queuedItem.item, candidate) * 1.15;

  return {
    item: queuedItem.item,
    source: queuedItem.source,
    candidate,
    normalizedTitle: normalizeSimilarityText(candidate.title),
    titleTokens,
    contentTokens,
    entityTokens,
    topicFingerprint,
    sourceCredibility,
    score
  };
}

function candidatesAreNearDuplicates(left: PreparedBcnCandidate, right: PreparedBcnCandidate) {
  if (
    left.normalizedTitle === right.normalizedTitle ||
    left.candidate.checksum === right.candidate.checksum ||
    left.candidate.dedupeKey === right.candidate.dedupeKey
  ) {
    return true;
  }

  const titleSimilarity = jaccardSimilarity(left.titleTokens, right.titleTokens);
  const contentSimilarity = jaccardSimilarity(left.contentTokens, right.contentTokens);
  const entitySimilarity = jaccardSimilarity(left.entityTokens, right.entityTokens);
  const titleOverlap = overlapShare(left.titleTokens, right.titleTokens);
  const fingerprintSimilarity = jaccardSimilarity(
    new Set(left.topicFingerprint),
    new Set(right.topicFingerprint)
  );

  if (titleSimilarity >= 0.74) {
    return true;
  }

  if (titleOverlap >= 0.7 && (entitySimilarity >= 0.18 || contentSimilarity >= 0.18)) {
    return true;
  }

  if (titleSimilarity >= 0.38 && entitySimilarity >= 0.16 && contentSimilarity >= 0.14) {
    return true;
  }

  if (titleSimilarity >= 0.52 && (contentSimilarity >= 0.4 || fingerprintSimilarity >= 0.58)) {
    return true;
  }

  if (entitySimilarity >= 0.6 && contentSimilarity >= 0.34) {
    return true;
  }

  return false;
}

function clusterPreparedCandidates(candidates: PreparedBcnCandidate[]) {
  const clusters: BcnCandidateCluster[] = [];

  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    const existingCluster = clusters.find((cluster) =>
      cluster.members.some((member) => candidatesAreNearDuplicates(member, candidate))
    );

    if (existingCluster) {
      existingCluster.members.push(candidate);
      continue;
    }

    clusters.push({
      key: candidate.topicFingerprint.join(":") || candidate.normalizedTitle,
      members: [candidate]
    });
  }

  return clusters;
}

function pickClusterWinner(cluster: BcnCandidateCluster) {
  return [...cluster.members].sort((left, right) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const specificityDelta =
      countSpecificSignals(`${right.candidate.title} ${right.item.summary} ${right.item.content}`) -
      countSpecificSignals(`${left.candidate.title} ${left.item.summary} ${left.item.content}`);
    if (specificityDelta !== 0) {
      return specificityDelta;
    }

    return itemPublishedAtTime(right.item) - itemPublishedAtTime(left.item);
  })[0]!;
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
      "No automation author could be resolved. Set COMMUNITY_AUTOMATION_AUTHOR_ID to a real user ID (not an email), or ensure at least one active admin exists.",
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
  const preparedCandidates: PreparedBcnCandidate[] = [];

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

  for (const queuedItem of queuedItems) {
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
    preparedCandidates.push(buildPreparedBcnCandidate(queuedItem, candidate));
  }

  const candidateClusters = clusterPreparedCandidates(preparedCandidates);
  duplicateCount += Math.max(0, preparedCandidates.length - candidateClusters.length);

  const clusterWinners = candidateClusters
    .map((cluster) => pickClusterWinner(cluster))
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return itemPublishedAtTime(right.item) - itemPublishedAtTime(left.item);
    });

  const selectedCandidates: PreparedBcnCandidate[] = [];

  for (const prepared of clusterWinners) {
    if (selectedCandidates.length >= maxPostsPerRun) {
      break;
    }

    if (selectedCandidates.some((selected) => candidatesAreNearDuplicates(selected, prepared))) {
      duplicateCount += 1;
      logServerWarning("bcn-curation-item-skipped", {
        reason: "duplicate-cluster-overlap",
        sourceId: prepared.item.sourceId,
        sourceName: prepared.source.label
      });
      continue;
    }

    selectedCandidates.push(prepared);
  }

  for (const prepared of selectedCandidates) {
    const { item, source, candidate } = prepared;

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
