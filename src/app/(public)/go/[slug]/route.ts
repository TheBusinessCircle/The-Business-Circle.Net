import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestGuard, json } from "@/lib/bcn-v2/http";
import { safeAffiliateDestination } from "@/lib/bcn-v2/validation";
import {
  hasConsentForCategory,
  parseCookieConsentFromCookieString,
} from "@/lib/cookie-consent";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const blocked = await requestGuard(request, "affiliate", 100, true);
  if (blocked) return blocked;
  const { slug } = await params;
  try {
    const offer = await prisma.bcnAffiliateOffer.findUnique({
      where: { slug },
    });
    const destination = offer && safeAffiliateDestination(offer);
    if (!offer || !destination)
      return json({ error: "Offer unavailable." }, 404);
    if (
      hasConsentForCategory(
        parseCookieConsentFromCookieString(request.headers.get("cookie") || ""),
        "analytics",
      )
    )
      await prisma.bcnAffiliateClick.create({ data: { offerId: offer.id } });
    return NextResponse.redirect(destination, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return json({ error: "Offer temporarily unavailable." }, 503);
  }
}
