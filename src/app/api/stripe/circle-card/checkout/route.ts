import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CIRCLE_CARD_CHECKOUT_METADATA_BLUEPRINT,
  CIRCLE_CARD_CHECKOUT_ROUTE_BLUEPRINT
} from "@/lib/circle-card/billing-blueprint";
import {
  getCircleCardBillingReadiness,
  getCircleCardProBillingConfigurationErrorMessage,
  canUserStartCircleCardCheckout
} from "@/lib/circle-card/pricing";
import { requireApiUser } from "@/lib/auth/api";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import {
  CIRCLE_CARD_PRO_CAPABILITIES,
  CIRCLE_CARD_PRO_SOURCES,
  normalizeCircleCardProIntent
} from "@/lib/circle-card/pro-intent";
import { prisma } from "@/lib/prisma";
import { createCircleCardProCheckoutSession } from "@/server/circle-card";
import { measureCircleCardAction } from "@/server/circle-card/performance";
import { getRuntimeBrand } from "@/config/runtime-brand";

export const runtime = "nodejs";

const circleCardCheckoutPayloadSchema = z.object({
  intent: z.object({
    source: z.enum(CIRCLE_CARD_PRO_SOURCES),
    capability: z.enum(CIRCLE_CARD_PRO_CAPABILITIES),
    returnPath: z.string().max(600),
    cardId: z.string().max(64).optional()
  }).strict().optional()
}).strict();

async function handlePost(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "Untrusted request origin." },
        { status: 403 }
      );
    }

    const authResult = await requireApiUser({
      allowUnentitled: true,
      requireVerifiedEmail: true
    });
    if ("response" in authResult) {
      return authResult.response;
    }

    const checkoutRate = await consumeRateLimit({
      key: `api:stripe:circle-card:checkout:${authResult.user.id}`,
      limit: 5,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(checkoutRate);
    if (!checkoutRate.allowed) {
      return NextResponse.json(
        { error: "Too many Circle Card billing attempts. Please wait and try again." },
        {
          status: 429,
          headers: { ...headers, "Retry-After": String(checkoutRate.retryAfterSeconds) }
        }
      );
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = circleCardCheckoutPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: "Invalid Circle Card checkout payload. Plan and price are selected by the server." },
        { status: 400, headers }
      );
    }

    const intent = normalizeCircleCardProIntent(
      parsedPayload.data.intent,
      getRuntimeBrand().key
    );
    if (intent.cardId) {
      const ownedCard = await prisma.circleCard.findFirst({
        where: {
          id: intent.cardId,
          userId: authResult.user.id,
          archivedAt: null
        },
        select: { id: true }
      });
      if (!ownedCard) {
        return NextResponse.json(
          { error: "That Circle Card upgrade context is not available." },
          { status: 400, headers }
        );
      }
    }

    const readiness = getCircleCardBillingReadiness();
    if (!readiness.billingEnabled) {
      return NextResponse.json(
        {
          error: "Circle Card billing is not enabled.",
          billingEnabled: false,
          checkoutReady: false,
          route: CIRCLE_CARD_CHECKOUT_ROUTE_BLUEPRINT,
          message: "Register interest remains active. No Stripe Checkout session was created."
        },
        { status: 403, headers }
      );
    }

    const configurationError = getCircleCardProBillingConfigurationErrorMessage();

    if (configurationError) {
      return NextResponse.json(
        {
          error: configurationError,
          billingEnabled: true,
          checkoutReady: false
        },
        { status: 500, headers }
      );
    }

    if (!canUserStartCircleCardCheckout(authResult.user.id)) {
      return NextResponse.json(
        {
          error: "Circle Card billing is currently limited to the controlled operator account.",
          billingEnabled: true,
          checkoutReady: false
        },
        { status: 403, headers }
      );
    }

    const checkout = await createCircleCardProCheckoutSession({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      intent
    });

    return NextResponse.json({
      billingEnabled: true,
      checkoutReady: true,
      checkoutSessionCreated: !checkout.reused,
      checkoutSessionReused: checkout.reused,
      id: checkout.id,
      url: checkout.url,
      metadataKeys: CIRCLE_CARD_CHECKOUT_METADATA_BLUEPRINT
    }, { headers });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "circle-card-pro-already-active",
        "circle-card-pro-already-included",
        "circle-card-pro-existing-subscription",
        "circle-card-checkout-in-progress",
        "circle-card-checkout-persistence-conflict",
        "circle-card-reconciliation-conflict"
      ].includes(error.message)
    ) {
      return NextResponse.json(
        {
          error:
            error.message === "circle-card-checkout-in-progress"
              ? "Circle Card Checkout is already being prepared. Please try again in a moment."
              : error.message === "circle-card-pro-already-included"
                ? "Circle Card Pro is already included with your account access. No separate subscription is needed."
              : error.message === "circle-card-checkout-persistence-conflict"
                ? "Circle Card Checkout could not be tracked safely. Please try again in a moment."
              : error.message === "circle-card-reconciliation-conflict"
                ? "More than one Circle Card subscription needs review before Checkout can continue."
                : "A Circle Card subscription already exists. Open Manage Billing to continue safely."
        },
        { status: 409, headers }
      );
    }

    logServerError("circle-card-checkout-route-failed", error);
    return NextResponse.json(
      { error: "Stripe Checkout is temporarily unavailable. Please try again shortly." },
      { status: 502, headers }
    );
  }
}

export async function POST(request: Request) {
  return measureCircleCardAction(
    "checkout_requested",
    () => handlePost(request),
    request.headers.get("x-request-id")
  );
}
