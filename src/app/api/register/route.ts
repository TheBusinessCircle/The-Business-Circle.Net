import { NextResponse } from "next/server";
import {
  createCircleCardFreeRegistration,
  createPendingRegistration,
  RegistrationServiceError
} from "@/lib/auth/register";
import { isCircleCardRegistrationSource } from "@/lib/circle-card/routes";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  createStripeCheckoutSessionForPendingRegistration,
  isBillingEnabled
} from "@/server/subscriptions";

export const runtime = "nodejs";

function omitPublicInviteCode(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const sanitized = { ...(payload as Record<string, unknown>) };
  delete sanitized.inviteCode;
  return sanitized;
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { error: "Untrusted request origin." },
      { status: 403 }
    );
  }

  const registerRate = await consumeRateLimit({
    key: `api:register:${clientIpFromHeaders(request.headers)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000
  });
  const headers = rateLimitHeaders(registerRate);

  if (!registerRate.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(registerRate.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const payload = await request.json();

    if (
      typeof payload === "object" &&
      payload !== null &&
      isCircleCardRegistrationSource((payload as { source?: string }).source)
    ) {
      const result = await createCircleCardFreeRegistration(payload);
      return NextResponse.json(
        {
          ok: true,
          redirectTo: result.redirectTo
        },
        { headers }
      );
    }

    const billingEnabled = isBillingEnabled();

    if (!billingEnabled) {
      return NextResponse.json(
        { error: "Stripe billing is not configured." },
        { status: 500, headers }
      );
    }

    const { pendingRegistration } = await createPendingRegistration(omitPublicInviteCode(payload));
    const checkoutSession = await createStripeCheckoutSessionForPendingRegistration({
      pendingRegistrationId: pendingRegistration.id,
      email: pendingRegistration.email,
      name: pendingRegistration.fullName,
      targetTier: pendingRegistration.selectedTier,
      billingInterval: pendingRegistration.billingInterval,
      coreAccessConfirmed: pendingRegistration.coreAccessConfirmed,
      inviteCode: null,
      acceptedTermsVersion: pendingRegistration.acceptedTermsVersion,
      acceptedRulesAt: pendingRegistration.acceptedRulesAt,
      acceptedRulesVersion: pendingRegistration.acceptedRulesVersion,
      acceptedAt: pendingRegistration.acceptedTermsAt,
      cancelPath: `/join?billing=cancelled&tier=${pendingRegistration.selectedTier}&period=${pendingRegistration.billingInterval}`
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url }, { headers });
  } catch (error) {
    if (error instanceof RegistrationServiceError) {
      const status =
        error.code === "INVALID_INPUT"
          ? 400
          : error.code === "EMAIL_IN_USE" || error.code === "PAYMENT_IN_PROGRESS"
            ? 409
            : 500;
      return NextResponse.json({ error: error.message }, { status, headers });
    }

    logServerError("register-route-failed", error);
    return NextResponse.json(
      { error: "Unable to start registration." },
      { status: 500, headers }
    );
  }
}
