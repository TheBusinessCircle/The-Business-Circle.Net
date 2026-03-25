import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

export const FOUNDER_UPLOAD_STORAGE_DIR = join(
  process.cwd(),
  ".uploads",
  "founder-services"
);
export const MAX_FOUNDER_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_FOUNDER_UPLOAD_COUNT = 5;

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt"
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

function allowedExtension(file: File): string | null {
  const extension = extname(file.name).toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.has(extension) ? extension : null;
}

export function isFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function persistFounderUpload(
  file: File,
  requestId: string
): Promise<{
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
}> {
  if (file.size > MAX_FOUNDER_UPLOAD_BYTES) {
    throw new Error("upload-too-large");
  }

  const extension = allowedExtension(file);
  if (!extension) {
    throw new Error("invalid-upload-type");
  }

  const requestDirectory = join(FOUNDER_UPLOAD_STORAGE_DIR, requestId);
  await mkdir(requestDirectory, { recursive: true });

  const baseName =
    sanitizeBaseName(file.name.replace(new RegExp(`${extension}$`, "i"), "")) || "file";
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}${extension}`;
  const absolutePath = join(requestDirectory, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    fileUrl: `${requestId}/${storedName}`,
    fileName: file.name,
    mimeType: file.type || null
  };
}

export function resolveFounderUploadAbsolutePath(fileUrl: string): string {
  const normalized = normalize(fileUrl).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(FOUNDER_UPLOAD_STORAGE_DIR, normalized);
}
