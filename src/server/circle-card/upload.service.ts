import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import {
  CIRCLE_CARD_LINK_FILE_MIME_BY_EXTENSION,
  CIRCLE_CARD_SUPPORTED_LINK_FILE_EXTENSIONS,
  CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES
} from "@/lib/circle-card/file-actions";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/media/cloudinary";

export type CircleCardImageUploadKind =
  | "profile-photo"
  | "business-logo"
  | "business-card-scan"
  | "link-image";
export type CircleCardLinkFileUploadKind = "link-file";
export type CircleCardUploadKind = CircleCardImageUploadKind | CircleCardLinkFileUploadKind;

const CIRCLE_CARD_UPLOAD_DIR = join(process.cwd(), "public", "uploads", "circle-card");
const CIRCLE_CARD_LINK_FILE_UPLOAD_DIR = join(process.cwd(), ".uploads", "circle-card-link-files");
const CIRCLE_CARD_LINK_FILE_NAME_PATTERN = /^[0-9]+-[a-f0-9]{16}\.(pdf|html?|jpg|png|webp|zip)$/i;
export const MAX_CIRCLE_CARD_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_CIRCLE_CARD_LINK_FILE_UPLOAD_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_CIRCLE_CARD_FOLDER =
  process.env.CLOUDINARY_CIRCLE_CARD_FOLDER?.trim() || "business-circle/circle-card";
const CIRCLE_CARD_UPLOAD_KINDS = new Set<CircleCardImageUploadKind>([
  "profile-photo",
  "business-logo",
  "business-card-scan",
  "link-image"
]);
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SUPPORTED_LINK_FILE_MIME_TYPES = new Set<string>(CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES);
const SUPPORTED_LINK_FILE_EXTENSIONS = new Set<string>(CIRCLE_CARD_SUPPORTED_LINK_FILE_EXTENSIONS);

export function isCircleCardImageUploadKind(value: string): value is CircleCardImageUploadKind {
  return CIRCLE_CARD_UPLOAD_KINDS.has(value as CircleCardImageUploadKind);
}

export function isCircleCardLinkFileUploadKind(value: string): value is CircleCardLinkFileUploadKind {
  return value === "link-file";
}

export function isSupportedCircleCardImageFile(file: File) {
  if (file.type) {
    return SUPPORTED_IMAGE_MIME_TYPES.has(file.type);
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(extname(file.name).toLowerCase());
}

function isSupportedCircleCardLinkFile(file: File) {
  if (file.type) {
    return SUPPORTED_LINK_FILE_MIME_TYPES.has(file.type);
  }

  return SUPPORTED_LINK_FILE_EXTENSIONS.has(extname(file.name).toLowerCase());
}

function imageExtension(file: File) {
  const byName = extname(file.name).toLowerCase();
  if (SUPPORTED_IMAGE_EXTENSIONS.has(byName)) {
    return byName === ".jpeg" ? ".jpg" : byName;
  }

  const typeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip"
  };

  return typeMap[file.type] ?? ".jpg";
}

function linkFileExtension(file: File) {
  const byName = extname(file.name).toLowerCase();
  if (SUPPORTED_LINK_FILE_EXTENSIONS.has(byName)) {
    return byName === ".jpeg" ? ".jpg" : byName;
  }

  const typeMap: Record<string, string> = {
    "application/pdf": ".pdf",
    "text/html": ".html",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return typeMap[file.type] ?? ".pdf";
}

function sanitizeOriginalFileName(value: string) {
  return value
    .trim()
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 160) || "circle-card-file";
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

async function persistUploadedLinkFileLocally(input: {
  file: File;
}) {
  await mkdir(CIRCLE_CARD_LINK_FILE_UPLOAD_DIR, { recursive: true });
  const extension = linkFileExtension(input.file);
  const filename = `${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 16)}${extension}`;
  const absolutePath = join(CIRCLE_CARD_LINK_FILE_UPLOAD_DIR, filename);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    fileUrl: `/api/circle-card/link-file/${filename}`,
    fileName: sanitizeOriginalFileName(input.file.name),
    fileMimeType: input.file.type || CIRCLE_CARD_LINK_FILE_MIME_BY_EXTENSION[extension] || "application/octet-stream"
  };
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

export async function persistCircleCardLinkFileUpload(input: {
  file: File;
}) {
  if (input.file.size > MAX_CIRCLE_CARD_LINK_FILE_UPLOAD_BYTES) {
    throw new Error("circle-card-link-file-too-large");
  }

  if (!isSupportedCircleCardLinkFile(input.file)) {
    throw new Error("invalid-circle-card-link-file");
  }

  return persistUploadedLinkFileLocally(input);
}

export function isCircleCardLinkFileName(filename: string) {
  return CIRCLE_CARD_LINK_FILE_NAME_PATTERN.test(filename);
}

function resolveCircleCardLinkFilePath(filename: string) {
  if (!isCircleCardLinkFileName(filename)) {
    return null;
  }

  const storageRoot = resolve(CIRCLE_CARD_LINK_FILE_UPLOAD_DIR);
  const absolutePath = resolve(storageRoot, filename);
  const relativePath = relative(storageRoot, absolutePath);

  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return null;
  }

  return absolutePath;
}

export async function readCircleCardLinkFile(filename: string) {
  const absolutePath = resolveCircleCardLinkFilePath(filename);

  if (!absolutePath) {
    return null;
  }

  const bytes = await readFile(absolutePath).catch(() => null);

  if (!bytes) {
    return null;
  }

  const extension = extname(filename).toLowerCase();
  const mimeType = CIRCLE_CARD_LINK_FILE_MIME_BY_EXTENSION[extension] || "application/octet-stream";

  return {
    bytes,
    mimeType,
    originalFilename: `circle-card-file${extension === ".htm" ? ".html" : extension}`,
    forceDownload: false
  };
}
