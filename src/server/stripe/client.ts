import { stripe } from "@/lib/stripe";

export function requireStripeClient() {
  if (!stripe) {
    throw new Error("Stripe client is not configured. Set STRIPE_SECRET_KEY.");
  }

  return stripe;
}