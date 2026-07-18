import { NextResponse } from "next/server";
import { z } from "zod";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { appendCircleCardPortalReturnState } from "@/lib/circle-card/pro-intent";
import { getCircleCardRoutes } from "@/lib/circle-card/routes";
import { requireApiUser } from "@/lib/auth/api";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { createCircleCardBillingPortalSession } from "@/server/circle-card";
import { measureCircleCardAction } from "@/server/circle-card/performance";

export const runtime = "nodejs";

const portalPayloadSchema = z.object({
  returnPath: z.string().optional()
}).strict();

async function handlePost(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ allowUnentitled: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    const portalRate = await consumeRateLimit({
      key: `api:stripe:circle-card:portal:${authResult.user.id}`,
      limit: 10,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(portalRate);
    if (!portalRate.allowed) {
      return NextResponse.json(
        { error: "Too many billing portal requests. Please wait and try again." },
        {
          status: 429,
          headers: { ...headers, "Retry-After": String(portalRate.retryAfterSeconds) }
        }
      );
    }

    if (!authResult.user.email) {
      return NextResponse.json(
        { error: "Email is required to open Circle Card billing." },
        { status: 400, headers }
      );
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = portalPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid Circle Card billing portal payload." }, { status: 400, headers });
    }

    const runtimeBrand = getRuntimeBrand().key;
    const returnPath = appendCircleCardPortalReturnState(
      parsedPayload.data.returnPath ??
        `${getCircleCardRoutes(runtimeBrand).dashboard}?billing=portal-return`,
      runtimeBrand
    );
    const portalSession = await createCircleCardBillingPortalSession({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      returnPath
    });

    return NextResponse.json({ url: portalSession.url }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "circle-card-billing-relationship-not-found") {
      return NextResponse.json(
        { error: "No Circle Card billing relationship was found for this account." },
        { status: 404, headers }
      );
    }
    if (error instanceof Error && error.message === "circle-card-reconciliation-conflict") {
      return NextResponse.json(
        { error: "Circle Card billing needs review before the portal can be opened." },
        { status: 409, headers }
      );
    }
    logServerError("circle-card-portal-route-failed", error);
    return NextResponse.json(
      { error: "Stripe billing management is temporarily unavailable. Please try again shortly." },
      { status: 502, headers }
    );
  }
}

export async function POST(request: Request) {
  return measureCircleCardAction(
    "portal_opened",
    () => handlePost(request),
    request.headers.get("x-request-id")
  );
}
