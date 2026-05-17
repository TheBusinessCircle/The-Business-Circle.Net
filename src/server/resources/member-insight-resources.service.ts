import type {
  MembershipTier,
  ResourceMediaType,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import { MEMBER_INSIGHT_RESOURCES, type MemberInsightResource } from "@/content/insights/member-resources";
import { RESOURCE_TIER_ORDER, RESOURCE_TYPE_OPTIONS } from "@/config/resources";
import { getAccessibleResourceTiers } from "@/server/resources/resource-policy";
import type { ResourceLibraryView } from "@/server/resources/resource-read.service";

export type MemberInsightResourceCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  coverImage: string | null;
  generatedImageUrl: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
  estimatedReadMinutes: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  isRead: boolean;
  isMemberInsightResource: true;
};

export type MemberInsightResourceDetail = MemberInsightResourceCardItem & {
  content: string;
  createdAt: Date;
  linkedPublicInsightSlug: string;
};

type MemberInsightFilters = {
  query?: string;
  tier?: ResourceTier | string | "";
  category?: string;
  type?: ResourceType | string | "";
  view?: ResourceLibraryView;
};

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

function isPublished(resource: MemberInsightResource, now = new Date()) {
  return resource.publishedAt <= getUkDateKey(now);
}

function normalizeTier(value: string | undefined): ResourceTier | undefined {
  if (!value) {
    return undefined;
  }

  const upper = value.toUpperCase();
  return RESOURCE_TIER_ORDER.find((tier) => tier === upper) ?? undefined;
}

function normalizeType(value: string | undefined): ResourceType | undefined {
  if (!value) {
    return undefined;
  }

  const upper = value.toUpperCase();
  return RESOURCE_TYPE_OPTIONS.find((option) => option.value === upper)?.value;
}

function renderList(items: string[], ordered = false) {
  return items
    .map((item, index) => (ordered ? `${index + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

function buildMemberInsightMarkdown(resource: MemberInsightResource) {
  const bodySections = resource.fullBodySections
    .map((section) => `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}`)
    .join("\n\n");

  return [
    resource.resourceSummary,
    bodySections,
    `## Practical action steps\n\n${renderList(resource.actionSteps, true)}`,
    `## Founder reflection questions\n\n${renderList(resource.founderQuestions)}`,
    `## Implementation checklist\n\n${renderList(resource.implementationChecklist)}`,
    `## Practical application\n\n${resource.practicalApplication}`,
    `## Related member resources\n\n${renderList(
      resource.relatedResources.length
        ? resource.relatedResources.map((slug) => `[${slug.replace(/^insight-resource-/, "")}](/dashboard/resources/${slug})`)
        : ["Related member resources will appear here as connected insights publish."]
    )}`,
    `## Suggested room or discussion\n\n${resource.suggestedRoomOrDiscussionPrompt}\n\n[${resource.ctaLabel}](${resource.ctaHref})`
  ].join("\n\n");
}

function toCardItem(resource: MemberInsightResource): MemberInsightResourceCardItem {
  const publishedAt = parsePublishedDate(resource.publishedAt);

  return {
    id: `member-insight:${resource.resourceSlug}`,
    slug: resource.resourceSlug,
    title: resource.resourceTitle,
    excerpt: resource.resourceSummary,
    tier: resource.minimumTier,
    category: resource.resourceCategory,
    type: resource.resourceType,
    coverImage: null,
    generatedImageUrl: null,
    mediaType: "NONE" as ResourceMediaType,
    mediaUrl: null,
    estimatedReadMinutes: resource.readingTime,
    publishedAt,
    updatedAt: publishedAt,
    isRead: false,
    isMemberInsightResource: true
  };
}

function toDetail(resource: MemberInsightResource): MemberInsightResourceDetail {
  const card = toCardItem(resource);

  return {
    ...card,
    content: buildMemberInsightMarkdown(resource),
    createdAt: card.publishedAt ?? new Date(0),
    linkedPublicInsightSlug: resource.linkedPublicInsightSlug
  };
}

function matchesFilters(resource: MemberInsightResource, filters: MemberInsightFilters) {
  if (filters.view === "read") {
    return false;
  }

  const tier = normalizeTier(typeof filters.tier === "string" ? filters.tier : filters.tier);
  const type = normalizeType(typeof filters.type === "string" ? filters.type : filters.type);
  const query = filters.query?.trim().toLowerCase();

  if (tier && resource.minimumTier !== tier) {
    return false;
  }

  if (type && resource.resourceType !== type) {
    return false;
  }

  if (filters.category && resource.resourceCategory !== filters.category) {
    return false;
  }

  if (!query) {
    return true;
  }

  const haystack = [
    resource.resourceTitle,
    resource.resourceSummary,
    resource.resourceCategory,
    resource.fullBodySections.map((section) => section.paragraphs.join(" ")).join(" "),
    resource.actionSteps.join(" "),
    resource.founderQuestions.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function listPublishedMemberInsightResourceCards(
  membershipTier: MembershipTier,
  filters: MemberInsightFilters = {},
  now = new Date()
): MemberInsightResourceCardItem[] {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);

  return MEMBER_INSIGHT_RESOURCES.filter((resource) => isPublished(resource, now))
    .filter((resource) => visibleTiers.includes(resource.minimumTier))
    .filter((resource) => matchesFilters(resource, filters))
    .map(toCardItem)
    .sort((left, right) => {
      const rightTime = right.publishedAt?.getTime() ?? right.updatedAt.getTime();
      const leftTime = left.publishedAt?.getTime() ?? left.updatedAt.getTime();

      return rightTime - leftTime;
    });
}

export function getPublishedMemberInsightResourceBySlug(
  slug: string,
  membershipTier: MembershipTier,
  now = new Date()
): MemberInsightResourceDetail | null {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);
  const resource = MEMBER_INSIGHT_RESOURCES.find((item) => item.resourceSlug === slug);

  if (!resource || !isPublished(resource, now) || !visibleTiers.includes(resource.minimumTier)) {
    return null;
  }

  return toDetail(resource);
}

export function getRelatedMemberInsightResourceCards(
  resource: { slug: string; tier: ResourceTier; category: string; type: ResourceType },
  membershipTier: MembershipTier,
  take = 3,
  now = new Date()
) {
  return listPublishedMemberInsightResourceCards(membershipTier, {}, now)
    .filter((item) => item.slug !== resource.slug)
    .filter(
      (item) =>
        item.category === resource.category || item.type === resource.type || item.tier === resource.tier
    )
    .map((item) => ({
      ...item,
      score:
        (item.category === resource.category ? 3 : 0) +
        (item.type === resource.type ? 2 : 0) +
        (item.tier === resource.tier ? 1 : 0)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightTime = right.publishedAt?.getTime() ?? right.updatedAt.getTime();
      const leftTime = left.publishedAt?.getTime() ?? left.updatedAt.getTime();

      return rightTime - leftTime;
    })
    .slice(0, take);
}

export function isMemberInsightResourceId(id: string) {
  return id.startsWith("member-insight:");
}
