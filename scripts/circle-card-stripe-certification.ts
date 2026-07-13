import {
  CIRCLE_CARD_PORTAL_RETURN_URL,
  CIRCLE_CARD_PRIVACY_URL,
  CIRCLE_CARD_STRIPE_PORTAL_KEY,
  CIRCLE_CARD_STRIPE_PORTAL_NAME,
  CIRCLE_CARD_STRIPE_PRICE_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION,
  CIRCLE_CARD_STRIPE_PRODUCT_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_NAME,
  CIRCLE_CARD_TERMS_URL,
  SHARED_STRIPE_WEBHOOK_URL,
  requiredWebhookEventsPresent
} from "./circle-card-stripe-operator-config";

export type StripeMode = "live" | "test";

export type CircleCardStripeProductSnapshot = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  livemode: boolean;
  metadata: Record<string, string>;
  deleted?: boolean;
};

export type CircleCardStripePriceSnapshot = {
  id: string;
  active: boolean;
  livemode: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  billingScheme: string;
  recurring: {
    interval: string;
    intervalCount: number;
    usageType: string;
    trialPeriodDays: number | null;
  } | null;
  productId: string;
  metadata: Record<string, string>;
};

export type CircleCardStripePortalSnapshot = {
  id: string;
  active: boolean;
  livemode: boolean;
  defaultReturnUrl: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  paymentMethodUpdate: boolean;
  invoiceHistory: boolean;
  subscriptionCancel: boolean;
  cancellationMode: string;
  subscriptionUpdate: boolean;
  allowedSubscriptionUpdates: string[];
  metadata: Record<string, string>;
};

export type CircleCardStripeWebhookSnapshot = {
  id: string;
  url: string;
  status: string;
  livemode: boolean;
  enabledEvents: string[];
};

export type CircleCardStripeCertificationInput = {
  secretKey: string;
  expectedMode: StripeMode;
  expectedProductId: string;
  expectedPriceId: string;
  expectedPortalConfigurationId: string;
  product: CircleCardStripeProductSnapshot;
  price: CircleCardStripePriceSnapshot;
  portal: CircleCardStripePortalSnapshot;
  webhook: CircleCardStripeWebhookSnapshot;
};

export type CircleCardStripeCertificationResult = {
  ok: boolean;
  mode: StripeMode | "unknown";
  checks: Array<{ name: string; ok: boolean; message: string }>;
};

function secretKeyMode(secretKey: string): StripeMode | "unknown" {
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return "unknown";
}

export function certifyCircleCardStripeConfiguration(
  input: CircleCardStripeCertificationInput
): CircleCardStripeCertificationResult {
  const mode = secretKeyMode(input.secretKey);
  const expectedLivemode = input.expectedMode === "live";
  const checks: CircleCardStripeCertificationResult["checks"] = [];
  const check = (name: string, ok: boolean, message: string) => checks.push({ name, ok, message });

  check("secret-key-mode", mode === input.expectedMode, `Stripe key mode must be ${input.expectedMode}.`);
  check("product-id", input.product.id === input.expectedProductId, "Configured product was retrieved.");
  check("product-exists", !input.product.deleted, "Circle Card Pro product exists.");
  check("product-active", input.product.active, "Circle Card Pro product is active.");
  check("product-mode", input.product.livemode === expectedLivemode, "Product mode matches.");
  check("product-name", input.product.name === CIRCLE_CARD_STRIPE_PRODUCT_NAME, "Product name matches.");
  check("product-description", input.product.description === CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION, "Product description matches.");
  check("product-key", input.product.metadata.product_key === CIRCLE_CARD_STRIPE_PRODUCT_KEY, "Product stable key matches.");

  check("price-id", input.price.id === input.expectedPriceId, "Configured price was retrieved.");
  check("price-active", input.price.active, "Monthly price is active.");
  check("price-mode", input.price.livemode === expectedLivemode, "Price mode matches.");
  check("price-currency", input.price.currency.toLowerCase() === "gbp", "Price currency is GBP.");
  check("price-amount", input.price.unitAmount === 999, "Price is 999 pence (£9.99).");
  check("price-recurring", input.price.type === "recurring" && input.price.recurring !== null, "Price is recurring.");
  check("price-flat-rate", input.price.billingScheme === "per_unit", "Price uses flat-rate per-unit billing.");
  check("price-monthly-interval", input.price.recurring?.interval === "month" && input.price.recurring.intervalCount === 1, "Price recurs every month.");
  check("price-licensed", input.price.recurring?.usageType === "licensed", "Price quantity mode is licensed.");
  check("price-no-trial", input.price.recurring?.trialPeriodDays == null, "Price has no trial.");
  check("price-product-link", input.price.productId === input.expectedProductId, "Price belongs to the configured product.");
  check("price-key", input.price.metadata.price_key === CIRCLE_CARD_STRIPE_PRICE_KEY, "Price stable key matches.");

  check("portal-id", input.portal.id === input.expectedPortalConfigurationId, "Configured Portal was retrieved.");
  check("portal-active", input.portal.active, "Circle Card Portal is active.");
  check("portal-mode", input.portal.livemode === expectedLivemode, "Portal mode matches.");
  check("portal-return-url", input.portal.defaultReturnUrl === CIRCLE_CARD_PORTAL_RETURN_URL, "Portal return URL matches.");
  check("portal-legal-urls", input.portal.privacyPolicyUrl === CIRCLE_CARD_PRIVACY_URL && input.portal.termsOfServiceUrl === CIRCLE_CARD_TERMS_URL, "Portal legal URLs match.");
  check("portal-features", input.portal.paymentMethodUpdate && input.portal.invoiceHistory && input.portal.subscriptionCancel, "Required Portal features are enabled.");
  check("portal-cancellation", input.portal.cancellationMode === "at_period_end", "Cancellation is at period end.");
  check("portal-no-switching", !input.portal.subscriptionUpdate && input.portal.allowedSubscriptionUpdates.length === 0, "Plan and quantity switching are disabled.");
  check("portal-key", input.portal.metadata.configuration_key === CIRCLE_CARD_STRIPE_PORTAL_KEY && input.portal.metadata.display_name === CIRCLE_CARD_STRIPE_PORTAL_NAME, "Portal stable identity matches.");

  check("webhook-url", input.webhook.url === SHARED_STRIPE_WEBHOOK_URL, "Shared webhook URL matches.");
  check("webhook-enabled", input.webhook.status === "enabled", "Shared webhook is enabled.");
  check("webhook-mode", input.webhook.livemode === expectedLivemode, "Webhook mode matches.");
  check("webhook-event-superset", requiredWebhookEventsPresent(input.webhook.enabledEvents), "All required events are present; additional BCN events are allowed.");

  return { ok: checks.every((item) => item.ok), mode, checks };
}
