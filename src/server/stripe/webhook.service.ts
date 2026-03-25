import Stripe from "stripe";
import { requireStripeClient } from "@/server/stripe/client";

export function constructStripeWebhookEvent(payload: string, signature: string, secret: string): Stripe.Event {
  const stripe = requireStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}