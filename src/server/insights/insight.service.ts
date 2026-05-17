import type { ResourceTier } from "@prisma/client";
import { PUBLIC_INSIGHTS, type PublicInsight } from "@/content/insights/public-insights";
import { getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import { slugify } from "@/lib/utils";
import type {
  InsightTopicClusterSummary,
  PublicInsightArticle,
  PublicInsightSummary
} from "@/types/insights";

const insightDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const todayPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function getUkDateKey(date = new Date()) {
  const parts = todayPartsFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

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

function getCategoryKeyword(category: string) {
  return category.toLowerCase().replace(/\s+/g, " ");
}

function getClusterTitle(category: string) {
  return category;
}

function isPublished(insight: Pick<PublicInsight, "publishedAt">, now = new Date()) {
  return insight.publishedAt <= getUkDateKey(now);
}

function toInsightSummary(insight: PublicInsight): PublicInsightArticle {
  return {
    slug: insight.slug,
    memberResourceSlug: insight.memberResourceSlug,
    clusterSlug: insight.clusterSlug,
    clusterTitle: getClusterTitle(insight.category),
    clusterHref: buildClusterHref(insight.clusterSlug),
    isPillar: false,
    title: insight.title,
    excerpt: insight.excerpt,
    keyword: insight.relatedIntentKeywords[0] ?? getCategoryKeyword(insight.category),
    seoTitle: insight.seoTitle,
    seoDescription: insight.seoDescription,
    publishedAt: parsePublishedDate(insight.publishedAt),
    publishedAtDate: insight.publishedAt,
    readingTime: insight.readingTime,
    category: insight.category,
    typeLabel: getResourceTypeLabel(insight.resourceType),
    tierLabel: getResourceTierLabel(insight.minimumTier),
    memberDepthLabel: insight.memberDepthLabel,
    recommendedMembershipHref: buildMembershipHref(insight.minimumTier, insight.slug),
    lockedPreviewSections: [
      "Full member breakdown",
      "Practical action layer",
      "Founder reflection layer",
      "Member implementation guidance"
    ],
    relatedIntentKeywords: insight.relatedIntentKeywords,
    aeoSummary: insight.aeoSummary,
    publicIntro: insight.publicIntro,
    publicPreviewSections: insight.publicPreviewSections,
    publicTakeaways: insight.publicTakeaways,
    fadeCtaTitle: insight.fadeCtaTitle,
    fadeCtaText: insight.fadeCtaText,
    ctaLabel: insight.ctaLabel,
    ctaHref: insight.ctaHref,
    internalLinks: insight.internalLinks,
    relatedInsightSlugs: insight.relatedInsightSlugs
  };
}

function getPublishedInsightArticles(now = new Date()) {
  return PUBLIC_INSIGHTS.filter((insight) => isPublished(insight, now))
    .map(toInsightSummary)
    .sort((left, right) => {
      const timeDifference = right.publishedAt.getTime() - left.publishedAt.getTime();

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return left.title.localeCompare(right.title);
    });
}

function scoreRelatedInsight(current: PublicInsightArticle, candidate: PublicInsightArticle) {
  let score = 0;

  if (current.clusterSlug === candidate.clusterSlug) {
    score += 5;
  }

  if (current.category === candidate.category) {
    score += 4;
  }

  if (current.typeLabel === candidate.typeLabel) {
    score += 2;
  }

  if (current.tierLabel === candidate.tierLabel) {
    score += 1;
  }

  return score;
}

export function isPublicInsightPublishedDate(publishedAt: string, now = new Date()) {
  return publishedAt <= getUkDateKey(now);
}

export function listPublicInsights(now = new Date()): PublicInsightSummary[] {
  return getPublishedInsightArticles(now);
}

export function listPublicInsightSlugs(now = new Date()) {
  return listPublicInsights(now).map((insight) => insight.slug);
}

export function listInsightTopicClusters(now = new Date()): InsightTopicClusterSummary[] {
  const insights = getPublishedInsightArticles(now);
  const grouped = new Map<string, PublicInsightArticle[]>();

  for (const insight of insights) {
    const existing = grouped.get(insight.clusterSlug) ?? [];
    existing.push(insight);
    grouped.set(insight.clusterSlug, existing);
  }

  return Array.from(grouped.entries())
    .map(([clusterSlug, clusterInsights]) => {
      const firstInsight = clusterInsights[0];
      const title = firstInsight?.category ?? clusterSlug;
      const keyword = firstInsight?.relatedIntentKeywords[0] ?? title.toLowerCase();
      const sortedInsights = [...clusterInsights].sort(
        (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime()
      );
      const pillarInsight = sortedInsights[0] ?? null;

      return {
        slug: clusterSlug,
        title,
        description: `${title} insights from The Business Circle Network, written for serious owners who want clearer thinking before deeper member action.`,
        supportLine:
          "The public topic layer gives the signal. The private resource layer carries the frameworks, questions and implementation depth.",
        keyword,
        href: buildClusterHref(clusterSlug),
        articleCount: sortedInsights.length,
        pillarInsight,
        supportingInsights: sortedInsights.filter((insight) => insight.slug !== pillarInsight?.slug)
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function listInsightTopicClusterSlugs(now = new Date()) {
  return listInsightTopicClusters(now).map((cluster) => cluster.slug);
}

export function getInsightTopicClusterBySlug(clusterSlug: string, now = new Date()) {
  return listInsightTopicClusters(now).find((cluster) => cluster.slug === clusterSlug) ?? null;
}

export function getPublicInsightBySlug(slug: string, now = new Date()) {
  return getPublishedInsightArticles(now).find((insight) => insight.slug === slug) ?? null;
}

export function getRelatedPublicInsights(
  currentSlug: string,
  take = 3,
  now = new Date()
): PublicInsightSummary[] {
  const insights = getPublishedInsightArticles(now);
  const current = insights.find((insight) => insight.slug === currentSlug);

  if (!current) {
    return [];
  }

  const seededMatches = current.relatedInsightSlugs
    .map((slug) => insights.find((insight) => insight.slug === slug))
    .filter((item): item is PublicInsightArticle => Boolean(item))
    .filter((item) => item.slug !== current.slug);
  const seededMatchSlugs = new Set(seededMatches.map((item) => item.slug));

  const scoredMatches = insights
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

export function getInsightTopicSlug(category: string) {
  return slugify(category);
}

export function formatInsightDate(value: Date) {
  return insightDateFormatter.format(value);
}
