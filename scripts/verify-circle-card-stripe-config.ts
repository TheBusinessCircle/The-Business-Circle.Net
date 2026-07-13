import Stripe from "stripe";
import { CIRCLE_CARD_BILLING_ENV_NAMES, parseCircleCardBillingEnabled } from "./circle-card-billing-config";
import { loadLocalEnv } from "./load-env";
import { SHARED_STRIPE_WEBHOOK_URL } from "./circle-card-stripe-operator-config";
import { certifyCircleCardStripeConfiguration, type StripeMode } from "./circle-card-stripe-certification";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";
type Options = { envFile?: string; mode: StripeMode; ifEnabled: boolean };

function parseArgs(argv: string[]): Options {
  const options: Options = { mode: "live", ifEnabled: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--env-file") { options.envFile = argv[index + 1]; index += 1; continue; }
    if (argument === "--mode") {
      const mode = argv[index + 1];
      if (mode !== "live" && mode !== "test") throw new Error("--mode must be either live or test.");
      options.mode = mode; index += 1; continue;
    }
    if (argument === "--if-enabled") { options.ifEnabled = true; continue; }
    if (argument === "--help" || argument === "-h") {
      console.info("Read-only certification of the configured Circle Card product, monthly price, dedicated Portal, and shared webhook. Use --env-file and --mode live|test.");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function listAllWebhookEndpoints(stripe: Stripe) {
  const endpoints: Stripe.WebhookEndpoint[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.webhookEndpoints.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });
    endpoints.push(...page.data);
    if (!page.has_more) return endpoints;
    const last = page.data.at(-1);
    if (!last) throw new Error("Stripe webhook pagination did not advance.");
    startingAfter = last.id;
  } while (true);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadLocalEnv({ files: [options.envFile ?? ".env.production"] });
  if (options.ifEnabled && !parseCircleCardBillingEnabled()) {
    console.info("Circle Card billing is disabled; live Stripe certification was not required.");
    return;
  }

  const secretKey = requiredEnvironmentValue(CIRCLE_CARD_BILLING_ENV_NAMES.stripeSecretKey);
  const productId = requiredEnvironmentValue(CIRCLE_CARD_BILLING_ENV_NAMES.productId);
  const priceId = requiredEnvironmentValue(CIRCLE_CARD_BILLING_ENV_NAMES.monthlyPriceId);
  const portalId = requiredEnvironmentValue(CIRCLE_CARD_BILLING_ENV_NAMES.portalConfigurationId);
  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  const [product, price, portal, allWebhooks] = await Promise.all([
    stripe.products.retrieve(productId),
    stripe.prices.retrieve(priceId),
    stripe.billingPortal.configurations.retrieve(portalId),
    listAllWebhookEndpoints(stripe)
  ]);
  const webhooks = allWebhooks.filter((item) => item.url === SHARED_STRIPE_WEBHOOK_URL && item.status === "enabled");
  if (webhooks.length !== 1) throw new Error(`Expected one enabled shared production webhook; found ${webhooks.length}.`);
  const productDeleted = "deleted" in product && product.deleted;
  if (productDeleted) throw new Error("Configured Circle Card product is deleted.");

  const result = certifyCircleCardStripeConfiguration({
    secretKey,
    expectedMode: options.mode,
    expectedProductId: productId,
    expectedPriceId: priceId,
    expectedPortalConfigurationId: portalId,
    product: {
      id: product.id, name: product.name, description: product.description, active: product.active,
      livemode: product.livemode, metadata: product.metadata, deleted: false
    },
    price: {
      id: price.id, active: price.active, livemode: price.livemode, currency: price.currency,
      unitAmount: price.unit_amount, type: price.type, billingScheme: price.billing_scheme,
      recurring: price.recurring ? {
        interval: price.recurring.interval, intervalCount: price.recurring.interval_count,
        usageType: price.recurring.usage_type, trialPeriodDays: price.recurring.trial_period_days
      } : null,
      productId: typeof price.product === "string" ? price.product : price.product.id,
      metadata: price.metadata
    },
    portal: {
      id: portal.id, active: portal.active, livemode: portal.livemode,
      defaultReturnUrl: portal.default_return_url,
      privacyPolicyUrl: portal.business_profile.privacy_policy_url,
      termsOfServiceUrl: portal.business_profile.terms_of_service_url,
      paymentMethodUpdate: portal.features.payment_method_update.enabled,
      invoiceHistory: portal.features.invoice_history.enabled,
      subscriptionCancel: portal.features.subscription_cancel.enabled,
      cancellationMode: portal.features.subscription_cancel.mode,
      subscriptionUpdate: portal.features.subscription_update.enabled,
      allowedSubscriptionUpdates: portal.features.subscription_update.default_allowed_updates,
      metadata: portal.metadata ?? {}
    },
    webhook: {
      id: webhooks[0].id, url: webhooks[0].url, status: webhooks[0].status,
      livemode: webhooks[0].livemode, enabledEvents: webhooks[0].enabled_events
    }
  });

  for (const check of result.checks) console.info(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
  if (!result.ok) throw new Error("Circle Card Pro Stripe configuration certification failed.");
  console.info(`Circle Card Pro Stripe configuration is certified for ${result.mode} mode without creating Checkout or changing Stripe.`);
}

main().catch((error) => {
  console.error(`circle-card:billing:certify-stripe failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
