import {
  ResourceImageStatus,
  ResourceMediaType,
  ResourceStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  buildResourceImageDirection,
  buildResourceImagePrompt
} from "@/server/resources/resource-image-prompt-builder";
import { generateCoverImageForResource } from "@/server/resources/resource-image-generation.service";
import {
  getResourceAiProviderDiagnostics,
  isResourceImageProviderConfigured
} from "@/server/resources/resource-ai-provider.service";
import { getCloudinaryConfigDiagnostics } from "@/lib/media/cloudinary";

export type BackfillResourceImagesOptions = {
  dryRun?: boolean;
  limit?: number;
  publishedOnly?: boolean;
  forcePromptsOnly?: boolean;
};

export type BackfillResourceImagesResult = {
  totalChecked: number;
  missingImages: number;
  promptsCreated: number;
  imagesGenerated: number;
  failed: number;
  skippedManualImages: number;
  skippedExistingImages: number;
  skippedProviderUnavailable: number;
  skippedCloudinaryUnavailable: number;
  providerAvailable: boolean;
  cloudinaryAvailable: boolean;
  providerUnavailableReasons: string[];
  cloudinaryUnavailableReasons: string[];
  providerSkipReasons: Record<string, number>;
  cloudinarySkipReasons: Record<string, number>;
  failureReasons: Record<string, number>;
  dryRun: boolean;
  limit: number;
  publishedOnly: boolean;
  promptsOnly: boolean;
};

function normalizeLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 10;
  }

  return Math.max(1, Math.min(100, Math.floor(value)));
}

function hasManualOrExistingImage(resource: {
  coverImage: string | null;
  generatedImageUrl: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
}) {
  if (resource.coverImage) {
    return "manual" as const;
  }

  if (resource.generatedImageUrl) {
    return "generated" as const;
  }

  if (resource.mediaType === ResourceMediaType.IMAGE && resource.mediaUrl) {
    return "media" as const;
  }

  return null;
}

function addReason(target: Record<string, number>, reason: string | undefined, amount = 1) {
  const normalized = reason?.trim() || "unspecified reason";
  target[normalized] = (target[normalized] ?? 0) + amount;
}

function firstReason(reasons: string[], fallback: string) {
  return reasons[0] ?? fallback;
}

