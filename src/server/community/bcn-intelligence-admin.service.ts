import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CommunityPostKind } from "@prisma/client";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import { getBcnSignalLabel } from "@/lib/bcn-intelligence";
import { db } from "@/lib/db";
import {
  BCN_INTELLIGENCE_CATEGORIES,
  bcnCategoryToTag,
  getBcnIntelligenceSourceRegistry,
  type BcnIntelligenceCategory,
  type BcnIntelligenceSourceRegistryEntry
} from "@/lib/bcn-intelligence-sources";
import { buildCommunityPostPath } from "@/lib/community-paths";
import {
  buildBcnCuratedCandidate,
  isLikelyEnglishCurationItem,
  type CommunityCurationSourceItem
} from "@/lib/community-curation";
import { ensureCommunityChannels, resolveCommunityAutomationAuthorId } from "@/server/community/community.service";
import { resolveCommunitySourcePreviewMetadata } from "@/server/community/community-source-preview.service";

export type BcnIntelligenceSourceAdminModel = BcnIntelligenceSourceRegistryEntry & {
  effectiveEnabled: boolean;
  enabledOverride: boolean | null;
  healthStatus: string;
  lastFetchAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  fetchedCount: number;
  candidateCount: number;
  publishedCount: number;
};

export type BcnIntelligenceItemAdminModel = {
  id: string;
  title: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  primaryCategory: string | null;
  recommendedRoom: string | null;
  label: string | null;
  status: string;
  featured: boolean;
  businessOwnerScore: number | null;
  publishedAt: string | null;
  createdAt: string;
  commentCount: number;
};

const ADMIN_ITEM_STATUSES = new Set(["PUBLISHED", "DRAFT", "ARCHIVED"]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}.`;
}

function canonicalizeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("manual-intelligence-url-invalid");
  }

  url.hash = "";
  for (const param of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]) {
    url.searchParams.delete(param);
  }

  return url.toString().replace(/\/$/, "");
}

function sourceDomainFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
}

function findRegistryEntryForUrl(url: string) {
  const domain = sourceDomainFromUrl(url);
  return getBcnIntelligenceSourceRegistry().find(
    (source) => domain === source.domain || domain.endsWith(`.${source.domain}`)
  );
}

function titleCaseDomain(domain: string) {
  return domain
    .split(".")[0]!
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const matcher = new RegExp(
      `<meta\\s+[^>]*(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const match = html.match(matcher);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }

    const reversedMatcher = new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
      "i"
    );
    const reversedMatch = html.match(reversedMatcher);
    if (reversedMatch?.[1]) {
      return stripHtml(reversedMatch[1]);
    }
  }

  return "";
}

