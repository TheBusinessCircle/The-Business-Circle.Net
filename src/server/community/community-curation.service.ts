import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG } from "@/config/community";
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
    | "no-items"
    | "completed"
    | "throttled";
  publishedCount: number;
  duplicateCount: number;
  skippedCount: number;
  publishedPostIds: string[];
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

export async function publishBcnCuratedPosts(options?: {
  fetchImpl?: typeof fetch;
}): Promise<PublishBcnCuratedPostsResult> {
  if (!bcnCurationEnabled()) {
    return {
      status: "disabled",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  const sourceUrl = bcnSourceUrl();
  if (!sourceUrl) {
    return {
      status: "missing-source",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
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
    return {
      status: "missing-author",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  if (!channel?.id) {
    return {
      status: "missing-channel",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  const sourceName = bcnSourceName();

  let payload: string;
  try {
    payload = await fetchSourcePayload(sourceUrl, options?.fetchImpl ?? fetch);
  } catch (error) {
    logServerError("bcn-curation-source-fetch-failed", error, {
      sourceUrl
    });

    return {
      status: "source-unavailable",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  const items = parseCommunityCurationSource(payload);
  if (!items.length) {
    logServerWarning("bcn-curation-no-source-items", {
      sourceUrl
    });

    return {
      status: "no-items",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  const publishedPostIds: string[] = [];
  let duplicateCount = 0;
  let skippedCount = 0;

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

  return {
    status: "completed",
    publishedCount: publishedPostIds.length,
    duplicateCount,
    skippedCount,
    publishedPostIds
  };
}

export async function maybePublishBcnCuratedPosts(
  now = new Date(),
  options?: {
    fetchImpl?: typeof fetch;
  }
): Promise<PublishBcnCuratedPostsResult> {
  if (now.getTime() - lastBcnCurationSweepAt < bcnCurationThrottleMs()) {
    return {
      status: "throttled",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      publishedPostIds: []
    };
  }

  lastBcnCurationSweepAt = now.getTime();
  return publishBcnCuratedPosts(options);
}
