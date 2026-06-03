import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { CIRCLE_CARD_EVENT_TYPES } from "@/lib/circle-card/analytics-events";
import { isTrustedOrigin } from "@/lib/security/origin";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import {
  readCircleCardVisitorIdFromCookieHeader,
  trackCircleCardEvent
} from "@/server/circle-card";

export const runtime = "nodejs";

const circleCardAnalyticsPayloadSchema = z.object({
  cardId: z.string().trim().min(8).max(120),
  eventType: z.enum(CIRCLE_CARD_EVENT_TYPES),
  visitorId: z.string().trim().min(8).max(160).nullable().optional(),
  path: z.string().trim().max(600).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

export async function POST(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request, { allowMissingOrigin: true })) {
      return NextResponse.json({ stored: false }, { status: 202 });
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsed = circleCardAnalyticsPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json({ stored: false }, { status: 202 });
    }

    const visitorId =
      parsed.data.visitorId ||
      readCircleCardVisitorIdFromCookieHeader(request.headers.get("cookie"));
    const rate = await consumeRateLimit({
      key: `api:circle-card-analytics:${visitorId || parsed.data.cardId}`,
      limit: 120,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(rate);

    if (!rate.allowed) {
      return NextResponse.json({ stored: false }, { status: 202, headers });
    }

    const session = await auth().catch(() => null);
    const result = await trackCircleCardEvent({
      cardId: parsed.data.cardId,
      eventType: parsed.data.eventType,
      visitorId,
      userId: session?.user?.id ?? null,
      metadata: {
        ...(parsed.data.metadata ?? {}),
        path: parsed.data.path ?? null
      }
    });

    return NextResponse.json(result, { status: 202, headers });
  } catch {
    return NextResponse.json({ stored: false }, { status: 202, headers });
  }
}
