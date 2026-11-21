import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseScaleSmithsEvent } from "@/lib/circle-card/scalesmiths/contract";
import { verifyScaleSmithsWebhookSignature } from "@/lib/circle-card/scalesmiths/signatures";
import {
  processVerifiedScaleSmithsEvent,
  ScaleSmithsEventConflict
} from "@/server/circle-card/scalesmiths-events.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENT_BODY_BYTES = 32 * 1024;

function response(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  // Fail closed. This route remains dormant even if accidentally deployed.
  if (process.env.CIRCLE_CARD_SCALESMITHS_WEBHOOKS_ENABLED !== "true" ||
      process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") {
    return response({ error: "integration_disabled" }, 503);
  }

  const secret = process.env.SCALESMITHS_CIRCLE_CARD_WEBHOOK_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return response({ error: "integration_not_configured" }, 503);
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return response({ error: "unsupported_media_type" }, 415);
  }

  const statedLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(statedLength) && statedLength > MAX_EVENT_BODY_BYTES) {
    return response({ error: "event_too_large" }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return response({ error: "cannot_read_event" }, 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_EVENT_BODY_BYTES) {
    return response({ error: "event_too_large" }, 413);
  }

  if (!verifyScaleSmithsWebhookSignature({
    secret,
    timestamp: request.headers.get("x-scalesmiths-timestamp"),
    signature: request.headers.get("x-scalesmiths-signature"),
    rawBody
  })) {
    return response({ error: "invalid_event_signature" }, 401);
  }

  let event;
  try {
    event = parseScaleSmithsEvent(JSON.parse(rawBody) as unknown);
  } catch {
    return response({ error: "invalid_event_schema" }, 400);
  }

  // A forged future occurred_at could otherwise block legitimate later events.
  if (new Date(event.occurred_at).getTime() > Date.now() + 300_000) {
    return response({ error: "event_timestamp_in_future" }, 400);
  }

  try {
    const state = await processVerifiedScaleSmithsEvent(event, rawBody);
    // Revalidate on duplicates too, so a delivery retry repairs a prior cache
    // invalidation failure after the event transaction was already committed.
    if (state !== "stale") {
      const membership = await prisma.circleCardScaleSmithsPartner.findUnique({
        where: { externalPartnerId: event.partner_id },
        select: { partnerCard: { select: { slug: true } } }
      });
      if (membership?.partnerCard?.slug) revalidatePath(`/card/${membership.partnerCard.slug}`);
      revalidatePath("/dashboard/circle-card/scalesmiths");
      revalidatePath("/dashboard/circle-card");
    }
    // Signed acknowledgement contains only a public card path, not private data.
    const member = await prisma.circleCardScaleSmithsPartner.findUnique({
      where: { externalPartnerId: event.partner_id },
      select: {
        status: true,
        partnerCard: { select: { isPublished: true, slug: true } }
      }
    });
    const partnerCardPath = member?.status === "ACTIVE" &&
      member.partnerCard?.isPublished
      ? `/card/${member.partnerCard.slug}`
      : null;
    return response({
      event_id: event.event_id, state, partner_card_path: partnerCardPath
    }, 202);
  } catch (error) {
    if (error instanceof ScaleSmithsEventConflict) {
      return response({ error: "conflicting_event" }, 409);
    }
    // Fail closed: don't leak client, account or database information.
    return response({ error: "event_processing_unavailable" }, 503);
  }
}
