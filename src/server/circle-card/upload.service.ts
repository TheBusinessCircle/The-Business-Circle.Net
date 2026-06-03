import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/media/cloudinary";

export type CircleCardImageUploadKind = "profile-photo" | "business-logo";

const CIRCLE_CARD_UPLOAD_DIR = join(process.cwd(), "public", "uploads", "circle-card");
const MAX_CIRCLE_CARD_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const CLOUDINARY_CIRCLE_CARD_FOLDER =
  process.env.CLOUDINARY_CIRCLE_CARD_FOLDER?.trim() || "business-circle/circle-card";
const CIRCLE_CARD_UPLOAD_KINDS = new Set<CircleCardImageUploadKind>([
  "profile-photo",
  "business-logo"
]);
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function isCircleCardImageUploadKind(value: string): value is CircleCardImageUploadKind {
  return CIRCLE_CARD_UPLOAD_KINDS.has(value as CircleCardImageUploadKind);
}

function isSupportedCircleCardImageFile(file: File) {
  if (file.type) {
    return SUPPORTED_IMAGE_MIME_TYPES.has(file.type);
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(extname(file.name).toLowerCase());
}

function imageExtension(file: File) {
  const byName = extname(file.name).toLowerCase();
  if (SUPPORTED_IMAGE_EXTENSIONS.has(byName)) {
    return byName === ".jpeg" ? ".jpg" : byName;
  }

  const typeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return typeMap[file.type] ?? ".jpg";
}

async function persistUploadedImageLocally(input: {
  file: File;
  userId: string;
  kind: CircleCardImageUploadKind;
}) {
  await mkdir(CIRCLE_CARD_UPLOAD_DIR, { recursive: true });
  const extension = imageExtension(input.file);
  const filename = `${input.userId}-${input.kind}-${Date.now()}-${randomUUID().slice(
    0,
    8
  )}${extension}`;
  const absolutePath = join(CIRCLE_CARD_UPLOAD_DIR, filename);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  await writeFile(absolutePath, bytes);
  return `/uploads/circle-card/${filename}`;
}

export async function persistCircleCardImageUpload(input: {
  file: File;
  userId: string;
  kind: CircleCardImageUploadKind;
}) {
  if (input.file.size > MAX_CIRCLE_CARD_IMAGE_UPLOAD_BYTES) {
    throw new Error("circle-card-image-too-large");
  }

  if (!isSupportedCircleCardImageFile(input.file)) {
    throw new Error("invalid-circle-card-image");
  }

  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinary({
      file: input.file,
      folder: `${CLOUDINARY_CIRCLE_CARD_FOLDER}/${input.kind}`,
      publicIdPrefix: `${input.userId}-${input.kind}`
    });
  }

  return persistUploadedImageLocally(input);
}
