import { createHmac, timingSafeEqual } from "node:crypto";

export const SCALESMITHS_WEBHOOK_TOLERANCE_SECONDS = 300;

// Sign the exact raw HTTP request body, not parsed and re-serialized JSON.
// Example header: X-ScaleSmiths-Signature: v1=<64 lowercase hex characters>
// Example header: X-ScaleSmiths-Timestamp: <unix epoch seconds>
export function scaleSmithsWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string
): string {
  if (!secret) throw new Error("Webhook signing secret is required");
  return createHmac("sha256", secret)
    .update(timestamp + "." + rawBody, "utf8")
    .digest("hex");
}

export function verifyScaleSmithsWebhookSignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowSeconds?: number;
}): boolean {
  if (!input.secret || !input.timestamp || !input.signature) return false;
  if (!/^[0-9]{10,12}$/.test(input.timestamp)) return false;
  if (!/^v1=[a-f0-9]{64}$/.test(input.signature)) return false;

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const seconds = Number(input.timestamp);
  if (!Number.isSafeInteger(seconds) ||
      Math.abs(seconds - nowSeconds) > SCALESMITHS_WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(
    scaleSmithsWebhookSignature(input.secret, input.timestamp, input.rawBody), "hex"
  );
  const received = Buffer.from(input.signature.slice(3), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Verification does NOT replace durable event_id deduplication, version checks,
// partner/client ownership checks, or authorisation to publish client material.
