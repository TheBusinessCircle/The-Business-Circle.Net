import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isBcnV2Enabled } from "./flags";
import {
  consumeRateLimit,
  clientIpFromHeaders,
  getRateLimitBackend,
} from "@/lib/security/rate-limit";
export const privateHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}
export async function requestGuard(
  request: Request,
  bucket: string,
  limit = 8,
  readOnly = false,
) {
  if (!isBcnV2Enabled()) return json({ error: "Unavailable." }, 404);
  if (!readOnly) {
    // Exact same origin. Do not accept merely same-site subdomains for mutations.
    if (
      request.headers.get("origin") !==
      new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || request.url)
        .origin
    )
      return json({ error: "Untrusted request origin." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "JSON required." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 16000)
    return json({ error: "Request too large." }, 413);
  // New public intake fails closed without the established shared limiter in production.
  if (
    process.env.NODE_ENV === "production" &&
    getRateLimitBackend() !== "upstash"
  )
    return json(
      {
        error:
          "This service is temporarily unavailable. Please try again later.",
      },
      503,
    );
  const ipHash = createHash("sha256")
    .update(clientIpFromHeaders(request.headers))
    .digest("hex");
  const rate = await consumeRateLimit({
    key: `bcn-v2:${bucket}:${ipHash}`,
    limit,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.allowed)
    return json({ error: "Too many requests. Please try again later." }, 429);
  if (
    process.env.NODE_ENV === "production" &&
    getRateLimitBackend() !== "upstash"
  )
    return json({ error: "This service is temporarily unavailable." }, 503);
  return null;
}
export async function boundedJson(request: Request) {
  // Content-Length is only a hint; enforce an actual streaming cap for chunked bodies too.
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let bytes = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16000) {
      await reader.cancel();
      throw new Error("Payload too large");
    }
    parts.push(value);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
