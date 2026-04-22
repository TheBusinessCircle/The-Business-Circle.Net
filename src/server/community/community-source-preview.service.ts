import "server-only";

import {
  buildCommunitySourcePreviewPlaceholder,
  type CommunitySourcePreviewKind
} from "@/lib/community/source-preview";

type ResolveCommunitySourcePreviewInput = {
  title: string;
  sourceUrl: string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  fetchImpl?: typeof fetch;
};

type ResolveCommunitySourcePreviewResult = {
  sourceUrl: string | null;
  sourceDomain: string | null;
  previewImageUrl: string;
  previewImageKind: CommunitySourcePreviewKind;
  previewGeneratedAt: Date;
};

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

      if (resolvedOgImage) {
        return {
          sourceUrl,
          sourceDomain,
          previewImageUrl: resolvedOgImage,
          previewImageKind: "og-image",
          previewGeneratedAt: generatedAt
        };
      }
    }
  }

  return {
    sourceUrl,
    sourceDomain,
    previewImageUrl: buildCommunitySourcePreviewPlaceholder({
      title: input.title,
      sourceName: input.sourceName,
      sourceDomain
    }),
    previewImageKind: "placeholder",
    previewGeneratedAt: generatedAt
  };
}
