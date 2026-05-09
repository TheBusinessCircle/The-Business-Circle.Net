import "server-only";

import { createHash } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildProxiedPreviewImageUrl,
  buildCommunitySourcePreviewPlaceholder,
  type CommunitySourcePreviewKind
} from "@/lib/community/source-preview";
import {
  isCloudinaryConfigured,
  uploadImageBufferToCloudinary
} from "@/lib/media/cloudinary";
import { logServerWarning } from "@/lib/security/logging";

type ResolveCommunitySourcePreviewInput = {
  title: string;
  sourceUrl: string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  candidateImageUrl?: string | null;
  category?: string | null;
  fetchImpl?: typeof fetch;
};

type ResolveCommunitySourcePreviewResult = {
  sourceUrl: string | null;
  sourceDomain: string | null;
  previewImageUrl: string;
  previewImageKind: CommunitySourcePreviewKind;
  previewGeneratedAt: Date;
};

const COMMUNITY_SOURCE_PREVIEW_PUBLIC_DIR = path.join(
  process.cwd(),
  "public",
  "generated",
  "community-source-previews"
);

function normalizeWhitespace(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function extractDomain(value: string | null | undefined) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function sanitizeAbsoluteImageUrl(value: string | null | undefined, sourceUrl: string | null) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  try {
    const resolved = sourceUrl ? new URL(trimmed, sourceUrl) : new URL(trimmed);
    if (resolved.protocol === "https:" || resolved.protocol === "http:") {
      return resolved.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function isBlockedPreviewHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

function isSafeRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !isBlockedPreviewHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function normalizedSourcePreviewBasename(sourceUrl: string) {
  return createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24);
}

function sourcePreviewAbsolutePath(sourceUrl: string) {
  return path.join(
    COMMUNITY_SOURCE_PREVIEW_PUBLIC_DIR,
    `${normalizedSourcePreviewBasename(sourceUrl)}.png`
  );
}

function sourcePreviewPublicUrl(sourceUrl: string) {
  return `/generated/community-source-previews/${normalizedSourcePreviewBasename(sourceUrl)}.png`;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateSourcePageScreenshot(sourceUrl: string) {
  if (process.env.BCN_SOURCE_PREVIEW_ENABLE_LOCAL_CHROME?.trim().toLowerCase() !== "true") {
    return null;
  }

  const outputPath = sourcePreviewAbsolutePath(sourceUrl);

  if (await fileExists(outputPath)) {
    return sourcePreviewPublicUrl(sourceUrl);
  }

  await mkdir(COMMUNITY_SOURCE_PREVIEW_PUBLIC_DIR, { recursive: true });

  logServerWarning("community-source-preview-screenshot-unavailable", {
    sourceUrl
  });
  return null;
}

function configuredScreenshotProviderUrl(sourceUrl: string) {
  const template = normalizeWhitespace(process.env.BCN_SOURCE_PREVIEW_SCREENSHOT_URL_TEMPLATE);
  if (!template) {
    return null;
  }

  const encodedSourceUrl = encodeURIComponent(sourceUrl);
  const providerUrl = template.includes("{url}")
    ? template.replace("{url}", encodedSourceUrl)
    : `${template}${template.includes("?") ? "&" : "?"}url=${encodedSourceUrl}`;

  return sanitizeAbsoluteImageUrl(providerUrl, null);
}

function extractMetaTagContent(html: string, keys: string[]) {
  for (const key of keys) {
    const propertyPattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const propertyMatch = html.match(propertyPattern);
    if (propertyMatch?.[1]) {
      return propertyMatch[1];
    }

    const contentFirstPattern = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i"
    );
    const contentFirstMatch = html.match(contentFirstPattern);
    if (contentFirstMatch?.[1]) {
      return contentFirstMatch[1];
    }
  }

  return null;
}

async function fetchSourceHtml(sourceUrl: string, fetchImpl: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetchImpl(sourceUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPreviewImageBytes(imageUrl: string, fetchImpl: typeof fetch) {
  if (!isSafeRemoteImageUrl(imageUrl)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    const response = await fetchImpl(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.4",
        "user-agent": "The Business Circle Network source preview bot"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    const allowedTypes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif"
    ]);
    if (!allowedTypes.has(contentType)) {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 4 * 1024 * 1024) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) {
      return null;
    }

    return bytes;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveDurablePreviewImageUrl(input: {
  imageUrl: string | null;
  title: string;
  fetchImpl: typeof fetch;
}) {
  if (!input.imageUrl || !isSafeRemoteImageUrl(input.imageUrl)) {
    return null;
  }

  if (!isCloudinaryConfigured()) {
    return buildProxiedPreviewImageUrl(input.imageUrl);
  }

  const bytes = await fetchPreviewImageBytes(input.imageUrl, input.fetchImpl);
  if (!bytes) {
    return buildProxiedPreviewImageUrl(input.imageUrl);
  }

  try {
    return await uploadImageBufferToCloudinary({
      bytes,
      folder: "bcn-intelligence/source-previews",
      publicIdPrefix: normalizedSourcePreviewBasename(`${input.title}:${input.imageUrl}`)
    });
  } catch {
    return buildProxiedPreviewImageUrl(input.imageUrl);
  }
}

export async function resolveCommunitySourcePreviewMetadata(
  input: ResolveCommunitySourcePreviewInput
): Promise<ResolveCommunitySourcePreviewResult> {
  const sourceUrl = normalizeWhitespace(input.sourceUrl) || null;
  const sourceDomain = normalizeWhitespace(input.sourceDomain) || extractDomain(sourceUrl);
  const generatedAt = new Date();

  if (sourceUrl) {
    const html = await fetchSourceHtml(sourceUrl, input.fetchImpl ?? fetch);
    if (html) {
      const ogImage = extractMetaTagContent(html, ["og:image", "twitter:image"]);
      const resolvedOgImage = sanitizeAbsoluteImageUrl(ogImage, sourceUrl);
      const durableOgImage = await resolveDurablePreviewImageUrl({
        imageUrl: resolvedOgImage,
        title: input.title,
        fetchImpl: input.fetchImpl ?? fetch
      });

      if (durableOgImage) {
        return {
          sourceUrl,
          sourceDomain,
          previewImageUrl: durableOgImage,
          previewImageKind: "og-image",
          previewGeneratedAt: generatedAt
        };
      }
    }

    const resolvedCandidateImage = sanitizeAbsoluteImageUrl(input.candidateImageUrl, sourceUrl);
    const durableCandidateImage = await resolveDurablePreviewImageUrl({
      imageUrl: resolvedCandidateImage,
      title: input.title,
      fetchImpl: input.fetchImpl ?? fetch
    });

    if (durableCandidateImage) {
      return {
        sourceUrl,
        sourceDomain,
        previewImageUrl: durableCandidateImage,
        previewImageKind: "feed-image",
        previewGeneratedAt: generatedAt
      };
    }

    const providerScreenshotUrl = configuredScreenshotProviderUrl(sourceUrl);
    if (providerScreenshotUrl) {
      return {
        sourceUrl,
        sourceDomain,
        previewImageUrl: buildProxiedPreviewImageUrl(providerScreenshotUrl),
        previewImageKind: "screenshot",
        previewGeneratedAt: generatedAt
      };
    }

    const screenshotUrl = await generateSourcePageScreenshot(sourceUrl);
    if (screenshotUrl) {
      return {
        sourceUrl,
        sourceDomain,
        previewImageUrl: screenshotUrl,
        previewImageKind: "screenshot",
        previewGeneratedAt: generatedAt
      };
    }
  }

  return {
    sourceUrl,
    sourceDomain,
    previewImageUrl: buildCommunitySourcePreviewPlaceholder({
      title: input.title,
      sourceName: input.sourceName,
      sourceDomain,
      category: input.category
    }),
    previewImageKind: "placeholder",
    previewGeneratedAt: generatedAt
  };
}
