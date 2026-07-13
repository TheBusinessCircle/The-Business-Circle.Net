import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { updateEnvironmentFileSafely, readEnvironmentValues } from "./circle-card-env-file";
import {
  CIRCLE_CARD_OPERATOR_ENV_KEYS,
  CIRCLE_CARD_PRODUCTION_ORIGIN,
  maskStripeIdentifier
} from "./circle-card-stripe-operator-config";
import {
  buildCircleCardStripeSetupPlan,
  createCircleCardStripeOperatorApi,
  executeCircleCardStripeSetup,
  type CircleCardStripeSetupPlan
} from "./circle-card-stripe-setup";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";

export type SetupCliOptions = {
  envFile: string;
  mode: "live";
  execute: boolean;
};

export function parseCircleCardStripeSetupArgs(argv: string[]): SetupCliOptions {
  let envFile: string | undefined;
  let mode: string | undefined;
  let execute = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--env-file") {
      envFile = argv[index + 1];
      index += 1;
    } else if (argument === "--mode") {
      mode = argv[index + 1];
      index += 1;
    } else if (argument === "--execute") {
      execute = true;
    } else if (argument === "--help" || argument === "-h") {
      throw new Error("circle-card-stripe-setup-help");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!envFile) throw new Error("--env-file .env.production is required.");
  if (mode !== "live") throw new Error("--mode live must be supplied explicitly.");
  return { envFile, mode: "live", execute };
}

export function validateCircleCardStripeSetupEnvironment(environment: Record<string, string | undefined>) {
  const billingEnabled = environment[CIRCLE_CARD_OPERATOR_ENV_KEYS.billingEnabled]?.trim().toLowerCase();
  if (billingEnabled !== "false") {
    throw new Error("CIRCLE_CARD_BILLING_ENABLED must be explicitly false.");
  }

  const secretKey = environment[CIRCLE_CARD_OPERATOR_ENV_KEYS.secretKey]?.trim();
  if (!secretKey?.startsWith("sk_live_")) {
    throw new Error("STRIPE_SECRET_KEY must be present and use a live-mode sk_live_ key.");
  }

  const configuredOrigins = ["APP_URL", "NEXTAUTH_URL", "AUTH_URL"]
    .map((key) => environment[key]?.trim())
    .filter((value): value is string => Boolean(value));
  if (!configuredOrigins.length || configuredOrigins.some((value) => value !== CIRCLE_CARD_PRODUCTION_ORIGIN)) {
    throw new Error(`Production origin must be exactly ${CIRCLE_CARD_PRODUCTION_ORIGIN}.`);
  }

  return { secretKey };
}

