import {
  DailyResourceBatchStatus,
  Prisma,
  ResourceApprovalStatus,
  ResourceGenerationSource,
  ResourceImageStatus,
  ResourceStatus,
  ResourceTier
} from "@prisma/client";
import { RESOURCE_CONTENT_MODEL, getResourceTierLabel } from "@/config/resources";
import { db } from "@/lib/db";
import { countWords } from "@/lib/resources";
import { membershipTierForResourceTier } from "@/lib/db/access";
import { slugify } from "@/lib/utils";
import { buildResourceContentPrompt } from "@/server/resources/resource-content-prompt-builder";
import {
  generateResourceContentFromProvider,
  isResourceContentProviderConfigured
} from "@/server/resources/resource-ai-provider.service";
import { generateCoverImageForResource } from "@/server/resources/resource-image-generation.service";
import {
  buildResourceImageDirection,
  buildResourceImagePrompt
} from "@/server/resources/resource-image-prompt-builder";
import {
  DAILY_RESOURCE_TIERS,
  ResourceGenerationError,
  buildDailyResourcePlan,
  formatGenerationDateKey,
  toGenerationDate,
  validateGeneratedDailySet,
  validateGeneratedResourceCandidate,
  type DailyResourcePlan,
  type DailyResourcePlanItem,
  type GeneratedResourceCandidate,
  type RecentResourceForGeneration
} from "@/server/resources/resource-generation-guards";

type GenerateDailyResourceBatchInput = {
  generationDate?: Date;
  generatedById?: string | null;
  force?: boolean;
  dryRun?: boolean;
  generateImages?: boolean;
};

type RegenerateResourceArticleInput = {
  resourceId: string;
  adminUserId: string;
};

const RECENT_HISTORY_DAYS = 14;

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function tierSortValue(tier: ResourceTier) {
  return DAILY_RESOURCE_TIERS.indexOf(tier);
}

