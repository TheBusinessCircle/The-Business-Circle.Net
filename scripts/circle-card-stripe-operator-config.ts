export const CIRCLE_CARD_STRIPE_PRODUCT_KEY = "circle_card_pro";
export const CIRCLE_CARD_STRIPE_PRICE_KEY = "circle_card_pro_monthly_gbp";
export const CIRCLE_CARD_STRIPE_PORTAL_KEY = "circle_card_pro_portal";

export const CIRCLE_CARD_STRIPE_PRODUCT_NAME = "Circle Card Pro";
export const CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION =
  "Unlock the full working version of Circle Card with two professional identities, 25 active links, Circle Studio, Business Builder, Creator Media Kit, Audience Snapshot and expanded presentation tools.";
export const CIRCLE_CARD_STRIPE_PORTAL_NAME = "Circle Card Pro Portal";

export const CIRCLE_CARD_PRODUCTION_ORIGIN = "https://thebusinesscircle.net";
export const CIRCLE_CARD_PORTAL_RETURN_URL =
  `${CIRCLE_CARD_PRODUCTION_ORIGIN}/dashboard/circle-card`;
export const CIRCLE_CARD_PRIVACY_URL = `${CIRCLE_CARD_PRODUCTION_ORIGIN}/privacy-policy`;
export const CIRCLE_CARD_TERMS_URL = `${CIRCLE_CARD_PRODUCTION_ORIGIN}/terms-of-service`;
export const SHARED_STRIPE_WEBHOOK_URL = `${CIRCLE_CARD_PRODUCTION_ORIGIN}/api/stripe/webhook`;

export const SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "charge.refunded"
] as const;

export const CIRCLE_CARD_OPERATOR_ENV_KEYS = {
  billingEnabled: "CIRCLE_CARD_BILLING_ENABLED",
  secretKey: "STRIPE_SECRET_KEY",
  webhookSecret: "STRIPE_WEBHOOK_SECRET",
  productId: "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
  priceId: "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
  portalConfigurationId: "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID"
} as const;

export const CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS = {
  product: "circle-card-pro-live-product-v1",
  price: "circle-card-pro-live-monthly-gbp-price-v1",
  portal: "circle-card-pro-live-portal-v1",
  webhook: "circle-card-pro-live-shared-webhook-v1"
} as const;

export function requiredWebhookEventsPresent(events: readonly string[]) {
  if (events.includes("*")) return true;
  const configured = new Set(events);
  return SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS.every((event) => configured.has(event));
}

export function mergeWebhookEvents(events: readonly string[]) {
  if (events.includes("*")) return ["*"];
  return [...new Set([...events, ...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS])].sort();
}

export function maskStripeIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "[masked]";
  const prefix = trimmed.includes("_") ? `${trimmed.split("_")[0]}_` : "";
  return `${prefix}...${trimmed.slice(-4)}`;
}