export async function backfillResourceImages(
  options: BackfillResourceImagesOptions = {}
): Promise<BackfillResourceImagesResult> {
  const limit = normalizeLimit(options.limit);
  const providerDiagnostics = getResourceAiProviderDiagnostics();
  const providerConfigured = isResourceImageProviderConfigured();
  const cloudinaryDiagnostics = getCloudinaryConfigDiagnostics();
  const cloudinaryConfigured = cloudinaryDiagnostics.configured;
  const baseWhere = {
    ...(options.publishedOnly ? { status: ResourceStatus.PUBLISHED } : {})
  };
  const missingImageWhere = {
    ...baseWhere,
    coverImage: null,
    generatedImageUrl: null,
    OR: [
      {
        mediaType: {
          not: ResourceMediaType.IMAGE
        }
      },
      {
        mediaUrl: null
      }
    ]
  };
  const [totalChecked, missingImages, skippedManualImages, skippedExistingImages, resources] =
    await Promise.all([
      db.resource.count({ where: baseWhere }),
      db.resource.count({ where: missingImageWhere }),
      db.resource.count({
        where: {
          ...baseWhere,
          coverImage: {
            not: null
          }
        }
      }),
      db.resource.count({
        where: {
          ...baseWhere,
          coverImage: null,
          OR: [
            {
              generatedImageUrl: {
                not: null
              }
            },
            {
              mediaType: ResourceMediaType.IMAGE,
              mediaUrl: {
                not: null
              }
            }
          ]
        }
      }),
      db.resource.findMany({
        where: missingImageWhere,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        take: limit,
        select: {
          id: true,
          title: true,
          excerpt: true,
          tier: true,
          category: true,
          type: true,
          status: true,
          coverImage: true,
          generatedImageUrl: true,
          mediaType: true,
          mediaUrl: true,
          imageDirection: true,
          imagePrompt: true
        }
      })
    ]);

  const result: BackfillResourceImagesResult = {
    totalChecked,
    missingImages,
    promptsCreated: 0,
    imagesGenerated: 0,
    failed: 0,
    skippedManualImages,
    skippedExistingImages,
    skippedProviderUnavailable: 0,
    skippedCloudinaryUnavailable: 0,
    providerAvailable: providerConfigured,
    cloudinaryAvailable: cloudinaryConfigured,
    providerUnavailableReasons: providerDiagnostics.imageProviderUnavailableReasons,
    cloudinaryUnavailableReasons: cloudinaryDiagnostics.unavailableReasons,
    providerSkipReasons: {},
    cloudinarySkipReasons: {},
    failureReasons: {},
    dryRun: Boolean(options.dryRun),
    limit,
    publishedOnly: Boolean(options.publishedOnly),
    promptsOnly: Boolean(options.forcePromptsOnly)
  };

  for (const resource of resources) {
    const existingImage = hasManualOrExistingImage(resource);
    if (existingImage) {
      continue;
    }

    const imageDirection =
      resource.imageDirection ||
      buildResourceImageDirection({
        title: resource.title,
        excerpt: resource.excerpt,
        tier: resource.tier,
        category: resource.category,
        type: resource.type
      });
    const imagePrompt =
      resource.imagePrompt ||
      buildResourceImagePrompt({
        title: resource.title,
        excerpt: resource.excerpt,
        tier: resource.tier,
        category: resource.category,
        type: resource.type,
        imageDirection
      });

    if (!resource.imageDirection || !resource.imagePrompt) {
      result.promptsCreated += 1;

      if (!options.dryRun) {
        await db.resource.update({
          where: { id: resource.id },
          data: {
            imageDirection,
            imagePrompt,
            imageStatus: ResourceImageStatus.PROMPT_READY
          }
        });
      }
    }

    if (options.forcePromptsOnly || options.dryRun) {
      continue;
    }

    if (!providerConfigured) {
      result.skippedProviderUnavailable += 1;
      addReason(
        result.providerSkipReasons,
        firstReason(
          providerDiagnostics.imageProviderUnavailableReasons,
          "image generation provider unavailable"
        )
      );
      continue;
    }

    if (!cloudinaryConfigured) {
      result.skippedCloudinaryUnavailable += 1;
      addReason(
        result.cloudinarySkipReasons,
        firstReason(cloudinaryDiagnostics.unavailableReasons, "Cloudinary is not configured")
      );
      continue;
    }

    const generation = await generateCoverImageForResource(resource.id);

    if (generation.status === ResourceImageStatus.GENERATED) {
      result.imagesGenerated += 1;
    } else if (generation.status === ResourceImageStatus.FAILED) {
      result.failed += 1;
      addReason(result.failureReasons, generation.reason);
    } else {
      const reason = generation.reason;
      if (reason.toLowerCase().includes("cloudinary")) {
        result.skippedCloudinaryUnavailable += 1;
        addReason(result.cloudinarySkipReasons, reason);
      } else {
        result.skippedProviderUnavailable += 1;
        addReason(result.providerSkipReasons, reason);
      }
    }
  }

  return result;
}

function formatReasonCounts(reasons: Record<string, number>) {
  return Object.entries(reasons)
    .map(([reason, count]) => `${count} ${reason}`)
    .join("; ");
}

export function formatBackfillSummary(result: BackfillResourceImagesResult) {
  return [
    `dry run ${result.dryRun ? "yes" : "no"}`,
    `scope ${result.publishedOnly ? "published only" : "all resources"}`,
    `limit ${result.limit}`,
    `checked ${result.totalChecked}`,
    `missing ${result.missingImages}`,
    `prompts ${result.promptsCreated}`,
    `generated ${result.imagesGenerated}`,
    `failed ${result.failed}`,
    `manual skipped ${result.skippedManualImages}`,
    `existing skipped ${result.skippedExistingImages}`,
    `provider skipped ${result.skippedProviderUnavailable}${
      result.skippedProviderUnavailable
        ? ` (${formatReasonCounts(result.providerSkipReasons)})`
        : ""
    }`,
    `cloudinary skipped ${result.skippedCloudinaryUnavailable}${
      result.skippedCloudinaryUnavailable
        ? ` (${formatReasonCounts(result.cloudinarySkipReasons)})`
        : ""
    }`
  ].join(", ");
}