function readTitle(html: string) {
  return readMeta(html, ["og:title", "twitter:title"]) || stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function readPublishedAt(html: string) {
  const value = readMeta(html, [
    "article:published_time",
    "article:modified_time",
    "date",
    "pubdate",
    "publish-date"
  ]);
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fetchManualArticleMetadata(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.3",
        "user-agent": "The Business Circle Network manual intelligence bot"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`manual-intelligence-fetch-failed:${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("html")) {
      throw new Error("manual-intelligence-not-html");
    }

    const html = (await response.text()).slice(0, 1_500_000);
    const title = truncateText(readTitle(html), 160);
    const description = truncateText(
      readMeta(html, ["description", "og:description", "twitter:description"]),
      600
    );

    return {
      title,
      description,
      imageUrl: readMeta(html, ["og:image", "twitter:image"]) || null,
      author: readMeta(html, ["article:author", "author", "byl"]) || null,
      publishedAt: readPublishedAt(html)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sourceForManualUrl(url: string) {
  const registryEntry = findRegistryEntryForUrl(url);
  const domain = sourceDomainFromUrl(url);

  return {
    id: registryEntry?.id ?? `manual-${domain.replace(/[^a-z0-9]+/g, "-")}`,
    name: registryEntry?.name ?? titleCaseDomain(domain),
    domain,
    defaultRegion: registryEntry?.defaultRegion ?? "Global",
    defaultWeight: registryEntry?.defaultWeight ?? 0.88,
    commercialRelevanceWeight: registryEntry?.commercialRelevanceWeight ?? 0.88,
    credibilityTier: registryEntry?.credibilityTier ?? "manual"
  };
}

function sourceCredibilityScore(source: ReturnType<typeof sourceForManualUrl>) {
  const tierScore: Record<string, number> = {
    official: 9.1,
    primary: 8.8,
    major: 8,
    specialist: 7.2,
    manual: 6.8
  };

  return Math.min(10, Math.max(5, (tierScore[source.credibilityTier] ?? 6.8) * source.defaultWeight));
}

async function createOrUpdateIntelligenceFromCandidate(input: {
  item: CommunityCurationSourceItem;
  source: ReturnType<typeof sourceForManualUrl>;
  postId?: string;
}) {
  await ensureCommunityChannels();

  const candidate = buildBcnCuratedCandidate(input.item, input.source.name);
  if (!candidate) {
    throw new Error("manual-intelligence-not-relevant");
  }

  if (!isLikelyEnglishCurationItem(input.item)) {
    throw new Error("manual-intelligence-not-english");
  }

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

  if (!authorId || !channel?.id) {
    throw new Error("manual-intelligence-missing-author-or-channel");
  }

  if (!input.postId) {
    const duplicate = await db.communityPost.findFirst({
      where: {
        OR: [
          { intelligenceDedupeKey: candidate.checksum },
          ...(candidate.sourceUrl
            ? [{ sourceUrl: candidate.sourceUrl }, { intelligenceCanonicalUrl: candidate.sourceUrl }]
            : [])
        ]
      },
      select: {
        id: true
      }
    });

    if (duplicate?.id) {
      return {
        status: "duplicate" as const,
        postId: duplicate.id
      };
    }
  }

  const sourcePreview = await resolveCommunitySourcePreviewMetadata({
    title: candidate.title,
    sourceName: input.source.name,
    sourceUrl: candidate.sourceUrl ?? input.item.url,
    candidateImageUrl: input.item.imageUrl,
    category: candidate.primaryCategory
  });
  const credibilityScore = sourceCredibilityScore(input.source);
  const businessOwnerScore = Math.min(
    10,
    candidate.commercialImpactScore * 0.32 +
      candidate.relevanceScore * 0.24 +
      candidate.urgencyScore * 0.15 +
      credibilityScore * 0.17 +
      candidate.confidenceScore * 0.12
  );
  const label = getBcnSignalLabel({
    title: candidate.title,
    content: candidate.content,
    tags: candidate.tags,
    createdAt: input.item.publishedAt ?? new Date().toISOString(),
    intelligenceBusinessOwnerScore: businessOwnerScore,
    intelligenceLabel: candidate.label
  });
  const data = {
    channelId: channel.id,
    userId: authorId,
    title: candidate.title,
    content: candidate.content,
    tags: candidate.tags,
    kind: CommunityPostKind.FOUNDER_POST,
    automationSource: input.source.name,
    automationExternalId: candidate.externalId,
    automationChecksum: input.postId ? undefined : candidate.checksum,
    intelligenceSourceId: input.source.id,
    intelligenceSourceName: input.source.name,
    intelligenceCanonicalUrl: candidate.sourceUrl,
    intelligenceDedupeKey: input.postId ? undefined : candidate.checksum,
    intelligenceAuthor: input.item.author,
    intelligencePublishedAt: input.item.publishedAt ? new Date(input.item.publishedAt) : null,
    intelligencePrimaryCategory: candidate.primaryCategory,
    intelligenceSecondaryCategories: candidate.secondaryCategories,
    intelligenceLabel: label,
    intelligenceShortSummary: candidate.shortSummary,
    intelligenceKeyDetail: candidate.keyDetail,
    intelligenceWhyThisMatters: candidate.whyThisMatters,
    intelligenceBusinessOwnerImpact: candidate.businessOwnerImpact,
    intelligenceFounderTakeaway: candidate.founderTakeaway,
    intelligenceWhatToWatchNext: candidate.whatToWatchNext,
    intelligencePossibleRisks: candidate.possibleRisks,
    intelligencePossibleOpportunities: candidate.possibleOpportunities,
    intelligenceAffectedBusinessAreas: candidate.affectedBusinessAreas,
    intelligenceSuggestedDiscussionPrompt: candidate.suggestedDiscussionPrompt,
    intelligenceRecommendedRoom: candidate.recommendedRoom,
    intelligenceUrgencyScore: candidate.urgencyScore,
    intelligenceRelevanceScore: candidate.relevanceScore,
    intelligenceCommercialImpactScore: candidate.commercialImpactScore,
    intelligenceConfidenceScore: candidate.confidenceScore,
    intelligenceSourceCredibilityScore: credibilityScore,
    intelligenceBusinessOwnerScore: businessOwnerScore,
    intelligenceRegion: input.source.defaultRegion,
    intelligenceSectorsAffected: candidate.sectorsAffected,
    intelligenceStatus: "PUBLISHED",
    intelligenceEnrichedAt: new Date(),
    sourceUrl: sourcePreview.sourceUrl,
    sourceDomain: sourcePreview.sourceDomain,
    previewImageUrl: sourcePreview.previewImageUrl,
    previewImageKind: sourcePreview.previewImageKind,
    previewGeneratedAt: sourcePreview.previewGeneratedAt,
    automatedAt: new Date()
  };

  const post = input.postId
    ? await db.communityPost.update({
        where: {
          id: input.postId
        },
        data: {
          ...data,
          automationChecksum: undefined,
          intelligenceDedupeKey: undefined
        },
        select: {
          id: true
        }
      })
    : await db.communityPost.create({
        data,
        select: {
          id: true
        }
      });

  revalidatePath(BCN_UPDATES_MEMBER_ROUTE);
  revalidatePath(buildCommunityPostPath(post.id, BCN_UPDATES_CHANNEL_SLUG));

  return {
    status: "published" as const,
    postId: post.id
  };
}

export async function listBcnIntelligenceSourcesForAdmin(): Promise<BcnIntelligenceSourceAdminModel[]> {
  const registry = getBcnIntelligenceSourceRegistry();
  const states = await db.intelligenceSourceState.findMany().catch(() => []);
  const stateById = new Map(states.map((state) => [state.id, state]));

  return registry.map((source) => {
    const state = stateById.get(source.id);
    const effectiveEnabled = state?.enabledOverride ?? source.enabled;

    return {
      ...source,
      effectiveEnabled,
      enabledOverride: state?.enabledOverride ?? null,
      healthStatus: state?.healthStatus ?? "unknown",
      lastFetchAt: state?.lastFetchAt?.toISOString() ?? null,
      lastSuccessAt: state?.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: state?.lastErrorAt?.toISOString() ?? null,
      lastError: state?.lastError ?? source.disabledReason ?? null,
      fetchedCount: state?.fetchedCount ?? 0,
      candidateCount: state?.candidateCount ?? 0,
      publishedCount: state?.publishedCount ?? 0
    };
  });
}

export async function listBcnIntelligenceItemsForAdmin(): Promise<BcnIntelligenceItemAdminModel[]> {
  const posts = await db.communityPost.findMany({
    where: {
      deletedAt: null,
      channel: {
        slug: BCN_UPDATES_CHANNEL_SLUG
      },
      OR: [
        {
          tags: {
            has: "bcn-update"
          }
        },
        {
          intelligenceSourceName: {
            not: null
          }
        }
      ]
    },
    orderBy: [
      {
        intelligenceFeatured: "desc"
      },
      {
        createdAt: "desc"
      }
    ],
    take: 16,
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      sourceDomain: true,
      intelligenceSourceName: true,
      intelligencePrimaryCategory: true,
      intelligenceRecommendedRoom: true,
      intelligenceLabel: true,
      intelligenceStatus: true,
      intelligenceFeatured: true,
      intelligenceBusinessOwnerScore: true,
      intelligencePublishedAt: true,
      createdAt: true,
      _count: {
        select: {
          comments: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    sourceName: post.intelligenceSourceName,
    sourceUrl: post.sourceUrl,
    sourceDomain: post.sourceDomain,
    primaryCategory: post.intelligencePrimaryCategory,
    recommendedRoom: post.intelligenceRecommendedRoom,
    label: post.intelligenceLabel,
    status: post.intelligenceStatus,
    featured: post.intelligenceFeatured,
    businessOwnerScore: post.intelligenceBusinessOwnerScore,
    publishedAt: post.intelligencePublishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    commentCount: post._count.comments
  }));
}

export async function manuallyAddBcnIntelligenceUrl(input: { url: string }) {
  const canonicalUrl = canonicalizeUrl(input.url);
  const source = sourceForManualUrl(canonicalUrl);
  const metadata = await fetchManualArticleMetadata(canonicalUrl);
  const title = metadata.title || titleCaseDomain(source.domain);
  const description = metadata.description || title;

  const item: CommunityCurationSourceItem = {
    sourceId: canonicalUrl,
    title,
    summary: description,
    content: description,
    url: canonicalUrl,
    sourceName: source.name,
    imageUrl: metadata.imageUrl,
    author: metadata.author,
    publishedAt: metadata.publishedAt ?? new Date().toISOString()
  };

  return createOrUpdateIntelligenceFromCandidate({ item, source });
}

export async function updateBcnIntelligenceItem(input: {
  postId: string;
  featured?: boolean;
  status?: string;
  primaryCategory?: string;
  recommendedRoom?: string;
}) {
  const post = await db.communityPost.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      tags: true,
      channel: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!post || post.channel.slug !== BCN_UPDATES_CHANNEL_SLUG) {
    throw new Error("intelligence-item-not-found");
  }

  const data: {
    intelligenceFeatured?: boolean;
    intelligenceStatus?: string;
    intelligencePrimaryCategory?: string;
    intelligenceRecommendedRoom?: string;
    tags?: string[];
  } = {};

  if (typeof input.featured === "boolean") {
    data.intelligenceFeatured = input.featured;
  }

  if (input.status) {
    const status = input.status.toUpperCase();
    if (!ADMIN_ITEM_STATUSES.has(status)) {
      throw new Error("intelligence-status-invalid");
    }
    data.intelligenceStatus = status;
    if (status === "ARCHIVED") {
      data.intelligenceFeatured = false;
    }
  }

  if (input.primaryCategory) {
    if (!BCN_INTELLIGENCE_CATEGORIES.includes(input.primaryCategory as BcnIntelligenceCategory)) {
      throw new Error("intelligence-category-invalid");
    }

    const category = input.primaryCategory as BcnIntelligenceCategory;
    const categoryTags = new Set(BCN_INTELLIGENCE_CATEGORIES.map((entry) => bcnCategoryToTag(entry)));
    data.intelligencePrimaryCategory = category;
    data.tags = Array.from(
      new Set([
        ...post.tags.filter((tag) => !categoryTags.has(tag)),
        bcnCategoryToTag(category),
        "bcn-update",
        "curated"
      ])
    );
  }

  if (typeof input.recommendedRoom === "string") {
    data.intelligenceRecommendedRoom = truncateText(input.recommendedRoom, 80);
  }

  const updated = await db.communityPost.update({
    where: {
      id: input.postId
    },
    data,
    select: {
      id: true
    }
  });

  revalidatePath(BCN_UPDATES_MEMBER_ROUTE);
  revalidatePath(buildCommunityPostPath(updated.id, BCN_UPDATES_CHANNEL_SLUG));

  return updated;
}

export async function reEnrichBcnIntelligenceItem(input: { postId: string }) {
  const post = await db.communityPost.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      title: true,
      content: true,
      sourceUrl: true,
      intelligenceCanonicalUrl: true,
      intelligenceSourceName: true,
      intelligencePublishedAt: true,
      intelligenceAuthor: true,
      channel: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!post || post.channel.slug !== BCN_UPDATES_CHANNEL_SLUG) {
    throw new Error("intelligence-item-not-found");
  }

  const url = post.intelligenceCanonicalUrl ?? post.sourceUrl;
  if (!url) {
    throw new Error("intelligence-item-missing-source-url");
  }

  const canonicalUrl = canonicalizeUrl(url);
  const source = sourceForManualUrl(canonicalUrl);
  const metadata = await fetchManualArticleMetadata(canonicalUrl).catch(() => null);
  const summary = metadata?.description || stripHtml(post.content).slice(0, 600) || post.title;
  const checksum = createHash("sha256").update(`${canonicalUrl}:${Date.now()}`).digest("hex");
  const item: CommunityCurationSourceItem = {
    sourceId: `${canonicalUrl}:${checksum}`,
    title: metadata?.title || post.title,
    summary,
    content: summary,
    url: canonicalUrl,
    sourceName: metadata ? source.name : post.intelligenceSourceName ?? source.name,
    imageUrl: metadata?.imageUrl,
    author: metadata?.author ?? post.intelligenceAuthor,
    publishedAt: metadata?.publishedAt ?? post.intelligencePublishedAt?.toISOString() ?? new Date().toISOString()
  };

  return createOrUpdateIntelligenceFromCandidate({
    item,
    source,
    postId: post.id
  });
}

export async function setBcnIntelligenceSourceEnabled(input: {
  sourceId: string;
  enabled: boolean;
}) {
  const source = getBcnIntelligenceSourceRegistry().find((entry) => entry.id === input.sourceId);
  if (!source) {
    throw new Error("intelligence-source-not-found");
  }

  return db.intelligenceSourceState.upsert({
    where: {
      id: source.id
    },
    update: {
      enabledOverride: input.enabled,
      disabledReason: input.enabled ? null : source.disabledReason ?? "Disabled by admin."
    },
    create: {
      id: source.id,
      enabledOverride: input.enabled,
      healthStatus: "unknown",
      disabledReason: input.enabled ? null : source.disabledReason ?? "Disabled by admin."
    }
  });
}
