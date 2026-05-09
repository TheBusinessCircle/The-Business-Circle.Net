import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { logServerWarning } from "@/lib/security/logging";

const MAX_PREVIEW_IMAGE_BYTES = 4 * 1024 * 1024;
const PREVIEW_IMAGE_TIMEOUT_MS = 5500;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

function isBlockedHostname(hostname: string) {
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

function parsePreviewImageUrl(request: Request) {
  const src = new URL(request.url).searchParams.get("src")?.trim();
  if (!src) {
    return null;
  }

  try {
    const url = new URL(src);
    if ((url.protocol === "https:" || url.protocol === "http:") && !isBlockedHostname(url.hostname)) {
      return url;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchPreviewImage(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.4",
        "user-agent": "The Business Circle Network source preview bot"
      },
      cache: "force-cache",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`preview-image-fetch-failed:${response.status}`);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new Error(`preview-image-unsupported-type:${contentType || "unknown"}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_PREVIEW_IMAGE_BYTES) {
      throw new Error("preview-image-too-large");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_PREVIEW_IMAGE_BYTES) {
      throw new Error("preview-image-too-large");
    }

    return {
      bytes,
      contentType
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const authResult = await requireApiUser({
    requiredTier: "FOUNDATION"
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const imageUrl = parsePreviewImageUrl(request);
  if (!imageUrl) {
    return NextResponse.json({ error: "Invalid preview image source." }, { status: 400 });
  }

  try {
    const image = await fetchPreviewImage(imageUrl);

    return new NextResponse(image.bytes, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "Content-Type": image.contentType,
        "Content-Length": String(image.bytes.byteLength),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    logServerWarning("intelligence-preview-image-proxy-failed", {
      sourceUrl: imageUrl.toString(),
      error: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json({ error: "Preview image unavailable." }, { status: 404 });
  }
}

