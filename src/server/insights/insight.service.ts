import { ResourceTier } from "@prisma/client";
import { INSIGHT_TOPIC_CLUSTERS, PUBLIC_INSIGHT_ARTICLES } from "@/config/insights";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import { buildPlannedResourceSeeds } from "@/lib/resources/catalog";
import { splitResourceContentSections } from "@/lib/resources/markdown";
import type {
  InsightTopicClusterSummary,
  PublicInsightArticle,
  PublicInsightSummary
} from "@/types/insights";

const INSIGHT_REFERENCE_DATE = new Date("2026-03-24T12:00:00.000Z");
const insightDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const resourceMap = new Map(
  buildPlannedResourceSeeds(INSIGHT_REFERENCE_DATE).map((resource) => [resource.slug, resource])
);

function parsePublishedDate(value: string) {
  return new Date(`${value}T08:00:00.000Z`);
}

function buildClusterHref(clusterSlug: string) {
  return `/insights/topic/${clusterSlug}`;
}

function buildMembershipHref(tier: ResourceTier, slug: string) {
  const params = new URLSearchParams();

  params.set(
    "tier",
    tier === "CORE" ? "CORE" : tier === "INNER" ? "INNER_CIRCLE" : "FOUNDATION"
  );
  params.set("from", `/insights/${slug}`);

  return `/membership?${params.toString()}`;
}

function buildLockedPreviewSections(content?: string) {
  if (!content) {
    return ["Deeper framework", "Member next steps"];
  }

  const parsed = splitResourceContentSections(content);
  const headings = parsed.sections
    .slice(2)
    .map((section) => section.heading.trim())
    .filter(Boolean);

  return headings.length ? headings : ["Deeper framework", "Member next steps"];
}

function buildInsightArticle(slug: string): PublicInsightArticle | null {
  const seed = PUBLIC_INSIGHT_ARTICLES.find((item) => item.slug === slug);

  if (!seed) {
    return null;
  }

  const source = resourceMap.get(seed.sourceResourceSlug);
  const tier = source?.tier ?? ResourceTier.FOUNDATION;
  const cluster = INSIGHT_TOPIC_CLUSTERS.find((item) => item.slug === seed.clusterSlug);

  if (!cluster) {
    return null;
  }

  return {
    slug: seed.slug,
    sourceResourceSlug: seed.sourceResourceSlug,
    clusterSlug: cluster.slug,
    clusterTitle: cluster.title,
    clusterHref: buildClusterHref(cluster.slug),
    isPillar: seed.isPillar ?? false,
    title: seed.title,
    sourceTitle: source?.title ?? seed.title,
    keyword: seed.keyword,
    summary: seed.summary,
    metaTitle: seed.metaTitle,
    metaDescription: seed.metaDescription,
    publishedAt: parsePublishedDate(seed.publishedAt),
    readMinutes: seed.readMinutes,
    category: source?.category ?? "Business Insight",
    typeLabel: source ? getResourceTypeLabel(source.type) : "Insight",
    tierLabel: getResourceTierLabel(tier),
    sourceExcerpt: source?.excerpt ?? seed.summary,
    recommendedMembershipHref: buildMembershipHref(tier, seed.slug),
    lockedPreviewSections: buildLockedPreviewSections(source?.content),
    introduction: seed.introduction,
    problemTitle: seed.problemTitle,
    problem: seed.problem,
    keyInsightTitle: seed.keyInsightTitle,
    keyInsight: seed.keyInsight,
    breakdownTitle: seed.breakdownTitle,
    breakdownItems: seed.breakdownItems,
    lockedTitle: seed.lockedTitle,
    lockedDescription: seed.lockedDescription,
    lockedBullets: seed.lockedBullets,
    relatedSlugs: seed.relatedSlugs
  };
}

const publicInsights = PUBLIC_INSIGHT_ARTICLES.map((item) => buildInsightArticle(item.slug))
  .filter((item): item is PublicInsightArticle => Boolean(item))
  .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());

function scoreRelatedInsight(current: PublicInsightArticle, candidate: PublicInsightArticle) {
  let score = 0;

  if (current.clusterSlug === candidate.clusterSlug) {
    score += 4;
  }

  if (current.category === candidate.category) {
    score += 3;
  }

  if (current.typeLabel === candidate.typeLabel) {
    score += 2;
  }

  if (current.tierLabel === candidate.tierLabel) {
    score += 1;
  }

  return score;
}

export function listPublicInsights(): PublicInsightSummary[] {
  return publicInsights;
}

export function listPublicInsightSlugs() {
  return publicInsights.map((insight) => insight.slug);
}

export function listInsightTopicClusters(): InsightTopicClusterSummary[] {
  return INSIGHT_TOPIC_CLUSTERS.map((cluster) => {
    const clusterInsights = publicInsights.filter((insight) => insight.clusterSlug === cluster.slug);
    const pillarInsight =
      clusterInsights.find((insight) => insight.isPillar) ?? clusterInsights[0] ?? null;
    const supportingInsights = clusterInsights.filter(
      (insight) => insight.slug !== pillarInsight?.slug
    );

    return {
      ...cluster,
      href: buildClusterHref(cluster.slug),
      articleCount: clusterInsights.length,
      pillarInsight,
      supportingInsights
    };
  }).filter((cluster) => cluster.articleCount > 0);
}

export function listInsightTopicClusterSlugs() {
  return listInsightTopicClusters().map((cluster) => cluster.slug);
}

export function getInsightTopicClusterBySlug(clusterSlug: string) {
  return listInsightTopicClusters().find((cluster) => cluster.slug === clusterSlug) ?? null;
}

export function getPublicInsightBySlug(slug: string) {
  return publicInsights.find((insight) => insight.slug === slug) ?? null;
}

export function getRelatedPublicInsights(
  currentSlug: string,
  take = 3
): PublicInsightSummary[] {
  const current = getPublicInsightBySlug(currentSlug);

  if (!current) {
    return [];
  }

  const seededMatches = current.relatedSlugs
    .map((slug) => getPublicInsightBySlug(slug))
    .filter((item): item is PublicInsightArticle => Boolean(item))
    .filter((item) => item.slug !== current.slug);
  const seededMatchSlugs = new Set(seededMatches.map((item) => item.slug));

  const scoredMatches = publicInsights
    .filter((item) => item.slug !== current.slug && !seededMatchSlugs.has(item.slug))
    .map((item) => ({
      item,
      score: scoreRelatedInsight(current, item)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.item.publishedAt.getTime() - left.item.publishedAt.getTime();
    })
    .map((entry) => entry.item);

  return [...seededMatches, ...scoredMatches].slice(0, take);
}

export function formatInsightDate(value: Date) {
  return insightDateFormatter.format(value);
}
