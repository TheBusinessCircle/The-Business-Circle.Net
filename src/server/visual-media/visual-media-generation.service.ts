import "server-only";

import { VisualMediaStorageProvider } from "@prisma/client";
import { getCloudinaryConfigDiagnostics, uploadImageBufferAssetToCloudinary } from "@/lib/media/cloudinary";
import { slugify } from "@/lib/utils";
import {
  applyVisualMediaBcnStyle,
  buildVisualMediaImagePrompt,
  getVisualMediaPlacementDefinition,
  type VisualMediaPlacementKey
} from "@/lib/visual-media";
import type { VisualMediaGenerationTarget } from "@/lib/visual-media/types";
import {
  describeResourceProviderError,
  generateResourceCoverImageFromProvider,
  getResourceAiProviderDiagnostics,
  getSafeOpenAiErrorDetails
} from "@/server/resources/resource-ai-provider.service";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";
import {
  getVisualMediaPlacement,
  replaceVisualMediaPlacementStoredAssetForTarget
} from "@/server/visual-media/visual-media.service";

const CLOUDINARY_VISUAL_MEDIA_FOLDER =
  process.env.CLOUDINARY_VISUAL_MEDIA_FOLDER?.trim() || "business-circle/visual-media";

export class VisualMediaGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "VisualMediaGenerationError";
  }
}

function sanitizePathSegment(value: string) {
  return (
    slugify(value)
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "placement"
  );
}

function safeProviderDetails(error: unknown) {
  const openAiDetails = getSafeOpenAiErrorDetails(error);

  if (openAiDetails) {
    return openAiDetails;
  }

  if (error instanceof ResourceGenerationError) {
    return error.details ?? null;
  }

  return null;
}

export async function generateVisualMediaPlacementAsset(input: {
  key: VisualMediaPlacementKey;
  target: VisualMediaGenerationTarget;
  prompt: string;
}) {
  const placement = await getVisualMediaPlacement(input.key);

  if (!placement) {
    throw new VisualMediaGenerationError(
      "Visual media placement was not found.",
      "visual-media-placement-not-found"
    );
  }

  const definition = getVisualMediaPlacementDefinition(input.key);
  const imagePrompt = applyVisualMediaBcnStyle(
    input.prompt.trim() ||
      buildVisualMediaImagePrompt({
        definition,
        target: input.target
      }),
    { target: input.target }
  );

  const providerDiagnostics = getResourceAiProviderDiagnostics();

  if (!providerDiagnostics.imageProviderAvailable) {
    throw new VisualMediaGenerationError(
      `Image provider unavailable: ${providerDiagnostics.imageProviderUnavailableReasons.join("; ") || "not configured"}`,
      "image-provider-unavailable",
      {
        reasons: providerDiagnostics.imageProviderUnavailableReasons,
        model: providerDiagnostics.imageModel,
        fallbackModel: providerDiagnostics.imageFallbackModel || null,
        size: providerDiagnostics.imageSize,
        quality: providerDiagnostics.imageQuality,
        endpoint: providerDiagnostics.imageEndpoint,
        method: providerDiagnostics.imageMethod
      }
    );
  }

  const cloudinaryDiagnostics = getCloudinaryConfigDiagnostics();

  if (!cloudinaryDiagnostics.configured) {
    throw new VisualMediaGenerationError(
      `Cloudinary unavailable: ${cloudinaryDiagnostics.unavailableReasons.join("; ") || "not configured"}`,
      "cloudinary-unavailable",
      {
        reasons: cloudinaryDiagnostics.unavailableReasons
      }
    );
  }

  let generated: Awaited<ReturnType<typeof generateResourceCoverImageFromProvider>>;

  try {
    generated = await generateResourceCoverImageFromProvider(imagePrompt);
  } catch (error) {
    throw new VisualMediaGenerationError(
      describeResourceProviderError(error, "image provider"),
      error instanceof ResourceGenerationError ? error.code : "image-generation-failed",
      {
        provider: "openai",
        ...((safeProviderDetails(error) as Record<string, unknown> | null) ?? {})
      }
    );
  }

  if (!generated.bytes) {
    throw new VisualMediaGenerationError(
      "Image provider returned no binary image data.",
      "image-generation-empty",
      generated.metadata
    );
  }

  const keySegment = sanitizePathSegment(input.key.replaceAll(".", "-"));
  const uploadResult = await uploadImageBufferAssetToCloudinary({
    bytes: generated.bytes,
    folder: `${CLOUDINARY_VISUAL_MEDIA_FOLDER}/${keySegment}`,
    publicIdPrefix: `${keySegment}-${input.target}-generated`
  });

  const updatedPlacement = await replaceVisualMediaPlacementStoredAssetForTarget({
    key: input.key,
    target: input.target,
    current: placement,
    stored: {
      url: uploadResult.secureUrl,
      storageKey: uploadResult.publicId,
      storageProvider: VisualMediaStorageProvider.CLOUDINARY
    }
  });

  console.info("[visual-media] generated image attached", {
    key: input.key,
    target: input.target,
    model: generated.metadata.model ?? null,
    fallbackModelUsed: generated.metadata.fallbackModelUsed ?? false,
    publicId: uploadResult.publicId
  });

  return {
    placement: updatedPlacement,
    imageUrl: uploadResult.secureUrl,
    storageKey: uploadResult.publicId,
    target: input.target,
    prompt: imagePrompt,
    metadata: generated.metadata
  };
}
