import { constructStripeWebhookEvent } from "@/server/stripe";
import { processFounderStripeWebhookEvent } from "@/server/founder";
import { processStripeWebhookEvent } from "@/server/subscriptions";
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
  } catch (error) {
    logServerError("stripe-webhook-verification-failed", error);
    return new Response("Invalid Stripe webhook signature.", { status: 400 });
  }

  try {
    await processStripeWebhookEvent(event);
    await processFounderStripeWebhookEvent(event);
  } catch (error) {
    logServerError("stripe-webhook-processing-failed", error, {
      eventType: event.type
    });
    return new Response("Webhook processing error.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
