import { NextResponse } from "next/server";
import { createMemberAccount, RegistrationServiceError } from "@/lib/auth/register";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  createStripeCheckoutSessionForUser,
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
    const { user, selectedTier } = await createMemberAccount(payload, {
      stripeEnabled: billingEnabled
    });

    if (!billingEnabled) {
      return NextResponse.json({ ok: true }, { headers });
    }

    const checkoutSession = await createStripeCheckoutSessionForUser({
      userId: user.id,
      email: user.email,
      name: user.name,
      targetTier: selectedTier,
      successPath: "/dashboard?billing=success&source=join",
      cancelPath: `/join?billing=cancelled&tier=${selectedTier}`
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url }, { headers });
  } catch (error) {
    if (error instanceof RegistrationServiceError) {
      const status =
        error.code === "INVALID_INPUT"
          ? 400
          : error.code === "EMAIL_IN_USE"
            ? 409
            : 500;
      return NextResponse.json({ error: error.message }, { status, headers });
    }

    logServerError("register-route-failed", error);
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500, headers }
    );
  }
}
