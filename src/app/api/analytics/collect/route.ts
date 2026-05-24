import { NextResponse } from "next/server";
import { z } from "zod";
import {
  collectFirstPartyAnalytics,
  FIRST_PARTY_ANALYTICS_EVENTS
} from "@/server/analytics/first-party";
import { isTrustedOrigin } from "@/lib/security/origin";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";

export const runtime = "nodejs";

const collectPayloadSchema = z.object({
  anonymousId: z.string().trim().min(12).max(120),
  sessionId: z.string().trim().max(120).nullable().optional(),
  eventName: z.enum(FIRST_PARTY_ANALYTICS_EVENTS),
  path: z.string().trim().max(600).nullable().optional(),
  title: z.string().trim().max(180).nullable().optional(),
  referrer: z.string().trim().max(600).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

export async function POST(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request, { allowMissingOrigin: true })) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsed = collectPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
    }

    const rate = await consumeRateLimit({
      key: `api:analytics:${parsed.data.anonymousId}`,
      limit: 120,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(rate);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many analytics events." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(rate.retryAfterSeconds)
          }
        }
      );
    }

    const result = await collectFirstPartyAnalytics({
      ...parsed.data,
      userAgent: request.headers.get("user-agent")
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    logServerError("first-party-analytics-collect-failed", error);
    return NextResponse.json({ stored: false }, { status: 202, headers });
  }
}
