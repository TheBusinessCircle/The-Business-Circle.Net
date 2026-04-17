import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { DirectMessageAttachmentKind } from "@prisma/client";

export const DIRECT_MESSAGE_UPLOAD_STORAGE_DIR = join(
  process.cwd(),
  ".uploads",
  "direct-messages"
);
export const WIN_UPLOAD_STORAGE_DIR = join(process.cwd(), ".uploads", "wins");
export const MAX_DIRECT_MESSAGE_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_DIRECT_MESSAGE_UPLOAD_COUNT = 4;
export const MAX_WIN_UPLOAD_COUNT = 3;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const FILE_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv"
]);

function sanitizeBaseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function isFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function resolveAllowedExtension(file: File) {
  const extension = extname(file.name).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return {
      extension,
      kind: DirectMessageAttachmentKind.IMAGE
    };
  }

  if (FILE_EXTENSIONS.has(extension)) {
    return {
      extension,
      kind: DirectMessageAttachmentKind.FILE
    };
  }

  return null;
}

async function persistProtectedUpload(input: {
  file: File;
  parentId: string;
  storageDir: string;
}) {
  if (input.file.size > MAX_DIRECT_MESSAGE_UPLOAD_BYTES) {
    throw new Error("upload-too-large");
  }

  const allowed = resolveAllowedExtension(input.file);
  if (!allowed) {
    throw new Error("invalid-upload-type");
  }

  const directory = join(input.storageDir, input.parentId);
  await mkdir(directory, { recursive: true });

  const baseName =
    sanitizeBaseName(input.file.name.replace(new RegExp(`${allowed.extension}$`, "i"), "")) ||
    "file";
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}${allowed.extension}`;
  const absolutePath = join(directory, storedName);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    storageKey: `${input.parentId}/${storedName}`,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
    kind: allowed.kind
  };
}

export async function persistDirectMessageAttachment(file: File, threadId: string) {
  return persistProtectedUpload({
    file,
    parentId: threadId,
    storageDir: DIRECT_MESSAGE_UPLOAD_STORAGE_DIR
  });
}

export async function persistWinAttachment(file: File, winId: string) {
  return persistProtectedUpload({
    file,
    parentId: winId,
    storageDir: WIN_UPLOAD_STORAGE_DIR
  });
}

export function resolveDirectMessageAttachmentAbsolutePath(storageKey: string) {
  const normalized = normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(DIRECT_MESSAGE_UPLOAD_STORAGE_DIR, normalized);
}

export function resolveWinAttachmentAbsolutePath(storageKey: string) {
  const normalized = normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(WIN_UPLOAD_STORAGE_DIR, normalized);
}
