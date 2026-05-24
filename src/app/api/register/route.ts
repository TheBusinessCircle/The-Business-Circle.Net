import { NextResponse } from "next/server";
import { createPendingRegistration, RegistrationServiceError } from "@/lib/auth/register";
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
    const billingEnabled = isBillingEnabled();

    if (!billingEnabled) {
      return NextResponse.json(
        { error: "Stripe billing is not configured." },
        { status: 500, headers }
      );
    }

    const { pendingRegistration } = await createPendingRegistration(payload);
    const checkoutSession = await createStripeCheckoutSessionForPendingRegistration({
      pendingRegistrationId: pendingRegistration.id,
      email: pendingRegistration.email,
      name: pendingRegistration.fullName,
      targetTier: pendingRegistration.selectedTier,
      billingInterval: pendingRegistration.billingInterval,
      coreAccessConfirmed: pendingRegistration.coreAccessConfirmed,
      inviteCode: pendingRegistration.inviteCode,
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

    if (error instanceof Error && error.message.startsWith("invite-code-")) {
      return NextResponse.json(
        { error: "This founding access code is no longer available for checkout." },
        { status: 409, headers }
      );
    }

    if (error instanceof Error && error.message.startsWith("launch-code-")) {
      const errorMessage =
        error.message === "launch-code-already-used"
          ? "This Founder Access code has already been used for this account."
          : error.message === "launch-code-full"
            ? "This Founder Access code has now reached its limit. You can still join on the standard membership price."
            : error.message === "launch-code-invalid"
              ? "That Founder Access code is not valid. Please check it and try again."
              : "This Founder Access code is no longer active. You can still join on the standard membership price.";
      return NextResponse.json({ error: errorMessage }, { status: 409, headers });
    }

    logServerError("register-route-failed", error);
    return NextResponse.json(
      { error: "Unable to start registration." },
      { status: 500, headers }
    );
  }
}
