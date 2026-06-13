import "server-only";

import { lookup } from "node:dns/promises";
import net from "node:net";
import { normalizeExternalHref } from "@/lib/links";
import {
  detectCircleCardSmartImportPlatform,
  guessCircleCardSmartImportHandle,
  type CircleCardSmartImportMetadata
} from "@/lib/circle-card/smart-import";

const SMART_IMPORT_TIMEOUT_MS = 6500;
const SMART_IMPORT_MAX_RESPONSE_BYTES = 256 * 1024;
const SMART_IMPORT_MAX_REDIRECTS = 3;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal"
]);

type SafeUrlResult =
  | {
      ok: true;
      url: URL;
    }
  | {
      ok: false;
      url?: URL;
      error: string;
    };

function trimMetadata(value: string | null | undefined, maxLength: number) {
  return decodeHtmlEntities(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength) || null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isBlockedIpAddress(address: string) {
  const family = net.isIP(address);

  if (family === 4) {
    return isPrivateIpv4(address);
  }

  if (family === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

async function validateSmartImportUrl(rawValue: string): Promise<SafeUrlResult> {
  const normalized = normalizeExternalHref(rawValue);
  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    return { ok: false, error: "Enter a valid web address." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, url, error: "Only public http and https links can be scanned." };
  }

  if (url.username || url.password) {
    return { ok: false, url, error: "Links with embedded credentials cannot be scanned." };
  }

  const hostname = url.hostname.toLowerCase();

  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { ok: false, url, error: "Local or internal links cannot be scanned." };
  }

  if (net.isIP(hostname) && isBlockedIpAddress(hostname)) {
    return { ok: false, url, error: "Private network links cannot be scanned." };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });

    if (!addresses.length || addresses.some((address) => isBlockedIpAddress(address.address))) {
      return { ok: false, url, error: "Private network links cannot be scanned." };
    }
  } catch {
    return { ok: false, url, error: "We could not resolve this link safely." };
  }

  return { ok: true, url };
}

function readAttribute(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  const match = tag.match(pattern);

  if (!match?.[1]) {
    return null;
  }

  return match[1].replace(/^["']|["']$/g, "");
}

function findMetaContent(head: string, keys: string[]) {
  const tags = head.match(/<meta\b[^>]*>/gi) ?? [];

  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    const tag = tags.find((candidate) => {
      const property = readAttribute(candidate, "property")?.toLowerCase();
      const name = readAttribute(candidate, "name")?.toLowerCase();
      return property === normalizedKey || name === normalizedKey;
    });
    const content = tag ? readAttribute(tag, "content") : null;

    if (content) {
      return content;
    }
  }

  return null;
}

function findLinkHref(head: string, relValues: string[]) {
  const tags = head.match(/<link\b[^>]*>/gi) ?? [];

  for (const relValue of relValues) {
    const tag = tags.find((candidate) =>
      readAttribute(candidate, "rel")
        ?.toLowerCase()
        .split(/\s+/)
        .includes(relValue)
    );
    const href = tag ? readAttribute(tag, "href") : null;

    if (href) {
      return href;
    }
  }

  return null;
}

function absoluteMetadataUrl(value: string | null | undefined, baseUrl: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(decodeHtmlEntities(value), baseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    return url.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

function parseHtmlMetadata(input: { html: string; url: URL; inputUrl: string }) {
  const head = (input.html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? input.html).slice(
    0,
    SMART_IMPORT_MAX_RESPONSE_BYTES
  );
  const titleMatch = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title =
    trimMetadata(
      findMetaContent(head, ["og:title", "twitter:title"]) ?? titleMatch?.[1] ?? "",
      140
    ) ?? null;
  const description = trimMetadata(
    findMetaContent(head, ["og:description", "twitter:description", "description"]),
    280
  );
  const siteName = trimMetadata(findMetaContent(head, ["og:site_name", "application-name"]), 90);
  const image = absoluteMetadataUrl(
    findMetaContent(head, ["og:image", "twitter:image", "twitter:image:src"]),
    input.url.toString()
  );
  const canonicalUrl = absoluteMetadataUrl(findLinkHref(head, ["canonical"]), input.url.toString());
  const favicon = absoluteMetadataUrl(
    findLinkHref(head, ["icon", "shortcut", "apple-touch-icon"]),
    input.url.toString()
  );
  const finalUrl = canonicalUrl ?? input.url.toString();
  const detectedPlatform = detectCircleCardSmartImportPlatform(finalUrl);

  return {
    inputUrl: input.inputUrl,
    url: finalUrl,
    ok: true,
    title,
    description,
    image,
    siteName,
    favicon,
    canonicalUrl,
    detectedPlatform,
    handleGuess: guessCircleCardSmartImportHandle(finalUrl)
  } satisfies CircleCardSmartImportMetadata;
}

async function readLimitedResponseText(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > SMART_IMPORT_MAX_RESPONSE_BYTES) {
    throw new Error("Response was too large to scan.");
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    received += value.byteLength;

    if (received > SMART_IMPORT_MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Response was too large to scan.");
    }

    chunks.push(value);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)
  );
}

async function fetchSmartImportHtml(input: {
  url: URL;
  inputUrl: string;
  redirectCount?: number;
}): Promise<CircleCardSmartImportMetadata> {
  const redirectCount = input.redirectCount ?? 0;
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), SMART_IMPORT_TIMEOUT_MS);

  try {
    const response = await fetch(input.url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.4",
        "user-agent": "CircleCardSmartImport/1.0 (+https://thebusinesscircle.net)"
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location || redirectCount >= SMART_IMPORT_MAX_REDIRECTS) {
        throw new Error("This link redirected too many times.");
      }

      const next = await validateSmartImportUrl(new URL(location, input.url).toString());

      if (!next.ok) {
        throw new Error(next.error);
      }

      return fetchSmartImportHtml({
        url: next.url,
        inputUrl: input.inputUrl,
        redirectCount: redirectCount + 1
      });
    }

    if (!response.ok) {
      throw new Error("This site did not return readable public metadata.");
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("This link is not a public HTML page.");
    }

    const html = await readLimitedResponseText(response);
    return parseHtmlMetadata({ html, url: input.url, inputUrl: input.inputUrl });
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

function failureResult(inputUrl: string, error: string): CircleCardSmartImportMetadata {
  const normalized = normalizeExternalHref(inputUrl);
  const detectedPlatform = detectCircleCardSmartImportPlatform(normalized);

  return {
    inputUrl,
    url: normalized,
    ok: false,
    title: null,
    description: null,
    image: null,
    siteName: null,
    favicon: null,
    canonicalUrl: null,
    detectedPlatform,
    handleGuess: guessCircleCardSmartImportHandle(normalized),
    error
  };
}

export async function scanCircleCardSmartImportUrls(inputUrls: string[]) {
  const uniqueUrls = Array.from(
    new Set(inputUrls.map((url) => url.trim()).filter(Boolean))
  ).slice(0, 8);

  const results = await Promise.all(
    uniqueUrls.map(async (inputUrl) => {
      const safeUrl = await validateSmartImportUrl(inputUrl);

      if (!safeUrl.ok) {
        return failureResult(inputUrl, safeUrl.error);
      }

      try {
        return await fetchSmartImportHtml({ url: safeUrl.url, inputUrl });
      } catch (error) {
        const message =
          error instanceof Error && error.name === "AbortError"
            ? "This site took too long to respond."
            : "We couldn't read this link automatically, but you can still add it manually.";

        return failureResult(inputUrl, message);
      }
    })
  );

  return results;
}
