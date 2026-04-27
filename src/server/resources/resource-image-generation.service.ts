import { ResourceImageStatus } from "@prisma/client";
import { RESOURCE_IMAGE_MODEL } from "@/config/resources";
import { db } from "@/lib/db";
import {
  getCloudinaryConfigDiagnostics,
  isCloudinaryConfigured,
  uploadImageBufferToCloudinary
} from "@/lib/media/cloudinary";
import { slugify } from "@/lib/utils";
import {
  describeResourceProviderError,
  generateResourceCoverImageFromProvider,
  getResourceAiProviderDiagnostics,
  isResourceImageProviderConfigured
} from "@/server/resources/resource-ai-provider.service";
import {
  buildResourceImageDirection,
  buildResourceImagePrompt,
  isRelatableResourceImagePrompt
} from "@/server/resources/resource-image-prompt-builder";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";

const CLOUDINARY_RESOURCE_FOLDER =
  process.env.CLOUDINARY_RESOURCE_FOLDER?.trim() || "business-circle/resources";

type ResourceForImageGeneration = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tier: Parameters<typeof buildResourceImagePrompt>[0]["tier"];
  category: string;
  type: Parameters<typeof buildResourceImagePrompt>[0]["type"];
  coverImage: string | null;
  generatedImageUrl: string | null;
  imageStatus: ResourceImageStatus;
  imageDirection: string | null;
  imagePrompt: string | null;
  generationMetadata: unknown;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function saveImageFailure(input: {
  resourceId: string;
  imagePrompt: string;
  imageDirection: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  existingMetadata: Record<string, unknown>;
}) {
  await db.resource.update({
    where: { id: input.resourceId },
    data: {
      imagePrompt: input.imagePrompt,
      imageDirection: input.imageDirection,
      imageStatus: ResourceImageStatus.FAILED,
      generationMetadata: {
        ...input.existingMetadata,
        imageGeneration: {
          status: "failed",
          code: input.code,
          message: input.message,
          httpStatus:
            typeof input.details?.status === "number" ? input.details.status : null,
          providerErrorCode:
            typeof input.details?.providerErrorCode === "string"
              ? input.details.providerErrorCode
              : null,
          providerErrorType:
            typeof input.details?.providerErrorType === "string"
              ? input.details.providerErrorType
              : null,
          model:
            typeof input.details?.model === "string" ? input.details.model : null,
          imageSize:
            typeof input.details?.size === "string" ? input.details.size : null,
          imageQuality:
            typeof input.details?.quality === "string" ? input.details.quality : null,
          endpoint:
            typeof input.details?.endpoint === "string" ? input.details.endpoint : null,
          method:
            typeof input.details?.method === "string" ? input.details.method : null,
          failedAt: new Date().toISOString()
        }
      }
    }
  });
}

export async function ensureResourceImagePrompt(resource: ResourceForImageGeneration) {
  const shouldRebuildPrompt = !isRelatableResourceImagePrompt(resource.imagePrompt);
  const imageDirection =
    !shouldRebuildPrompt && resource.imageDirection?.trim()
      ? resource.imageDirection.trim()
      : buildResourceImageDirection({
          title: resource.title,
          excerpt: resource.excerpt,
          content: resource.content,
          tier: resource.tier,
          category: resource.category,
          type: resource.type
        });
  const imagePrompt =
    !shouldRebuildPrompt && resource.imagePrompt?.trim()
      ? resource.imagePrompt.trim()
      : buildResourceImagePrompt({
          title: resource.title,
          excerpt: resource.excerpt,
          content: resource.content,
          tier: resource.tier,
          category: resource.category,
          type: resource.type,
          imageDirection
        });

  if (resource.imageDirection !== imageDirection || resource.imagePrompt !== imagePrompt) {
    await db.resource.update({
      where: { id: resource.id },
      data: {
        imageDirection,
        imagePrompt,
        imageStatus: ResourceImageStatus.PROMPT_READY
      }
    });
  }

  return { imageDirection, imagePrompt };
}

