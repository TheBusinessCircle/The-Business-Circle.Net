import { constructStripeWebhookEvent } from "@/server/stripe";
import { processFounderStripeWebhookEvent } from "@/server/founder";
import { processStripeWebhookEvent } from "@/server/subscriptions";
import { processCircleCardStripeWebhookEvent } from "@/server/circle-card";
import { logServerError } from "@/lib/security/logging";

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
    const handledByCircleCard = await processCircleCardStripeWebhookEvent(event);
    if (handledByCircleCard) {
      return new Response("ok", { status: 200 });
    }

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
