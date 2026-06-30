import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";

type PublicUploadImageUrlCheck = {
  imageUrl: string;
  publicUploadPathname: string | null;
};

function sameOrigin(value: URL, siteUrl: string) {
  try {
    return value.origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

function publicUploadPathname(value: string, siteUrl: string) {
  if (value.startsWith("/uploads/")) {
    return value.split(/[?#]/)[0] || null;
  }

  try {
    const url = new URL(value);

    if (sameOrigin(url, siteUrl) && url.pathname.startsWith("/uploads/")) {
      return url.pathname;
    }
  } catch {
    return null;
  }

  return null;
}

function publicFilePath(pathname: string) {
  const publicDir = resolve(process.cwd(), "public");
  const relativePath = pathname.replace(/^\/+/, "");
  const absolutePath = resolve(publicDir, relativePath);

  if (absolutePath !== publicDir && absolutePath.startsWith(`${publicDir}${sep}`)) {
    return absolutePath;
  }

  return null;
}

export function parsePublicUploadImageUrl(
  value: string | null | undefined,
  siteUrl: string
): PublicUploadImageUrlCheck | null {
  const imageUrl = value?.trim();

  if (!imageUrl || !isSafeCircleCardImageUrl(imageUrl)) {
    return null;
  }

  return {
    imageUrl,
    publicUploadPathname: publicUploadPathname(imageUrl, siteUrl)
  };
}

export async function resolvePublicUploadImageUrl(
  value: string | null | undefined,
  siteUrl: string
) {
  const parsed = parsePublicUploadImageUrl(value, siteUrl);

  if (!parsed) {
    return null;
  }

  if (!parsed.publicUploadPathname) {
    return parsed.imageUrl;
  }

  const absolutePath = publicFilePath(parsed.publicUploadPathname);

  if (!absolutePath) {
    return null;
  }

  const file = await stat(absolutePath).catch(() => null);
  if (!file?.isFile()) {
    return null;
  }

  const readable = await access(absolutePath, constants.R_OK)
    .then(() => true)
    .catch(() => false);
  return readable ? parsed.imageUrl : null;
}
