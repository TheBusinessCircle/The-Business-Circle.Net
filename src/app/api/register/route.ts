import { NextRequest, NextResponse } from "next/server";
import {
  createCircleCardFreeRegistration,
  createPendingRegistration,
  RegistrationServiceError
} from "@/lib/auth/register";
import {
  CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID,
  CIRCLE_CARD_REFERRAL_COOKIE_CODE,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE,
  normalizeCircleCardReferralCode,
  normalizeCircleCardReferralSourceCardSlug
} from "@/lib/circle-card/referral-engine";
import { isCircleCardRegistrationSource } from "@/lib/circle-card/routes";
import { safeRedirectPath } from "@/lib/auth/utils";
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
import { attributeCircleCardReferralSignup } from "@/server/circle-card";

export const runtime = "nodejs";

function requestCookieValue(request: NextRequest, name: string) {
  const nextCookie = request.cookies?.get(name)?.value;

  if (nextCookie) {
    return nextCookie;
  }

  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return "";
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

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

export async function POST(request: NextRequest) {
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
      const response = NextResponse.json(
        {
          ok: true,
          redirectTo: result.redirectTo
        },
        { headers }
      );
      const payloadReferralCode = normalizeCircleCardReferralCode(
        (payload as { referralCode?: string }).referralCode
      );
      const payloadSourceCardSlug = normalizeCircleCardReferralSourceCardSlug(
        (payload as { sourceCardSlug?: string }).sourceCardSlug
      );
      const cookieReferralCode = requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_CODE);
      const referralCode =
        cookieReferralCode || payloadReferralCode || payloadSourceCardSlug;
      const referralClickId =
        cookieReferralCode || !payloadReferralCode
          ? requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID)
          : "";
      const payloadReturnTo = safeRedirectPath(
        (payload as { returnTo?: string }).returnTo,
        ""
      );
      const isSpinSignup =
        payloadReturnTo.startsWith("/card/") &&
        new URL(payloadReturnTo, "http://internal.local").searchParams.get("spin") === "return";
      const referralSource =
        (cookieReferralCode
          ? requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_SOURCE)
          : payloadReferralCode
            ? "signup_referral_code"
            : payloadSourceCardSlug
              ? isSpinSignup
                ? "spin_to_connect"
                : "public_card_ref"
              : "") ||
        "circle_card_signup";
      const sourceType = cookieReferralCode
        ? requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE)
        : payloadReferralCode
          ? "signup_referral_code"
          : payloadSourceCardSlug
            ? isSpinSignup
              ? "spin_to_connect"
              : "public_card_ref"
            : "";
      const sourceCardSlug =
        requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG) ||
        payloadSourceCardSlug;
      const sourceEvent =
        requestCookieValue(request, CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT) ||
        (isSpinSignup ? "SPIN_COMPLETED" : payloadSourceCardSlug ? "PUBLIC_CARD_SIGNUP" : "");

      if (referralCode || referralClickId) {
        try {
          const attribution = await attributeCircleCardReferralSignup({
            referredUserId: result.user.id,
            referralCode,
            referralClickId,
            referralSource,
            sourceType,
            sourceCardSlug,
            sourceEvent
          });

          if (
            attribution.attributed ||
            attribution.reason === "already-attributed" ||
            attribution.reason === "self-referral"
          ) {
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_CODE);
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID);
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE);
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE);
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG);
            response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT);
          }
        } catch (error) {
          // Account creation remains available if optional attribution infrastructure
          // is temporarily unavailable. The authenticated post-sign-in retry uses
          // the retained cookies and submitted source-card context.
          logServerError("circle-card-referral-attribution-failed", error);
        }
      }

      return response;
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
