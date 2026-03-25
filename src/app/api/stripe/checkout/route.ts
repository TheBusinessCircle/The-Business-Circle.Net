import { MembershipTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getMembershipTierRank } from "@/config/membership";
import { requireApiUser } from "@/lib/auth/api";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  createStripeBillingPortalSessionForUser,
  createStripeCheckoutSessionForUser,
  isBillingEnabled,
  updateStripeSubscriptionPlanForUser
} from "@/server/subscriptions";
import { roleToTier } from "@/lib/permissions";

export const runtime = "nodejs";

const checkoutPayloadSchema = z.object({
  tier: z.nativeEnum(MembershipTier).optional(),
  source: z.enum(["membership", "join", "dashboard"]).optional()
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

    const checkoutRate = await consumeRateLimit({
      key: `api:stripe:checkout:${authResult.user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(checkoutRate);

    if (!checkoutRate.allowed) {
      return NextResponse.json(
        { error: "Too many billing attempts. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(checkoutRate.retryAfterSeconds)
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

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = checkoutPayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400, headers });
    }

    const targetTier = parsedPayload.data.tier ?? MembershipTier.FOUNDATION;
    const source = parsedPayload.data.source ?? "dashboard";
    const currentTier = roleToTier(authResult.user.role, authResult.user.membershipTier);
    const currentTierRank = getMembershipTierRank(currentTier);
    const targetTierRank = getMembershipTierRank(targetTier);

    const successPath =
      source === "join"
        ? "/dashboard?billing=success&source=join"
        : source === "membership"
          ? "/dashboard?billing=success&source=membership"
          : "/dashboard?billing=success";
    const cancelPath =
      source === "join"
        ? `/join?billing=cancelled&tier=${targetTier}`
        : source === "dashboard"
          ? "/dashboard?billing=cancelled"
          : "/membership?billing=cancelled";

    if (!authResult.user.email) {
      return NextResponse.json(
        { error: "Email is required to create a billing session." },
        { status: 400, headers }
      );
    }

    if (
      authResult.user.hasActiveSubscription &&
      targetTierRank < currentTierRank
    ) {
      const portalSession = await createStripeBillingPortalSessionForUser({
        userId: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        returnPath: `/dashboard?billing=portal-return&intent=downgrade&tier=${targetTier}`
      });

      return NextResponse.json({ url: portalSession.url }, { headers });
    }

    if (
      authResult.user.hasActiveSubscription &&
      targetTierRank > currentTierRank
    ) {
      const updated = await updateStripeSubscriptionPlanForUser({
        userId: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        targetTier
      });

      return NextResponse.json({ url: updated.url }, { headers });
    }

    const session = await createStripeCheckoutSessionForUser({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      targetTier,
      successPath,
      cancelPath,
      allowFoundingOffer: !authResult.user.hasActiveSubscription
    });

    return NextResponse.json({ url: session.url }, { headers });
  } catch (error) {
    logServerError("stripe-checkout-route-failed", error);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 500, headers }
    );
  }
}

