import "server-only";

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildCommunitySourcePreviewPlaceholder,
  type CommunitySourcePreviewKind
} from "@/lib/community/source-preview";
import { logServerWarning } from "@/lib/security/logging";

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

const execFileAsync = promisify(execFile);
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

function screenshotChromeCandidates() {
  const configured = normalizeWhitespace(process.env.BCN_SOURCE_PREVIEW_CHROME_PATH);

  return [
    configured,
    process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "win32"
      ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "linux" ? "/usr/bin/google-chrome" : null,
    process.platform === "linux" ? "/usr/bin/chromium-browser" : null,
    process.platform === "linux" ? "/usr/bin/chromium" : null,
    process.platform === "linux" ? "google-chrome" : null,
    process.platform === "linux" ? "chromium-browser" : null,
    process.platform === "linux" ? "chromium" : null
  ].filter(Boolean) as string[];
}

async function tryGenerateScreenshotWithChrome(chromePath: string, sourceUrl: string, outputPath: string) {
  await execFileAsync(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,2200",
      "--virtual-time-budget=7000",
      `--screenshot=${outputPath}`,
      sourceUrl
    ],
    {
      timeout: 20000
    }
  );

  return fileExists(outputPath);
}

async function generateSourcePageScreenshot(sourceUrl: string) {
  const outputPath = sourcePreviewAbsolutePath(sourceUrl);

  if (await fileExists(outputPath)) {
    return sourcePreviewPublicUrl(sourceUrl);
  }

  await mkdir(COMMUNITY_SOURCE_PREVIEW_PUBLIC_DIR, { recursive: true });

  for (const candidate of screenshotChromeCandidates()) {
    try {
      const didCreateScreenshot = await tryGenerateScreenshotWithChrome(
        candidate,
        sourceUrl,
        outputPath
      );

      if (didCreateScreenshot) {
        return sourcePreviewPublicUrl(sourceUrl);
      }
    } catch {
      continue;
    }
  }

  logServerWarning("community-source-preview-screenshot-unavailable", {
    sourceUrl
  });
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
