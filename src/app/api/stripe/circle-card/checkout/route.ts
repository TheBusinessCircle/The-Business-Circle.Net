import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CIRCLE_CARD_CHECKOUT_METADATA_BLUEPRINT,
  CIRCLE_CARD_CHECKOUT_ROUTE_BLUEPRINT,
  isCircleCardBillingPeriod
} from "@/lib/circle-card/billing-blueprint";
import {
  getCircleCardBillingReadiness,
  getCircleCardProBillingConfigurationErrorMessage
} from "@/lib/circle-card/pricing";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { createCircleCardProCheckoutSession } from "@/server/circle-card";

export const runtime = "nodejs";

const circleCardCheckoutPayloadSchema = z.object({
  plan: z.literal("pro"),
  period: z.enum(["monthly", "annual"]),
  source: z.string().trim().max(80).optional()
});

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "Untrusted request origin." },
        { status: 403 }
      );
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = circleCardCheckoutPayloadSchema.safeParse(rawPayload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error: "Invalid Circle Card checkout payload.",
          expected: {
            plan: "pro",
            period: ["monthly", "annual"]
          }
        },
        { status: 400 }
      );
    }

    const readiness = getCircleCardBillingReadiness();

    if (!readiness.billingEnabled) {
      return NextResponse.json(
        {
          error: "Circle Card billing is not enabled.",
          billingEnabled: false,
          checkoutReady: false,
          route: CIRCLE_CARD_CHECKOUT_ROUTE_BLUEPRINT,
          message: "Register interest remains active. No Stripe Checkout session was created."
        },
        { status: 403 }
      );
    }

    const authResult = await requireApiUser({ allowUnentitled: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    const configurationError = getCircleCardProBillingConfigurationErrorMessage();

    if (configurationError) {
      return NextResponse.json(
        {
          error: configurationError,
          billingEnabled: true,
          checkoutReady: false
        },
        { status: 500 }
      );
    }

    if (!isCircleCardBillingPeriod(parsedPayload.data.period)) {
      return NextResponse.json({ error: "Invalid billing period." }, { status: 400 });
    }

    const checkout = await createCircleCardProCheckoutSession({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      billingPeriod: parsedPayload.data.period,
      source: parsedPayload.data.source
    });

    return NextResponse.json({
      billingEnabled: true,
      checkoutReady: true,
      checkoutSessionCreated: true,
      id: checkout.id,
      url: checkout.url,
      metadataKeys: CIRCLE_CARD_CHECKOUT_METADATA_BLUEPRINT
    });
  } catch (error) {
    if (error instanceof Error && error.message === "circle-card-pro-already-active") {
      return NextResponse.json(
        { error: "Circle Card Pro is already active for this account." },
        { status: 409 }
      );
    }

    logServerError("circle-card-checkout-route-failed", error);
    return NextResponse.json(
      { error: "Unable to create Circle Card Pro checkout session." },
      { status: 500 }
    );
  }
}
