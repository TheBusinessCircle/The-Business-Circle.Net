import Stripe from "stripe";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded"
] as const;

type Options = {
  url?: string;
  envFile?: string;
};

function loadEnvFileIfAvailable(filePath: string) {
  const loadEnvFile = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (typeof loadEnvFile === "function") {
    loadEnvFile(filePath);
  }
}

function parseArgs(argv: string[]): Options {
  const options: Options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url") {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--env-file") {
      options.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.info(`Usage:
  npm run stripe:webhook:upsert -- --url https://your-domain
  npm run stripe:webhook:upsert -- --env-file .env.production --url https://your-domain

Behavior:
  - creates / updates the Stripe webhook endpoint for this app
  - uses APP_URL when --url is omitted
  - prints the webhook signing secret only when creating a brand new endpoint
`);
}

function resolveWebhookUrl(options: Options) {
  const baseUrl = options.url?.trim() || process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  if (!baseUrl) {
    throw new Error("Missing webhook base URL. Pass --url or set APP_URL.");
  }

  return new URL("/api/stripe/webhook", baseUrl).toString();
}

function ensureStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return secretKey;
}

function compareEventSets(left: readonly string[], right: readonly string[]) {
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return JSON.stringify(leftSorted) === JSON.stringify(rightSorted);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFileIfAvailable(options.envFile ?? ".env");

  const secretKey = ensureStripeSecretKey();
  const webhookUrl = resolveWebhookUrl(options);
  const isLiveMode = secretKey.startsWith("sk_live_");

  if (isLiveMode && !webhookUrl.startsWith("https://")) {
    throw new Error("Live Stripe webhooks require an https:// endpoint URL.");
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION
  });

  const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existingEndpoint = existingEndpoints.data.find((endpoint) => endpoint.url === webhookUrl);

  if (existingEndpoint) {
    const needsUpdate =
      !compareEventSets(existingEndpoint.enabled_events, WEBHOOK_EVENTS) ||
      existingEndpoint.description !== "The Business Circle webhook";

    if (needsUpdate) {
      await stripe.webhookEndpoints.update(existingEndpoint.id, {
        enabled_events: [...WEBHOOK_EVENTS],
        description: "The Business Circle webhook"
      });
      console.info(`Updated Stripe webhook endpoint ${existingEndpoint.id}`);
    } else {
      console.info(`Stripe webhook endpoint already up to date: ${existingEndpoint.id}`);
    }

    console.info(`Endpoint URL: ${webhookUrl}`);
    console.info(
      "Signing secret is not returned for existing endpoints. View or roll it in Stripe Workbench, then update STRIPE_WEBHOOK_SECRET."
    );
    return;
  }

  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [...WEBHOOK_EVENTS],
    description: "The Business Circle webhook"
  });

  console.info(`Created Stripe webhook endpoint ${created.id}`);
  console.info(`Endpoint URL: ${webhookUrl}`);

  if (created.secret) {
    console.info(`Webhook signing secret: ${created.secret}`);
    console.info("Copy that value into STRIPE_WEBHOOK_SECRET.");
  } else {
    console.info(
      "Stripe did not return a signing secret. Open the endpoint in Stripe Workbench and reveal the secret, then set STRIPE_WEBHOOK_SECRET."
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`stripe:webhook:upsert failed: ${message}`);
  process.exit(1);
});
