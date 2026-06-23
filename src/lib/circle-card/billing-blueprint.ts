import type { CircleCardPlanKey } from "@/lib/circle-card/plans";

export const CIRCLE_CARD_CHECKOUT_ROUTE_BLUEPRINT = "/api/stripe/circle-card/checkout";

export const CIRCLE_CARD_PRO_BILLING_ENV_VARS = [
  "CIRCLE_CARD_BILLING_ENABLED",
  "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
  "STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID"
] as const;

export const CIRCLE_CARD_BILLING_PERIODS = ["monthly", "annual"] as const;

export type CircleCardBillingPeriod = (typeof CIRCLE_CARD_BILLING_PERIODS)[number];

export type CircleCardCheckoutPlan = Extract<CircleCardPlanKey, "PRO">;

export const CIRCLE_CARD_CHECKOUT_METADATA_BLUEPRINT = [
  "userId",
  "circleCardPlan",
  "billingPeriod",
  "referralCode",
  "referralClickId",
  "referralSource",
  "source"
] as const;

export const CIRCLE_CARD_WEBHOOK_BLUEPRINT_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed"
] as const;

export function isCircleCardBillingPeriod(value: string): value is CircleCardBillingPeriod {
  return CIRCLE_CARD_BILLING_PERIODS.includes(value as CircleCardBillingPeriod);
}