function runGit(args: string[]) {
  return spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function assertCircleCardStripeSetupFilesystem(envFile: string) {
  const rootResult = runGit(["rev-parse", "--show-toplevel"]);
  if (rootResult.status !== 0) throw new Error("The working directory is not a Git repository.");
  const repositoryRoot = resolve(rootResult.stdout.trim());
  if (repositoryRoot !== resolve(process.cwd())) {
    throw new Error("Run the operator command from the repository root.");
  }

  const environmentPath = resolve(envFile);
  if (environmentPath !== resolve(repositoryRoot, ".env.production")) {
    throw new Error("The operator workflow only accepts the root .env.production file.");
  }
  if (!existsSync(environmentPath)) throw new Error(".env.production does not exist.");

  const tracked = runGit(["ls-files", "--error-unmatch", "--", ".env.production"]);
  if (tracked.status === 0) throw new Error(".env.production is tracked by Git; refusing to continue.");
  const ignored = runGit(["check-ignore", "-q", "--", ".env.production"]);
  if (ignored.status !== 0) throw new Error(".env.production is not protected by .gitignore.");

  return { repositoryRoot, environmentPath };
}

function printHelp() {
  console.info(`Usage:
  npm run circle-card:stripe:setup-live -- --env-file .env.production --mode live
  npm run circle-card:stripe:setup-live -- --env-file .env.production --mode live --execute

The first command is read-only and prints the live change plan. --execute is required for Stripe
or environment-file mutations. Billing must remain explicitly false.`);
}

export function describeCircleCardStripeSetupPlan(plan: CircleCardStripeSetupPlan) {
  const describe = (name: string, value: { action: string; id?: string }) =>
    `${name}: ${value.action}${value.id ? ` ${maskStripeIdentifier(value.id)}` : ""}`;
  return [
    describe("Product", plan.product),
    describe("Monthly price", plan.price),
    describe("Circle Card Portal", plan.portal),
    `${describe("Shared webhook", plan.webhook)}; add ${plan.webhook.addedEvents.length} event(s); preserve existing=${plan.webhook.preservesExistingEvents}`
  ];
}

export function describeCircleCardStripeSetupResult(result: {
  product: { id: string };
  price: { id: string };
  portal: { id: string };
  webhook: { id: string };
  webhookSecretRequiresManualConfirmation: boolean;
}) {
  return [
    `Product: ${maskStripeIdentifier(result.product.id)}`,
    `Monthly price: ${maskStripeIdentifier(result.price.id)}`,
    `Portal configuration: ${maskStripeIdentifier(result.portal.id)}`,
    `Shared webhook: ${maskStripeIdentifier(result.webhook.id)}`,
    result.webhookSecretRequiresManualConfirmation
      ? "Existing webhook signing secret requires manual endpoint confirmation."
      : "A new webhook signing secret was stored without being printed."
  ];
}

export async function main(argv = process.argv.slice(2)) {
  let options: SetupCliOptions;
  try {
    options = parseCircleCardStripeSetupArgs(argv);
  } catch (error) {
    if (error instanceof Error && error.message === "circle-card-stripe-setup-help") {
      printHelp();
      return;
    }
    throw error;
  }

  const { environmentPath } = assertCircleCardStripeSetupFilesystem(options.envFile);
  const environment = readEnvironmentValues(readFileSync(environmentPath, "utf8"));
  const { secretKey } = validateCircleCardStripeSetupEnvironment(environment);
  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  const api = createCircleCardStripeOperatorApi(stripe);

  const plan = await buildCircleCardStripeSetupPlan(api);
  console.info(options.execute ? "LIVE EXECUTION CHANGE PLAN" : "DRY-RUN CHANGE PLAN");
  for (const line of describeCircleCardStripeSetupPlan(plan)) console.info(`- ${line}`);

  if (!options.execute) {
    console.info("Dry run complete. No Stripe resource or environment-file mutation was performed.");
    return;
  }

  console.info("Explicit --execute accepted. Applying only the change plan above.");
  const result = await executeCircleCardStripeSetup(api);
  const updates: Record<string, string> = {
    [CIRCLE_CARD_OPERATOR_ENV_KEYS.productId]: result.product.id,
    [CIRCLE_CARD_OPERATOR_ENV_KEYS.priceId]: result.price.id,
    [CIRCLE_CARD_OPERATOR_ENV_KEYS.portalConfigurationId]: result.portal.id,
    [CIRCLE_CARD_OPERATOR_ENV_KEYS.billingEnabled]: "false"
  };
  if (result.webhookSecret) {
    updates[CIRCLE_CARD_OPERATOR_ENV_KEYS.webhookSecret] = result.webhookSecret;
  }
  const environmentUpdate = updateEnvironmentFileSafely(environmentPath, updates);

  console.info("LIVE SETUP VERIFIED");
  for (const line of describeCircleCardStripeSetupResult(result)) console.info(`- ${line}`);
  console.info(`- Environment updated: ${environmentUpdate.changed ? "yes" : "already exact"}`);
  if (environmentUpdate.backupPath) {
    console.info(`- Environment backup: ${environmentUpdate.backupPath}`);
  }
  console.info("- CIRCLE_CARD_BILLING_ENABLED remains false");
  console.info("No Checkout session was created and no customer was charged.");
  console.info("Run the read-only certification command documented in the operator runbook before deployment.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`circle-card:stripe:setup-live failed: ${message}`);
    process.exit(1);
  });
}
