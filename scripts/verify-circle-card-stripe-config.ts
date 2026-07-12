import Stripe from "stripe";
import {
  CIRCLE_CARD_BILLING_ENV_NAMES,
  parseCircleCardBillingEnabled
} from "./circle-card-billing-config";
import { loadLocalEnv } from "./load-env";
import {
  certifyCircleCardStripeConfiguration,
  type StripeMode
} from "./circle-card-stripe-certification";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";

type Options = {
  envFile?: string;
  mode: StripeMode;
  ifEnabled: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = { mode: "live", ifEnabled: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--env-file") {
      options.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--mode") {
      const mode = argv[index + 1];
      if (mode !== "live" && mode !== "test") {
        throw new Error("--mode must be either live or test.");
      }
      options.mode = mode;
      index += 1;
      continue;
    }

    if (argument === "--if-enabled") {
      options.ifEnabled = true;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      console.info(`Usage:
  npm run circle-card:billing:certify-stripe
  npm run circle-card:billing:certify-stripe -- --env-file .env.production --mode live
  npm run circle-card:billing:certify-stripe -- --env-file .env.test --mode test

This deliberate, read-only check retrieves the configured Stripe product and price. It never
creates or updates Stripe data. Live mode is required by default. --if-enabled skips certification
when CIRCLE_CARD_BILLING_ENABLED is false and is intended for the deployment safety gate.`);
      process.exit(0);
    }
  }

  return options;
}

function requiredEnvironmentValue(name: string) {
  const configuredValue = process.env[name]?.trim();
  if (!configuredValue) {
    throw new Error(`${name} is required.`);
  }
  return configuredValue;
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
  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

  const [product, price] = await Promise.all([
    stripe.products.retrieve(productId),
    stripe.prices.retrieve(priceId)
  ]);
  const priceProductId =
    typeof price.product === "string" ? price.product : price.product.id;
  const result = certifyCircleCardStripeConfiguration({
    secretKey,
    expectedMode: options.mode,
    expectedProductId: productId,
    expectedPriceId: priceId,
    product: {
      id: product.id,
      active: Boolean("active" in product && product.active),
      livemode: product.livemode,
      deleted: Boolean("deleted" in product && product.deleted)
    },
    price: {
      id: price.id,
      active: price.active,
      livemode: price.livemode,
      currency: price.currency,
      unitAmount: price.unit_amount,
      type: price.type,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count
          }
        : null,
      productId: priceProductId
    }
  });

  for (const check of result.checks) {
    console.info(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
  }

  if (!result.ok) {
    throw new Error("Circle Card Pro Stripe configuration certification failed.");
  }

  console.info(
    `Circle Card Pro Stripe configuration is certified for ${result.mode} mode: GBP 9.99 every month.`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`circle-card:billing:certify-stripe failed: ${message}`);
  process.exit(1);
});
