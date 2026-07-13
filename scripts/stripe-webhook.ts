import Stripe from "stripe";
import { resolve } from "node:path";
import { updateEnvironmentFileSafely } from "./circle-card-env-file";
import {
  SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS,
  maskStripeIdentifier,
  mergeWebhookEvents,
  requiredWebhookEventsPresent
} from "./circle-card-stripe-operator-config";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";

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
  - preserves unrelated events on a shared endpoint
  - writes a new signing secret to the selected environment file without printing it
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
  const matchingEndpoints = existingEndpoints.data.filter((endpoint) => endpoint.url === webhookUrl);
  const enabledEndpoints = matchingEndpoints.filter((endpoint) => endpoint.status === "enabled");
  if (enabledEndpoints.length > 1) {
    throw new Error("Multiple enabled webhook endpoints use this exact URL; refusing to guess.");
  }
  const existingEndpoint = enabledEndpoints[0] ?? (matchingEndpoints.length === 1 ? matchingEndpoints[0] : null);
  if (!existingEndpoint && matchingEndpoints.length > 1) {
    throw new Error("Multiple disabled webhook endpoints use this exact URL; refusing to guess.");
  }

  if (existingEndpoint) {
    const needsUpdate = existingEndpoint.status !== "enabled" ||
      !requiredWebhookEventsPresent(existingEndpoint.enabled_events);

    if (needsUpdate) {
      await stripe.webhookEndpoints.update(existingEndpoint.id, {
        disabled: false,
        enabled_events: mergeWebhookEvents(existingEndpoint.enabled_events) as Stripe.WebhookEndpointUpdateParams.EnabledEvent[]
      });
      console.info(`Updated Stripe webhook endpoint ${maskStripeIdentifier(existingEndpoint.id)} without removing existing events.`);
    } else {
      console.info(`Stripe webhook endpoint already up to date: ${maskStripeIdentifier(existingEndpoint.id)}`);
    }

    console.info(`Endpoint URL: ${webhookUrl}`);
    console.info(
      "Signing secret is not returned for existing endpoints. View or roll it in Stripe Workbench, then update STRIPE_WEBHOOK_SECRET."
    );
    return;
  }

  if (!options.envFile) {
    throw new Error("--env-file is required before creating an endpoint so its signing secret can be stored safely.");
  }

  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS],
    description: "The Business Circle webhook"
  });

  console.info(`Created Stripe webhook endpoint ${maskStripeIdentifier(created.id)}`);
  console.info(`Endpoint URL: ${webhookUrl}`);

  if (created.secret) {
    updateEnvironmentFileSafely(resolve(options.envFile), { STRIPE_WEBHOOK_SECRET: created.secret });
    console.info("The new signing secret was written to the selected environment file without being printed.");
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
