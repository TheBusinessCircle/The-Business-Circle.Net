import {
  ResourceApprovalStatus,
  ResourceImageStatus,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import {
  RESOURCE_CATEGORIES_BY_TIER,
  RESOURCE_TIER_ORDER,
  RESOURCE_TYPE_OPTIONS,
  getResourceTierLabel,
  getResourceTypeLabel
} from "@/config/resources";
import { countWords, getLocalCalendarDate } from "@/lib/resources";
import { slugify } from "@/lib/utils";

export const DAILY_RESOURCE_TIERS = RESOURCE_TIER_ORDER;
export const DAILY_RESOURCE_TYPES = RESOURCE_TYPE_OPTIONS.map((option) => option.value);

export type RecentResourceForGeneration = {
  title: string;
  slug: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  excerpt?: string | null;
  content?: string | null;
  generationDate?: Date | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
};

export type DailyResourcePlanItem = {
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  angle: string;
  focus: string;
  fallbackUsed: boolean;
  recentCategoryCount: number;
  recentTypeCountForTier: number;
};

export type DailyResourcePlan = {
  generationDate: Date;
  dateKey: string;
  items: DailyResourcePlanItem[];
  metadata: {
    historyWindowDays: number;
    fallbackUsed: boolean;
    categoryCounts: Record<string, number>;
    typeCountsByTier: Record<ResourceTier, Record<ResourceType, number>>;
  };
};

export type GeneratedResourceCandidate = {
  title: string;
  slug: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  excerpt: string;
  content: string;
  imageDirection: string;
  imagePrompt: string;
  estimatedReadMinutes: number;
};

export class ResourceGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ResourceGenerationError";
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3);
}

export function titleSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizeWords(left));
  const rightWords = new Set(normalizeWords(right));

  if (!leftWords.size || !rightWords.size) {
    return 0;
  }

  let overlap = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftWords.size, rightWords.size);
}

export function toGenerationDate(value = new Date()) {
  const local = getLocalCalendarDate(value);
  return new Date(Date.UTC(local.year, local.month - 1, local.day));
}

export function formatGenerationDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function countByCategory(history: RecentResourceForGeneration[]) {
  return history.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] ?? 0) + 1;
    return accumulator;
  }, {});
}

function countTypesByTier(history: RecentResourceForGeneration[]) {
  const initial = DAILY_RESOURCE_TIERS.reduce(
    (accumulator, tier) => ({
      ...accumulator,
      [tier]: DAILY_RESOURCE_TYPES.reduce(
        (inner, type) => ({
          ...inner,
          [type]: 0
        }),
        {} as Record<ResourceType, number>
      )
    }),
    {} as Record<ResourceTier, Record<ResourceType, number>>
  );

  history.forEach((item) => {
    initial[item.tier][item.type] = (initial[item.tier][item.type] ?? 0) + 1;
  });

  return initial;
}

function sortWithRotation<T>(items: T[], seed: string) {
  const rotation = items.length ? hashString(seed) % items.length : 0;
  return [...items.slice(rotation), ...items.slice(0, rotation)];
}

function selectCategory(input: {
  tier: ResourceTier;
  usedCategories: Set<string>;
  historyCounts: Record<string, number>;
  seed: string;
}) {
  const candidates = sortWithRotation(
    RESOURCE_CATEGORIES_BY_TIER[input.tier],
    `${input.seed}-${input.tier}-category`
  );

  const ranked = candidates
    .map((category, index) => ({
      category,
      score:
        (input.usedCategories.has(category) ? 10_000 : 0) +
        (input.historyCounts[category] ?? 0) * 10 +
        index
    }))
    .sort((left, right) => left.score - right.score);

  const winner = ranked[0];
  if (!winner) {
    throw new ResourceGenerationError(
      `No category pool is configured for ${getResourceTierLabel(input.tier)}.`,
      "category-pool-empty",
      { tier: input.tier }
    );
  }

  return {
    value: winner.category,
    fallbackUsed: input.usedCategories.has(winner.category),
    recentCategoryCount: input.historyCounts[winner.category] ?? 0
  };
}

function selectType(input: {
  tier: ResourceTier;
  usedTypes: Set<ResourceType>;
  historyCounts: Record<ResourceTier, Record<ResourceType, number>>;
  seed: string;
}) {
  const candidates = sortWithRotation(
    DAILY_RESOURCE_TYPES,
    `${input.seed}-${input.tier}-type`
  );

  const ranked = candidates
    .map((type, index) => ({
      type,
      score:
        (input.usedTypes.has(type) ? 10_000 : 0) +
        (input.historyCounts[input.tier]?.[type] ?? 0) * 12 +
        index
    }))
    .sort((left, right) => left.score - right.score);

  const winner = ranked[0];
  if (!winner) {
    throw new ResourceGenerationError(
      `No resource type pool is configured for ${getResourceTierLabel(input.tier)}.`,
      "type-pool-empty",
      { tier: input.tier }
    );
  }

  return {
    value: winner.type,
    fallbackUsed: input.usedTypes.has(winner.type),
    recentTypeCountForTier: input.historyCounts[input.tier]?.[winner.type] ?? 0
  };
}

function buildAngle(input: {
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  dateKey: string;
}) {
  const tierLabel = getResourceTierLabel(input.tier);
  const typeLabel = getResourceTypeLabel(input.type).toLowerCase();
  const category = input.category.toLowerCase();

  if (input.tier === "CORE") {
    return `${tierLabel} ${typeLabel} resource on the commercial judgement behind ${category}, with founder-level trade-offs and strategic consequence.`;
  }

  if (input.tier === "INNER") {
    return `${tierLabel} ${typeLabel} resource on improving the structure behind ${category}, with sharper diagnosis and better operating decisions.`;
  }

  return `${tierLabel} ${typeLabel} resource on making ${category} clearer and more usable without beginner fluff.`;
}

