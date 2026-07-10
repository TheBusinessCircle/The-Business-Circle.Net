import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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
import { safeRedirectPath } from "@/lib/auth/utils";
import { isTrustedOrigin } from "@/lib/security/origin";
import { attributeCircleCardReferralSignup } from "@/server/circle-card/referral-engine.service";

export const runtime = "nodejs";

type SignupAttributionPayload = {
  referralCode?: unknown;
  sourceCardSlug?: unknown;
  returnTo?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ attributed: false, reason: "untrusted-origin" }, { status: 403 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ attributed: false, reason: "authentication-required" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as SignupAttributionPayload;
  const payloadReferralCode = normalizeCircleCardReferralCode(
    stringValue(payload.referralCode)
  );
  const payloadSourceCardSlug = normalizeCircleCardReferralSourceCardSlug(
    stringValue(payload.sourceCardSlug)
  );
  const cookieReferralCode = request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_CODE)?.value ?? "";
  const referralCode = cookieReferralCode || payloadReferralCode || payloadSourceCardSlug;
  const referralClickId =
    cookieReferralCode || !payloadReferralCode
      ? request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID)?.value ?? ""
      : "";

  if (!referralCode && !referralClickId) {
    return NextResponse.json({ attributed: false, reason: "missing-referrer" });
  }

  const returnTo = safeRedirectPath(stringValue(payload.returnTo), "");
  const isSpinSignup =
    returnTo.startsWith("/card/") &&
    new URL(returnTo, "http://internal.local").searchParams.get("spin") === "return";
  const sourceCardSlug =
    request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG)?.value ||
    payloadSourceCardSlug;
  const sourceType =
    request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE)?.value ||
    (payloadReferralCode
      ? "signup_referral_code"
      : payloadSourceCardSlug
        ? isSpinSignup
          ? "spin_to_connect"
          : "public_card_ref"
        : "");
  const result = await attributeCircleCardReferralSignup({
    referredUserId: session.user.id,
    referralCode,
    referralClickId,
    referralSource:
      request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE)?.value ||
      sourceType ||
      "circle_card_signup",
    sourceType,
    sourceCardSlug,
    sourceEvent:
      request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT)?.value ||
      (isSpinSignup ? "SPIN_COMPLETED" : "PUBLIC_CARD_SIGNUP")
  });
  const response = NextResponse.json(result);

  if (
    result.attributed ||
    result.reason === "already-attributed" ||
    result.reason === "self-referral"
  ) {
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_CODE);
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID);
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE);
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE);
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG);
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT);
  }

  return response;
}
