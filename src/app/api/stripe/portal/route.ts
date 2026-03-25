import { NextResponse } from "next/server";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireApiUser } from "@/lib/auth/api";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  createStripeBillingPortalSessionForUser,
  isBillingEnabled
} from "@/server/subscriptions";

export const runtime = "nodejs";

const portalPayloadSchema = z.object({
  intent: z.enum(["manage", "downgrade"]).optional(),
  returnPath: z.string().optional()
});

export async function POST(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "Untrusted request origin." },
        { status: 403 }
      );
    }

    const authResult = await requireApiUser({ allowUnentitled: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    const portalRate = await consumeRateLimit({
      key: `api:stripe:portal:${authResult.user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(portalRate);

    if (!portalRate.allowed) {
      return NextResponse.json(
        { error: "Too many billing portal requests. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(portalRate.retryAfterSeconds)
          }
        }
      );
    }

    if (!isBillingEnabled()) {
      return NextResponse.json(
        { error: "Stripe billing is not configured." },
        { status: 500, headers }
      );
    }

    if (!authResult.user.email) {
      return NextResponse.json(
        { error: "Email is required to open billing portal." },
        { status: 400, headers }
      );
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = portalPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid billing portal payload." }, { status: 400, headers });
    }

    const intent = parsedPayload.data.intent ?? "manage";
    const fallbackReturnPath =
      intent === "downgrade"
        ? "/dashboard?billing=portal-return&intent=downgrade"
        : "/dashboard?billing=portal-return";
    const returnPath = safeRedirectPath(parsedPayload.data.returnPath, fallbackReturnPath);

    const portalSession = await createStripeBillingPortalSessionForUser({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      returnPath
    });

    return NextResponse.json({ url: portalSession.url }, { headers });
  } catch (error) {
    logServerError("stripe-portal-route-failed", error);
    return NextResponse.json(
      { error: "Unable to create billing portal session." },
      { status: 500, headers }
    );
  }
}
