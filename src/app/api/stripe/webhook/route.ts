import { constructStripeWebhookEvent } from "@/server/stripe";
import { processCircleCardStripeWebhookEvent } from "@/server/circle-card";
import { logServerError } from "@/lib/security/logging";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { classifyCircleCardStripeEventOwnership } from "@/server/stripe/circle-card-webhook-ownership";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("Stripe webhook secret is not configured.", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature.", { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature, webhookSecret);
  } catch {
    // Do not pass Stripe's verification error through to logging. Parser errors can
    // contain excerpts of the raw request or signature header.
    logServerError(
      "stripe-webhook-verification-failed",
      new Error("Stripe webhook signature verification failed.")
    );
    return new Response("Invalid Stripe webhook signature.", { status: 400 });
  }

  try {
    if (getRuntimeBrand().key === "circle-card") {
      const ownership = await classifyCircleCardStripeEventOwnership(event);
      if (ownership !== "circle-card") {
        // This endpoint intentionally owns only Circle Card mutations. Acknowledge
        // signed non-owned/ambiguous events so Stripe does not retry forever; do
        // not lease the event or invoke any product handler.
        return new Response("ignored", { status: 200 });
      }

      const handledByCircleCard = await processCircleCardStripeWebhookEvent(event);
      if (!handledByCircleCard) {
        throw new Error("circle-card-webhook-ownership-invariant-failed");
      }
      return new Response("ok", { status: 200 });
    }

    const handledByCircleCard = await processCircleCardStripeWebhookEvent(event);
    if (handledByCircleCard) {
      return new Response("ok", { status: 200 });
    }

    const [{ processStripeWebhookEvent }, { processFounderStripeWebhookEvent }] =
      await Promise.all([
        import("@/server/subscriptions"),
        import("@/server/founder")
      ]);
    await processStripeWebhookEvent(event);
    await processFounderStripeWebhookEvent(event);
  } catch {
    // Processor errors may include request-derived values. Keep the operational
    // correlation fields while logging only a fixed classification.
    logServerError(
      "stripe-webhook-processing-failed",
      new Error("Stripe webhook processing failed."),
      {
        eventId: event.id,
        eventType: event.type
      }
    );
    return new Response("Webhook processing error.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
