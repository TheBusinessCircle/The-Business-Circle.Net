import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID,
  CIRCLE_CARD_REFERRAL_COOKIE_CODE,
  CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE,
  normalizeCircleCardReferralCode,
  normalizeCircleCardReferralSourceCardSlug,
  normalizeCircleCardReferralSourceType,
  shouldStoreCircleCardReferralAttribution
} from "@/lib/circle-card/referral-engine";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  recordCircleCardReferralClick,
  recordCircleCardReferralDiscoveryFromCard
} from "@/server/circle-card";

export const runtime = "nodejs";

type ReferralAttributionPayload = {
  referralCode?: unknown;
  sourceType?: unknown;
  sourceCardSlug?: unknown;
  sourceEvent?: unknown;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cookieOptions(request: NextRequest) {
  return {
    path: "/",
    maxAge: CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:"
  };
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { stored: false, reason: "untrusted-origin" },
      { status: 403 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as ReferralAttributionPayload;
  const referralCode = normalizeCircleCardReferralCode(safeString(payload.referralCode));
  const sourceCardSlug = normalizeCircleCardReferralSourceCardSlug(
    safeString(payload.sourceCardSlug)
  );
  const sourceType =
    normalizeCircleCardReferralSourceType(safeString(payload.sourceType)) ??
    (referralCode ? "public_card_ref" : "last_safe_source");
  const sourceEvent = safeString(payload.sourceEvent).trim().slice(0, 80);
  const existingSourceType = normalizeCircleCardReferralSourceType(
    request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE)?.value
  );
  const hasExistingAttribution = Boolean(
    request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_CODE)?.value ||
      request.cookies.get(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID)?.value
  );
  const shouldStore = shouldStoreCircleCardReferralAttribution({
    hasExistingAttribution,
    nextSourceType: sourceType,
    hasExplicitReferralCode: Boolean(referralCode)
  });

  if (!shouldStore) {
    return NextResponse.json({
      stored: false,
      reason: "existing-attribution",
      existingSourceType
    });
  }

  const session = await auth();
  const visitorId = request.cookies.get("bcn_anon_id")?.value ?? null;
  const userAgent = request.headers.get("user-agent");
  const requestedPath = request.headers.get("referer") ?? request.nextUrl.pathname;
  const referral = referralCode
    ? await recordCircleCardReferralClick({
        code: referralCode,
        source: sourceType,
        sourceType,
        sourceCardSlug,
        sourceEvent: sourceEvent || "PUBLIC_CARD_REF_VISIT",
        visitorId,
        viewerUserId: session?.user?.id ?? null,
        userAgent,
        requestedPath
      })
    : sourceCardSlug
      ? await recordCircleCardReferralDiscoveryFromCard({
          cardSlug: sourceCardSlug,
          source: sourceType,
          sourceType,
          sourceEvent: sourceEvent || "CARD_DISCOVERY",
          visitorId,
          viewerUserId: session?.user?.id ?? null,
          userAgent,
          requestedPath
        })
      : null;

  if (!referral) {
    return NextResponse.json({ stored: false, reason: "missing-referrer" });
  }

  const response = NextResponse.json({
    stored: true,
    referralCode: referral.referralCode,
    sourceType
  });
  const options = cookieOptions(request);

  response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_CODE, referral.referralCode, options);
  response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID, referral.id, options);
  response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE, sourceType, options);
  response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE, sourceType, options);

  if (sourceCardSlug) {
    response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG, sourceCardSlug, options);
  } else {
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG);
  }

  if (sourceEvent) {
    response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT, sourceEvent, options);
  } else {
    response.cookies.delete(CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT);
  }

  return response;
}