export function buildDailyResourcePlan(
  history: RecentResourceForGeneration[],
  generationDate = toGenerationDate()
): DailyResourcePlan {
  const dateKey = formatGenerationDateKey(generationDate);
  const categoryCounts = countByCategory(history);
  const typeCountsByTier = countTypesByTier(history);
  const usedCategories = new Set<string>();
  const usedTypes = new Set<ResourceType>();

  const items = DAILY_RESOURCE_TIERS.map((tier) => {
    const category = selectCategory({
      tier,
      usedCategories,
      historyCounts: categoryCounts,
      seed: dateKey
    });
    usedCategories.add(category.value);

    const type = selectType({
      tier,
      usedTypes,
      historyCounts: typeCountsByTier,
      seed: dateKey
    });
    usedTypes.add(type.value);

    return {
      tier,
      category: category.value,
      type: type.value,
      angle: buildAngle({
        tier,
        category: category.value,
        type: type.value,
        dateKey
      }),
      focus: `${category.value} for ${getResourceTierLabel(tier)} members`,
      fallbackUsed: category.fallbackUsed || type.fallbackUsed,
      recentCategoryCount: category.recentCategoryCount,
      recentTypeCountForTier: type.recentTypeCountForTier
    };
  });

  return {
    generationDate,
    dateKey,
    items,
    metadata: {
      historyWindowDays: 14,
      fallbackUsed: items.some((item) => item.fallbackUsed),
      categoryCounts,
      typeCountsByTier
    }
  };
}

export function validateGeneratedDailySet(
  candidates: GeneratedResourceCandidate[],
  history: RecentResourceForGeneration[] = []
) {
  if (candidates.length !== 3) {
    throw new ResourceGenerationError(
      "Daily generation must create exactly three resources.",
      "daily-set-size-invalid",
      { count: candidates.length }
    );
  }

  const tierSet = new Set(candidates.map((item) => item.tier));
  const categorySet = new Set(candidates.map((item) => item.category));
  const typeSet = new Set(candidates.map((item) => item.type));
  const titleSet = new Set(candidates.map((item) => item.title.trim().toLowerCase()));
  const slugSet = new Set(candidates.map((item) => item.slug.trim().toLowerCase()));

  if (!DAILY_RESOURCE_TIERS.every((tier) => tierSet.has(tier))) {
    throw new ResourceGenerationError(
      "Daily generation must include Foundation, Inner Circle, and Core.",
      "daily-set-tiers-invalid"
    );
  }

  if (categorySet.size !== candidates.length) {
    throw new ResourceGenerationError(
      "Daily generation cannot repeat categories in the same set.",
      "daily-set-category-duplicate"
    );
  }

  if (typeSet.size !== candidates.length) {
    throw new ResourceGenerationError(
      "Daily generation cannot repeat resource types in the same set.",
      "daily-set-type-duplicate"
    );
  }

  if (titleSet.size !== candidates.length || slugSet.size !== candidates.length) {
    throw new ResourceGenerationError(
      "Daily generation produced duplicate titles or slugs.",
      "daily-set-title-duplicate"
    );
  }

  candidates.forEach((candidate) => {
    validateGeneratedResourceCandidate(candidate, history);
  });
}

export function validateGeneratedResourceCandidate(
  candidate: GeneratedResourceCandidate,
  history: RecentResourceForGeneration[] = []
) {
  if (!candidate.title.trim() || candidate.title.trim().length < 8) {
    throw new ResourceGenerationError("Generated title is missing.", "title-missing");
  }

  if (!slugify(candidate.slug || candidate.title)) {
    throw new ResourceGenerationError("Generated slug is invalid.", "slug-invalid");
  }

  if (!candidate.excerpt.trim() || candidate.excerpt.trim().length < 24) {
    throw new ResourceGenerationError("Generated excerpt is missing.", "excerpt-missing");
  }

  const wordCount = countWords(candidate.content);
  if (wordCount < 450) {
    throw new ResourceGenerationError(
      "Generated content is too short for approval.",
      "content-too-short",
      { wordCount }
    );
  }

  ["## Reality", "## Breakdown", "## Shift", "## Next step"].forEach((heading) => {
    if (!candidate.content.includes(heading)) {
      throw new ResourceGenerationError(
        `Generated content is missing ${heading}.`,
        "content-structure-invalid",
        { heading }
      );
    }
  });

  if (!candidate.imagePrompt.trim() || candidate.imagePrompt.length < 80) {
    throw new ResourceGenerationError(
      "Generated image prompt is missing or too thin.",
      "image-prompt-missing"
    );
  }

  const similar = history.find(
    (item) => titleSimilarity(item.title, candidate.title) >= 0.72
  );

  if (similar) {
    throw new ResourceGenerationError(
      "Generated title is too similar to a recent resource.",
      "title-too-similar",
      { title: candidate.title, recentTitle: similar.title }
    );
  }
}

export function validateResourceForApproval(resource: {
  title: string;
  excerpt: string;
  content: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  imagePrompt?: string | null;
  approvalStatus: ResourceApprovalStatus;
  imageStatus: ResourceImageStatus;
}) {
  validateGeneratedResourceCandidate(
    {
      title: resource.title,
      slug: slugify(resource.title),
      excerpt: resource.excerpt,
      content: resource.content,
      tier: resource.tier,
      category: resource.category,
      type: resource.type,
      imageDirection: "",
      imagePrompt: resource.imagePrompt || "Manual image prompt intentionally not required for this resource.",
      estimatedReadMinutes: Math.max(3, Math.ceil(countWords(resource.content) / 220))
    },
    []
  );
}
