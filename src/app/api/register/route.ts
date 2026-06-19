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
import { buildJoinConfirmationHref } from "@/lib/join/routing";
import {
  createStripeCheckoutSessionForPendingRegistration,
  getBillingConfigurationErrorMessage,
  isBillingEnabled
} from "@/server/subscriptions";

export const runtime = "nodejs";

function checkoutCodeErrorMessage(code: string) {
  if (code === "invite-code-limit-reached") {
    return "This founding access code has already been fully claimed.";
  }

  if (code === "invite-code-tier-ineligible") {
    return "This founding access code is not valid for the selected membership tier.";
  }

  if (code.startsWith("invite-code-")) {
    return "This founding access code is not active.";
  }

  if (code === "launch-code-full") {
    return "This Founder Access code has now reached its limit. You can still join on the standard membership price.";
  }

  if (code === "launch-code-invalid") {
    return "That Founder Access code is not valid. Please check it and try again.";
  }

  if (code === "launch-code-already-used") {
    return "This Founder Access code has already been used for this account.";
  }

  if (code.startsWith("launch-code-")) {
    return "This Founder Access code is no longer active. You can still join on the standard membership price.";
  }

  return null;
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

    const billingConfigurationError = getBillingConfigurationErrorMessage();

    if (billingConfigurationError || !isBillingEnabled()) {
      return NextResponse.json(
        { error: billingConfigurationError ?? "Stripe billing is not configured." },
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
      cancelPath: buildJoinConfirmationHref({
        billing: "cancelled",
        tier: pendingRegistration.selectedTier,
        period: pendingRegistration.billingInterval,
        invite: pendingRegistration.inviteCode ?? undefined
      })
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

    if (error instanceof Error) {
      const codeError = checkoutCodeErrorMessage(error.message);

      if (codeError) {
        return NextResponse.json({ error: codeError }, { status: 400, headers });
      }
    }

    logServerError("register-route-failed", error);
    return NextResponse.json(
      { error: "Unable to start registration." },
      { status: 500, headers }
    );
  }
}