function shouldAttachGeneratedImageAsCover(resource: ResourceForImageGeneration) {
  if (!resource.coverImage) {
    return true;
  }

  if (resource.generatedImageUrl && resource.coverImage === resource.generatedImageUrl) {
    return true;
  }

  const imageGeneration = metadataRecord(metadataRecord(resource.generationMetadata).imageGeneration);
  return imageGeneration.status === "generated";
}

export async function generateCoverImageForResource(resourceId: string) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      tier: true,
      category: true,
      type: true,
      coverImage: true,
      generatedImageUrl: true,
      imageStatus: true,
      imageDirection: true,
      imagePrompt: true,
      generationMetadata: true
    }
  });

  if (!resource) {
    throw new ResourceGenerationError("Resource not found.", "resource-not-found");
  }

  const { imageDirection, imagePrompt } = await ensureResourceImagePrompt(resource);
  const existingMetadata = metadataRecord(resource.generationMetadata);

  if (!isResourceImageProviderConfigured()) {
    const diagnostics = getResourceAiProviderDiagnostics();
    const reason =
      diagnostics.imageProviderUnavailableReasons[0] ||
      "Image generation provider not configured";
    await db.resource.update({
      where: { id: resource.id },
      data: {
        imageDirection,
        imagePrompt,
        imageStatus: ResourceImageStatus.SKIPPED,
        generationMetadata: {
          ...existingMetadata,
          imageGeneration: {
            status: "skipped",
            reason,
            skippedAt: new Date().toISOString()
          }
        }
      }
    });

    return {
      status: ResourceImageStatus.SKIPPED,
      message: "Image generation provider not configured. Prompt saved.",
      reason
    };
  }

  if (!isCloudinaryConfigured()) {
    const diagnostics = getCloudinaryConfigDiagnostics();
    const reason = diagnostics.unavailableReasons[0] || "Cloudinary is not configured";
    await db.resource.update({
      where: { id: resource.id },
      data: {
        imageDirection,
        imagePrompt,
        imageStatus: ResourceImageStatus.SKIPPED,
        generationMetadata: {
          ...existingMetadata,
          imageGeneration: {
            status: "skipped",
            reason,
            skippedAt: new Date().toISOString()
          }
        }
      }
    });

    return {
      status: ResourceImageStatus.SKIPPED,
      message: "Cloudinary is not configured. Prompt saved.",
      reason
    };
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      imageStatus: ResourceImageStatus.GENERATING,
      imageDirection,
      imagePrompt
    }
  });

  try {
    const generated = await generateResourceCoverImageFromProvider(imagePrompt);

    if (!generated.bytes) {
      throw new ResourceGenerationError(
        "Image provider returned no binary image data.",
        "image-generation-empty"
      );
    }

    const imageUrl = await uploadImageBufferToCloudinary({
      bytes: generated.bytes,
      folder: CLOUDINARY_RESOURCE_FOLDER,
      publicIdPrefix: `resource-${slugify(resource.slug || resource.title)}`
    });

    await db.resource.update({
      where: { id: resource.id },
      data: {
        generatedImageUrl: imageUrl,
        coverImage: shouldAttachGeneratedImageAsCover(resource) ? imageUrl : undefined,
        imageStatus: ResourceImageStatus.GENERATED,
        generationMetadata: {
          ...existingMetadata,
          imageGeneration: {
            status: "generated",
            provider: "openai",
            model: RESOURCE_IMAGE_MODEL,
            generatedAt: new Date().toISOString(),
            sourceUrl: generated.url ?? null,
            ...generated.metadata
          }
        }
      }
    });

    return {
      status: ResourceImageStatus.GENERATED,
      imageUrl,
      message: "Cover image generated."
    };
  } catch (error) {
    const reason = describeResourceProviderError(error, "image provider");
    await saveImageFailure({
      resourceId: resource.id,
      imagePrompt,
      imageDirection,
      code:
        error instanceof ResourceGenerationError
          ? error.code
          : "image-generation-failed",
      message: reason,
      details: error instanceof ResourceGenerationError ? error.details : undefined,
      existingMetadata
    });

    return {
      status: ResourceImageStatus.FAILED,
      message: "Image generation failed, prompt saved.",
      reason
    };
  }
}
