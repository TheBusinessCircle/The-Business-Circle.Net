import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VisualMediaStorageProvider } from "@prisma/client";
import {
  deleteImageFromCloudinary,
  isCloudinaryConfigured,
  uploadImageAssetToCloudinary
} from "@/lib/media/cloudinary";
import {
  isSupportedVisualMediaFile,
  visualMediaFileExtension,
  VISUAL_MEDIA_MAX_UPLOAD_BYTES,
  VISUAL_MEDIA_UPLOAD_PATH_PREFIX
} from "@/lib/visual-media/validation";

const VISUAL_MEDIA_UPLOAD_DIR = join(process.cwd(), "public", "uploads", "visual-media");
const CLOUDINARY_VISUAL_MEDIA_FOLDER =
  process.env.CLOUDINARY_VISUAL_MEDIA_FOLDER?.trim() || "business-circle/visual-media";

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export type StoredVisualMediaAsset = {
  url: string;
  storageKey: string;
  storageProvider: VisualMediaStorageProvider;
};

export async function persistVisualMediaUpload(
  file: File,
  placementKey: string,
  mode: "desktop" | "mobile"
): Promise<StoredVisualMediaAsset> {
  console.info("[visual-media] upload service received file", {
    placementKey,
    mode,
    size: file.size,
    type: file.type || "unknown"
  });

  if (file.size > VISUAL_MEDIA_MAX_UPLOAD_BYTES) {
    throw new Error("visual-media-too-large");
  }

  if (!isSupportedVisualMediaFile(file)) {
    throw new Error("invalid-visual-media");
  }

  const keySegment = sanitizePathSegment(placementKey.replaceAll(".", "-")) || "placement";
  const extension = visualMediaFileExtension(file);
  const fileName = `${mode}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;

  if (isCloudinaryConfigured()) {
    console.info("[visual-media] cloudinary upload starting", {
      placementKey,
      mode,
      folder: `${CLOUDINARY_VISUAL_MEDIA_FOLDER}/${keySegment}`
    });

    const result = await uploadImageAssetToCloudinary({
      file,
      folder: `${CLOUDINARY_VISUAL_MEDIA_FOLDER}/${keySegment}`,
      publicIdPrefix: `${keySegment}-${mode}`
    });

    console.info("[visual-media] cloudinary upload completed", {
      placementKey,
      mode,
      publicId: result.publicId
    });

    return {
      url: result.secureUrl,
      storageKey: result.publicId,
      storageProvider: VisualMediaStorageProvider.CLOUDINARY
    };
  }

  const absoluteDirectory = join(VISUAL_MEDIA_UPLOAD_DIR, keySegment);
  await mkdir(absoluteDirectory, { recursive: true });
  const relativePath = `${keySegment}/${fileName}`;
  const absolutePath = join(absoluteDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  console.info("[visual-media] local upload completed", {
    placementKey,
    mode,
    storageKey: relativePath
  });

  return {
    url: `${VISUAL_MEDIA_UPLOAD_PATH_PREFIX}${relativePath}`,
    storageKey: relativePath,
    storageProvider: VisualMediaStorageProvider.LOCAL
  };
}

export async function deleteManagedVisualMediaAsset(
  storageProvider: VisualMediaStorageProvider | null | undefined,
  storageKey: string | null | undefined
) {
  if (!storageProvider || !storageKey) {
    return;
  }

  if (storageProvider === VisualMediaStorageProvider.CLOUDINARY) {
    await deleteImageFromCloudinary(storageKey);
    return;
  }

  const absolutePath = join(VISUAL_MEDIA_UPLOAD_DIR, storageKey);

  try {
    await unlink(absolutePath);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}
