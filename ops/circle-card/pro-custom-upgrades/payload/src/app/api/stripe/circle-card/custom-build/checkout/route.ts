import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { getCircleCardBillingReadiness, canUserStartCircleCardCheckout } from "@/lib/circle-card/pricing";
import { isTrustedOrigin } from "@/lib/security/origin";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { createCustomBuildCheckout, customBuildCheckoutSchema, CustomBuildError } from "@/server/circle-card/custom-build.service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const auth = await requireApiUser({ allowUnentitled: true, requireVerifiedEmail: true });
  if ("response" in auth) return auth.response;
  const rate = await consumeRateLimit({ key: `custom-build:${auth.user.id}`, limit: 5, windowMs: 600000 });
  const headers = rateLimitHeaders(rate);
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before trying checkout again." }, { status: 429, headers });
  const readiness = getCircleCardBillingReadiness();
  if (!readiness.billingEnabled || !readiness.proLaunchConfigured || !canUserStartCircleCardCheckout(auth.user.id)) {
    return NextResponse.json({ error: "Payments are not available for this account yet." }, { status: 403, headers });
  }
  const input = customBuildCheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a card, add a brief of at least 20 characters and accept the design terms." }, { status: 400, headers });
  try {
    return NextResponse.json(await createCustomBuildCheckout(auth.user, input.data), { headers });
  } catch (error) {
    if (error instanceof CustomBuildError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    logServerError("circle-card-custom-build-checkout-failed", error);
    return NextResponse.json({ error: "Checkout could not be prepared. Please try again." }, { status: 502, headers });
  }
}