async function getRecentResourceHistory(
  generationDate: Date,
  excludeResourceId?: string
): Promise<RecentResourceForGeneration[]> {
  const since = new Date(generationDate.getTime() - RECENT_HISTORY_DAYS * 24 * 60 * 60 * 1000);

  try {
    return await db.resource.findMany({
      where: {
        id: excludeResourceId ? { not: excludeResourceId } : undefined,
        OR: [
          {
            generationDate: {
              gte: since
            }
          },
          {
            publishedAt: {
              gte: since
            }
          },
          {
            createdAt: {
              gte: since
            }
          }
        ]
      },
      orderBy: [{ generationDate: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        title: true,
        slug: true,
        tier: true,
        category: true,
        type: true,
        excerpt: true,
        content: true,
        generationDate: true,
        publishedAt: true,
        createdAt: true
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2022") {
      throw error;
    }

    console.warn("[resources] generation metadata columns are not migrated yet; using legacy history query for planning only.");

    const legacyHistory = await db.resource.findMany({
      where: {
        id: excludeResourceId ? { not: excludeResourceId } : undefined,
        OR: [
          {
            publishedAt: {
              gte: since
            }
          },
          {
            createdAt: {
              gte: since
            }
          }
        ]
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        title: true,
        slug: true,
        tier: true,
        category: true,
        type: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        createdAt: true
      }
    });

    return legacyHistory.map((item) => ({
      ...item,
      generationDate: null
    }));
  }
}

async function ensureUniqueSlug(baseValue: string, reserved: Set<string>) {
  const base = slugify(baseValue).slice(0, 190) || `resource-${Date.now()}`;
  let candidate = base;
  let attempt = 1;

  while (attempt <= 40) {
    if (!reserved.has(candidate)) {
      const existing = await db.resource.findUnique({
        where: { slug: candidate },
        select: { id: true }
      });

      if (!existing) {
        reserved.add(candidate);
        return candidate;
      }
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  throw new ResourceGenerationError("Unable to create a unique slug.", "slug-unique-failed");
}

function coerceEstimatedReadMinutes(value: unknown, content: string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(3, Math.round(value));
  }

  return Math.max(3, Math.ceil(countWords(content) / 220));
}

function coerceProviderCandidate(input: {
  providerResult: Awaited<ReturnType<typeof generateResourceContentFromProvider>>;
  planItem: DailyResourcePlanItem;
  slug: string;
}) {
  const imageDirection =
    input.providerResult.imageDirection?.trim() ||
    buildResourceImageDirection({
      title: input.providerResult.title,
      excerpt: input.providerResult.excerpt,
      tier: input.planItem.tier,
      category: input.planItem.category,
      type: input.planItem.type
    });
  const imagePrompt =
    input.providerResult.imagePrompt?.trim() ||
    buildResourceImagePrompt({
      title: input.providerResult.title,
      excerpt: input.providerResult.excerpt,
      tier: input.planItem.tier,
      category: input.planItem.category,
      type: input.planItem.type,
      imageDirection
    });

  return {
    title: input.providerResult.title.trim(),
    slug: input.slug,
    tier: input.planItem.tier,
    category: input.planItem.category,
    type: input.planItem.type,
    excerpt: input.providerResult.excerpt.trim(),
    content: input.providerResult.content.trim(),
    imageDirection,
    imagePrompt,
    estimatedReadMinutes: coerceEstimatedReadMinutes(
      input.providerResult.estimatedReadTime,
      input.providerResult.content
    )
  } satisfies GeneratedResourceCandidate;
}

async function generateCandidateForPlanItem(input: {
  plan: DailyResourcePlan;
  planItem: DailyResourcePlanItem;
  history: RecentResourceForGeneration[];
  generatedCandidates: GeneratedResourceCandidate[];
  reservedSlugs: Set<string>;
}) {
  const sameDayExclusions = input.plan.items
    .filter((item) => item.tier !== input.planItem.tier)
    .map((item) => ({
      tier: item.tier,
      category: item.category,
      type: item.type,
      angle: item.angle
    }));
  const prompt = buildResourceContentPrompt({
    planItem: input.planItem,
    generationDateKey: input.plan.dateKey,
    sameDayExclusions,
    recentHistory: [
      ...input.generatedCandidates.map((candidate) => ({
        title: candidate.title,
        slug: candidate.slug,
        tier: candidate.tier,
        category: candidate.category,
        type: candidate.type,
        excerpt: candidate.excerpt,
        content: candidate.content,
        generationDate: input.plan.generationDate,
        publishedAt: null,
        createdAt: null
      })),
      ...input.history
    ]
  });
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const providerResult = await generateResourceContentFromProvider(prompt);
      const slug = await ensureUniqueSlug(
        `${providerResult.title}-${input.plan.dateKey}-${input.planItem.tier.toLowerCase()}`,
        input.reservedSlugs
      );
      const candidate = coerceProviderCandidate({
        providerResult,
        planItem: input.planItem,
        slug
      });

      validateGeneratedResourceCandidate(candidate, [
        ...input.history,
        ...input.generatedCandidates
      ]);
      return candidate;
    } catch (error) {
      lastError = error;
      console.warn("[resources] generated candidate failed validation", {
        tier: input.planItem.tier,
        category: input.planItem.category,
        type: input.planItem.type,
        attempt,
        code: error instanceof ResourceGenerationError ? error.code : "unknown"
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ResourceGenerationError(
        "Resource generation failed validation.",
        "content-generation-validation-failed"
      );
}

async function prepareExistingDailyBatchForGeneration(input: {
  generationDate: Date;
  force?: boolean;
}) {
  const existing = await db.dailyResourceBatch.findUnique({
    where: { generationDate: input.generationDate },
    select: {
      id: true,
      resources: {
        select: {
          id: true,
          status: true,
          lockedAt: true
        }
      }
    }
  });

  if (!existing) {
    return;
  }

  if (!input.force) {
    throw new ResourceGenerationError(
      "Daily set already exists for this date.",
      "daily-batch-already-exists",
      { batchId: existing.id }
    );
  }

  const protectedResources = existing.resources.filter(
    (resource) =>
      resource.lockedAt ||
      resource.status === ResourceStatus.SCHEDULED ||
      resource.status === ResourceStatus.PUBLISHED
  );

  if (protectedResources.length) {
    throw new ResourceGenerationError(
      "Daily set cannot be force regenerated because one or more resources are locked, scheduled, or published.",
      "daily-batch-protected",
      { resourceIds: protectedResources.map((resource) => resource.id) }
    );
  }

  await db.$transaction([
    db.resource.deleteMany({
      where: {
        generationBatchId: existing.id
      }
    }),
    db.dailyResourceBatch.delete({
      where: {
        id: existing.id
      }
    })
  ]);
}

export async function generateDailyResourceBatch(input: GenerateDailyResourceBatchInput = {}) {
  const generationDate = toGenerationDate(input.generationDate);
  const history = await getRecentResourceHistory(generationDate);
  const plan = buildDailyResourcePlan(history, generationDate);

  if (input.dryRun) {
    return {
      dryRun: true,
      plan,
      batch: null,
      resources: [],
      providerConfigured: isResourceContentProviderConfigured()
    };
  }

  if (!isResourceContentProviderConfigured()) {
    throw new ResourceGenerationError(
      "Generation provider not configured.",
      "generation-provider-not-configured"
    );
  }

  await prepareExistingDailyBatchForGeneration({
    generationDate,
    force: input.force
  });

  const reservedSlugs = new Set<string>();
  const candidates: GeneratedResourceCandidate[] = [];

  for (const planItem of plan.items) {
    const candidate = await generateCandidateForPlanItem({
      plan,
      planItem,
      history,
      generatedCandidates: candidates,
      reservedSlugs
    });

    candidates.push(candidate);
  }

  validateGeneratedDailySet(candidates, history);

  const batch = await db.$transaction(async (tx) => {
    const planMetadata = toJsonSafe(plan);
    const createdBatch = await tx.dailyResourceBatch.create({
      data: {
        generationDate,
        generatedById: input.generatedById ?? null,
        status: DailyResourceBatchStatus.PENDING_APPROVAL,
        metadata: {
          plan: planMetadata,
          contentModel: RESOURCE_CONTENT_MODEL,
          generatedBy: input.generatedById ?? "script",
          generatedAt: new Date().toISOString()
        }
      },
      select: {
        id: true,
        generationDate: true,
        status: true
      }
    });

    const createdResources = await Promise.all(
      candidates.map((candidate) =>
        tx.resource.create({
          data: {
            title: candidate.title,
            slug: candidate.slug,
            content: candidate.content,
            excerpt: candidate.excerpt,
            summary: candidate.excerpt,
            tier: candidate.tier,
            accessTier: membershipTierForResourceTier(candidate.tier),
            category: candidate.category,
            type: candidate.type,
            status: ResourceStatus.DRAFT,
            approvalStatus: ResourceApprovalStatus.PENDING_APPROVAL,
            generationSource: ResourceGenerationSource.DAILY_AI,
            generationBatchId: createdBatch.id,
            generationDate,
            imageDirection: candidate.imageDirection,
            imagePrompt: candidate.imagePrompt,
            imageStatus: ResourceImageStatus.PROMPT_READY,
            estimatedReadMinutes: candidate.estimatedReadMinutes,
            authorId: input.generatedById ?? undefined,
            generationMetadata: {
              planItem: toJsonSafe(
                plan.items.find((item) => item.tier === candidate.tier) ?? null
              ),
              contentModel: RESOURCE_CONTENT_MODEL,
              wordCount: countWords(candidate.content),
              generatedAt: new Date().toISOString()
            }
          },
          select: {
            id: true,
            title: true,
            slug: true,
            tier: true,
            category: true,
            type: true,
            imageStatus: true
          }
        })
      )
    );

    return {
      ...createdBatch,
      resources: createdResources.sort((left, right) => tierSortValue(left.tier) - tierSortValue(right.tier))
    };
  });

  if (input.generateImages ?? true) {
    for (const resource of batch.resources) {
      await generateCoverImageForResource(resource.id);
    }
  }

  return {
    dryRun: false,
    plan,
    batch,
    resources: batch.resources,
    providerConfigured: true
  };
}

export async function getDailyResourceBatchForDate(date = new Date()) {
  const generationDate = toGenerationDate(date);

  const batch = await db.dailyResourceBatch.findUnique({
    where: { generationDate },
    select: {
      id: true,
      generationDate: true,
      status: true,
      generatedAt: true,
      generatedById: true,
      approvedAt: true,
      scheduledAt: true,
      metadata: true,
      resources: {
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          tier: true,
          category: true,
          type: true,
          coverImage: true,
          mediaType: true,
          mediaUrl: true,
          generatedImageUrl: true,
          status: true,
          approvalStatus: true,
          imageStatus: true,
          scheduledFor: true,
          publishedAt: true,
          lockedAt: true,
          imagePrompt: true,
          imageDirection: true,
          estimatedReadMinutes: true
        }
      }
    }
  });

  if (!batch) {
    return null;
  }

  return {
    ...batch,
    resources: batch.resources.sort(
      (left, right) => tierSortValue(left.tier) - tierSortValue(right.tier)
    )
  };
}

export async function regenerateGeneratedResourceArticle(input: RegenerateResourceArticleInput) {
  const resource = await db.resource.findUnique({
    where: { id: input.resourceId },
    select: {
      id: true,
      slug: true,
      tier: true,
      category: true,
      type: true,
      generationDate: true,
      generationBatchId: true,
      lockedAt: true,
      generationMetadata: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  if (resource.lockedAt) {
    throw new ResourceGenerationError(
      "This resource is locked and cannot be regenerated.",
      "resource-locked"
    );
  }

  if (!isResourceContentProviderConfigured()) {
    throw new ResourceGenerationError(
      "Generation provider not configured.",
      "generation-provider-not-configured"
    );
  }

  const generationDate = resource.generationDate ?? toGenerationDate();
  const history = await getRecentResourceHistory(generationDate, resource.id);
  const planItem: DailyResourcePlanItem = {
    tier: resource.tier,
    category: resource.category,
    type: resource.type,
    angle:
      metadataRecord(resource.generationMetadata).planItem &&
      typeof metadataRecord(resource.generationMetadata).planItem === "object"
        ? String(
            (metadataRecord(resource.generationMetadata).planItem as Record<string, unknown>)
              .angle || ""
          )
        : `${getResourceTierLabel(resource.tier)} resource on ${resource.category}`,
    focus: `${resource.category} for ${getResourceTierLabel(resource.tier)} members`,
    fallbackUsed: false,
    recentCategoryCount: 0,
    recentTypeCountForTier: 0
  };
  const plan: DailyResourcePlan = {
    generationDate,
    dateKey: formatGenerationDateKey(generationDate),
    items: [planItem],
    metadata: {
      historyWindowDays: RECENT_HISTORY_DAYS,
      fallbackUsed: false,
      categoryCounts: {},
      typeCountsByTier: DAILY_RESOURCE_TIERS.reduce(
        (accumulator, tier) => ({
          ...accumulator,
          [tier]: {
            CLARITY: 0,
            STRATEGY: 0,
            OBSERVATION: 0,
            MINDSET: 0,
            ACTION: 0
          }
        }),
        {} as DailyResourcePlan["metadata"]["typeCountsByTier"]
      )
    }
  };
  const candidate = await generateCandidateForPlanItem({
    plan,
    planItem,
    history,
    generatedCandidates: [],
    reservedSlugs: new Set([resource.slug])
  });

  await db.resource.update({
    where: { id: resource.id },
    data: {
      title: candidate.title,
      excerpt: candidate.excerpt,
      summary: candidate.excerpt,
      content: candidate.content,
      imageDirection: candidate.imageDirection,
      imagePrompt: candidate.imagePrompt,
      imageStatus: ResourceImageStatus.PROMPT_READY,
      estimatedReadMinutes: candidate.estimatedReadMinutes,
      approvalStatus: ResourceApprovalStatus.PENDING_APPROVAL,
      approvedAt: null,
      approvedById: null,
      rejectedAt: null,
      rejectedById: null,
      generationMetadata: {
        ...metadataRecord(resource.generationMetadata),
        regeneratedAt: new Date().toISOString(),
        regeneratedById: input.adminUserId,
        contentModel: RESOURCE_CONTENT_MODEL,
        wordCount: countWords(candidate.content)
      }
    }
  });

  return { resourceId: resource.id };
}
