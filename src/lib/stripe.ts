import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia"
    })
  : null;
