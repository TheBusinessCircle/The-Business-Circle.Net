import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID,
  CIRCLE_CARD_REFERRAL_COOKIE_CODE,
  CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS,
  CIRCLE_CARD_REFERRAL_COOKIE_SOURCE,
  normalizeCircleCardReferralCode
} from "@/lib/circle-card/referral-engine";
import { recordCircleCardReferralClick } from "@/server/circle-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReferralRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

function referralDestination(request: NextRequest, code?: string | null) {
  const destination = new URL("/circle-card", request.url);

  if (code) {
    destination.searchParams.set("referredBy", code);
  }

  return destination;
}

export async function GET(request: NextRequest, { params }: ReferralRouteProps) {
  const { code } = await params;
  const referralCode = normalizeCircleCardReferralCode(code);
  const source = request.nextUrl.searchParams.get("source") || "referral_link";
  const visitorId = request.cookies.get("bcn_anon_id")?.value ?? null;
  const session = await auth();
  const referral = referralCode
    ? await recordCircleCardReferralClick({
        code: referralCode,
        source,
        visitorId,
        viewerUserId: session?.user?.id ?? null,
        userAgent: request.headers.get("user-agent"),
        requestedPath: request.nextUrl.pathname
      })
    : null;

  const response = NextResponse.redirect(
    referralDestination(request, referral?.referralCode ?? referralCode)
  );

  if (referral) {
    const cookieOptions = {
      path: "/",
      maxAge: CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax" as const,
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:"
    };

    response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_CODE, referral.referralCode, cookieOptions);
    response.cookies.set(CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID, referral.id, cookieOptions);
    response.cookies.set(
      CIRCLE_CARD_REFERRAL_COOKIE_SOURCE,
      source.slice(0, 80),
      cookieOptions
    );
  }

  return response;
}
