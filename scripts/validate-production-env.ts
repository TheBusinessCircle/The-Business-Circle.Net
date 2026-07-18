import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { validateRuntimeOriginEnvironment } from "../src/config/runtime-origin";
import { isProductionCredential } from "../src/config/production-credential";
import { RUNTIME_DIST_DIRS } from "../src/config/runtime-dist-dir";
import {
  EmailBrandConfigurationError,
  getRequiredEmailBrandsForRuntime,
  parseEmailMailbox,
  requiresCircleCardEmailConfiguration,
  resolveEmailBrandIdentity
} from "../src/lib/email/brand";
import { validateCircleCardBillingEnvironment } from "./circle-card-billing-config";

type Severity = "error" | "warning";

type Issue = {
  severity: Severity;
  message: string;
};

type Options = {
  envFile?: string;
};

function loadEnvFileIfAvailable(filePath: string) {
  const loadEnvFile = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (typeof loadEnvFile === "function" && existsSync(filePath)) {
    loadEnvFile(filePath);
  }
}

function parseArgs(argv: string[]): Options {
  const options: Options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--env-file") {
      options.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.info(`Usage:
  npm run env:validate:production
  npm run env:validate:production -- --env-file .env.production
`);
      process.exit(0);
    }
  }

  return options;
}

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function parseBoolean(value: string) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function addIssue(issues: Issue[], severity: Severity, message: string) {
  issues.push({ severity, message });
}

function isSecureWebUrl(value: string) {
  return value.startsWith("https://");
}

function normalizeWebUrl(value: string) {
  return value.replace(/\/$/, "");
}

function isLoopbackUrl(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function isSecureWsUrl(value: string) {
  return value.startsWith("wss://") || value.startsWith("https://");
}

function isStrongValue(value: string, minimumLength = 24) {
  return value.length >= minimumLength;
}

function isPositiveIntegerString(value: string) {
  return /^\d+$/.test(value);
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const MEMBERSHIP_STRIPE_PRICE_REQUIREMENTS = [
  {
    label: "Foundation standard monthly",
    envNames: [
      "STRIPE_FOUNDATION_MONTHLY_PRICE_ID",
      "STRIPE_FOUNDATION_PRICE_ID",
      "STRIPE_STANDARD_PRICE_ID"
    ]
  },
  {
    label: "Foundation standard annual",
    envNames: ["STRIPE_FOUNDATION_ANNUAL_PRICE_ID"]
  },
  {
    label: "Foundation founding monthly",
    envNames: [
      "STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID",
      "STRIPE_FOUNDING_FOUNDATION_PRICE_ID",
      "STRIPE_FOUNDING_STANDARD_PRICE_ID"
    ]
  },
  {
    label: "Foundation founding annual",
    envNames: ["STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID"]
  },
  {
    label: "Inner Circle standard monthly",
    envNames: ["STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID", "STRIPE_INNER_CIRCLE_PRICE_ID"]
  },
  {
    label: "Inner Circle standard annual",
    envNames: ["STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID"]
  },
  {
    label: "Inner Circle founding monthly",
    envNames: [
      "STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID",
      "STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID"
    ]
  },
  {
    label: "Inner Circle founding annual",
    envNames: ["STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID"]
  },
  {
    label: "Core standard monthly",
    envNames: ["STRIPE_CORE_MONTHLY_PRICE_ID", "STRIPE_CORE_PRICE_ID"]
  },
  {
    label: "Core standard annual",
    envNames: ["STRIPE_CORE_ANNUAL_PRICE_ID"]
  },
  {
    label: "Core founding monthly",
    envNames: ["STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID", "STRIPE_FOUNDING_CORE_PRICE_ID"]
  },
  {
    label: "Core founding annual",
    envNames: ["STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID"]
  }
] as const;

function listMissingMembershipStripePriceIds() {
  return MEMBERSHIP_STRIPE_PRICE_REQUIREMENTS.filter(
    (requirement) => !requirement.envNames.some((name) => env(name))
  );
}

function validateProductionEnv() {
  const issues: Issue[] = [];

  const authSecret = env("AUTH_SECRET");
  const nextAuthSecret = env("NEXTAUTH_SECRET");
  const postgresPassword = env("POSTGRES_PASSWORD");
  const adminPassword = env("ADMIN_PASSWORD");
  const stripeSecretKey = env("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = env("STRIPE_WEBHOOK_SECRET");
  const posthogKey = env("NEXT_PUBLIC_POSTHOG_KEY");
  const posthogHost = normalizeWebUrl(env("NEXT_PUBLIC_POSTHOG_HOST"));
  const resendApiKey = env("RESEND_API_KEY");
  const circleCardResendApiKey = env("CIRCLE_CARD_RESEND_API_KEY");
  const liveKitUrl = env("LIVEKIT_URL");
  const turnDomain = env("TURN_DOMAIN");
  const turnTlsEnabled = parseBoolean(env("TURN_TLS_ENABLED"));
  const turnTlsPort = env("TURN_TLS_PORT");
  const turnTlsCertDir = env("TURN_TLS_CERTS_DIR");
  const turnTlsCertFile = env("TURN_TLS_CERT_FILE");
  const turnTlsKeyFile = env("TURN_TLS_KEY_FILE");
  const cloudinaryConfigured = Boolean(
    env("CLOUDINARY_CLOUD_NAME") &&
      env("CLOUDINARY_API_KEY") &&
      env("CLOUDINARY_API_SECRET")
  );
  const redisConfigured = Boolean(
    (env("UPSTASH_REDIS_REST_URL") && env("UPSTASH_REDIS_REST_TOKEN")) ||
      (env("KV_REST_API_URL") && env("KV_REST_API_TOKEN"))
  );
  const realtimeEnabled = parseBoolean(env("NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED"));
  const communityAutomationEnabled = env("BCN_COMMUNITY_AUTOMATION_ENABLED").toLowerCase() !== "false";
  const communityAutomationSecret = env("COMMUNITY_AUTOMATION_SECRET");
  const cronSecret = env("CRON_SECRET");
  const resendWebhookSecret = env("RESEND_WEBHOOK_SECRET");
  const inboundEmailForwardTo = env("INBOUND_EMAIL_FORWARD_TO");
  const automationAuthorId = env("COMMUNITY_AUTOMATION_AUTHOR_ID");
  const bcnSourceUrl = env("BCN_COMMUNITY_SOURCE_URL");
  const bcnSourceUrls = parseCsv(env("BCN_COMMUNITY_SOURCE_URLS"));
  const lookbackHours = env("BCN_COMMUNITY_LOOKBACK_HOURS");
  const maxPostsPerRun = env("BCN_COMMUNITY_MAX_POSTS_PER_RUN");
  const throttleMs = env("BCN_COMMUNITY_AUTOMATION_THROTTLE_MS");

  const runtimeOriginValidation = validateRuntimeOriginEnvironment({
    APP_BRAND: process.env.APP_BRAND,
    APP_URL: process.env.APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: "production"
  });
  for (const runtimeOriginIssue of runtimeOriginValidation.issues) {
    addIssue(issues, "error", runtimeOriginIssue.message);
  }
  const runtimeBrandKey = runtimeOriginValidation.brand?.key ?? null;
  // Invalid configuration retains the stricter BCN-owner requirements.
  const ownsBcnProcessResponsibilities = runtimeBrandKey !== "circle-card";
  const runtimeDistDir = env("NEXT_RUNTIME_DIST_DIR");
  const expectedRuntimeDistDir = runtimeBrandKey
    ? RUNTIME_DIST_DIRS[runtimeBrandKey]
    : null;

  if (!expectedRuntimeDistDir || runtimeDistDir !== expectedRuntimeDistDir) {
    addIssue(
      issues,
      "error",
      expectedRuntimeDistDir
        ? `NEXT_RUNTIME_DIST_DIR must be ${expectedRuntimeDistDir} for this production runtime.`
        : "NEXT_RUNTIME_DIST_DIR cannot be validated until APP_BRAND is valid."
    );
  }

  if (!isStrongValue(authSecret) || authSecret === "change-this-secret") {
    addIssue(issues, "error", "AUTH_SECRET is missing or too weak.");
  }

  if (!isStrongValue(nextAuthSecret) || nextAuthSecret === "change-this-secret") {
    addIssue(issues, "error", "NEXTAUTH_SECRET is missing or too weak.");
  }

  if (
    ownsBcnProcessResponsibilities &&
    (!isStrongValue(postgresPassword) || postgresPassword === "postgres")
  ) {
    addIssue(issues, "error", "POSTGRES_PASSWORD is still weak or default.");
  }

  if (
    ownsBcnProcessResponsibilities &&
    (!isStrongValue(adminPassword) || adminPassword === "ChangeMe123!")
  ) {
    addIssue(issues, "error", "ADMIN_PASSWORD is still weak or default.");
  }

  if (!isProductionCredential(stripeSecretKey, "sk_live_")) {
    addIssue(issues, "error", "STRIPE_SECRET_KEY should be a live Stripe key.");
  }

  if (
    ownsBcnProcessResponsibilities &&
    !isProductionCredential(stripeWebhookSecret, "whsec_")
  ) {
    addIssue(issues, "error", "STRIPE_WEBHOOK_SECRET is missing or invalid.");
  }

  for (const circleCardBillingIssue of validateCircleCardBillingEnvironment(
    process.env,
    { requireWebhookSecret: ownsBcnProcessResponsibilities }
  )) {
    addIssue(issues, "error", circleCardBillingIssue.message);
  }

  for (const [variableName, prefix] of [
    ["STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID", "prod_"],
    ["STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID", "price_"],
    ["CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID", "bpc_"]
  ] as const) {
    if (!isProductionCredential(env(variableName), prefix, prefix.length + 8)) {
      addIssue(issues, "error", `${variableName} is missing, malformed, or still a placeholder.`);
    }
  }

  if (ownsBcnProcessResponsibilities) {
    for (const missingPriceId of listMissingMembershipStripePriceIds()) {
      addIssue(
        issues,
        "error",
        `Missing Stripe membership price ID for ${missingPriceId.label}. Set one of: ${missingPriceId.envNames.join(", ")}.`
      );
    }

    for (const requirement of MEMBERSHIP_STRIPE_PRICE_REQUIREMENTS) {
      const configuredPriceId = requirement.envNames
        .map((name) => env(name))
        .find(Boolean);
      if (
        configuredPriceId &&
        !isProductionCredential(configuredPriceId, "price_", "price_".length + 8)
      ) {
        addIssue(
          issues,
          "error",
          `Stripe membership price ID for ${requirement.label} is malformed or still a placeholder.`
        );
      }
    }
  }

  const posthogConfigured = Boolean(posthogKey || posthogHost);

  if (posthogConfigured) {
    if (!posthogKey || !posthogKey.startsWith("phc_")) {
      addIssue(issues, "error", "NEXT_PUBLIC_POSTHOG_KEY does not look like a PostHog project key.");
    } else if (posthogKey === "phc_your_real_key_here") {
      addIssue(issues, "error", "NEXT_PUBLIC_POSTHOG_KEY is still the placeholder value.");
    }

    if (!posthogHost || !isSecureWebUrl(posthogHost)) {
      addIssue(issues, "error", "NEXT_PUBLIC_POSTHOG_HOST must use https:// when PostHog is configured.");
    } else if (isLoopbackUrl(posthogHost)) {
      addIssue(issues, "error", "NEXT_PUBLIC_POSTHOG_HOST cannot use localhost in production.");
    }
  }
  const requiredEmailBrands = runtimeBrandKey
    ? getRequiredEmailBrandsForRuntime(runtimeBrandKey)
    : ([] as const);
  const bcnEmailRequired = requiredEmailBrands.includes("bcn");
  const circleCardEmailRequired =
    requiredEmailBrands.includes("circle-card") ||
    requiresCircleCardEmailConfiguration(process.env);

  if (bcnEmailRequired && !isProductionCredential(resendApiKey, "re_")) {
    addIssue(issues, "error", "RESEND_API_KEY is missing or invalid.");
  }

  if (
    circleCardEmailRequired &&
    !isProductionCredential(circleCardResendApiKey, "re_")
  ) {
    addIssue(
      issues,
      "error",
      "CIRCLE_CARD_RESEND_API_KEY is missing or invalid."
    );
  }

  if (
    circleCardEmailRequired &&
    resendApiKey &&
    circleCardResendApiKey === resendApiKey
  ) {
    addIssue(
      issues,
      "error",
      "CIRCLE_CARD_RESEND_API_KEY must not reuse the BCN RESEND_API_KEY."
    );
  }

  const emailBrands = requiredEmailBrands.length
    ? requiredEmailBrands
    : circleCardEmailRequired
      ? (["bcn", "circle-card"] as const)
      : (["bcn"] as const);

  for (const brand of emailBrands) {
    try {
      resolveEmailBrandIdentity(brand, {
        ...process.env,
        NODE_ENV: "production"
      });
    } catch (error) {
      addIssue(
        issues,
        "error",
        error instanceof EmailBrandConfigurationError
          ? error.message
          : `Unable to validate ${brand} email identity.`
      );
    }
  }

  if (ownsBcnProcessResponsibilities) {
    if (!isStrongValue(cronSecret)) {
      addIssue(
        issues,
        "error",
        "CRON_SECRET is required and must be strong on the BCN owner process."
      );
    }

    if (!isProductionCredential(resendWebhookSecret, "whsec_")) {
      addIssue(issues, "error", "RESEND_WEBHOOK_SECRET is missing or invalid.");
    }

    try {
      parseEmailMailbox(inboundEmailForwardTo, "INBOUND_EMAIL_FORWARD_TO");
    } catch {
      addIssue(
        issues,
        "error",
        "INBOUND_EMAIL_FORWARD_TO must contain one valid email mailbox."
      );
    }
  }

  if (!redisConfigured) {
    addIssue(
      issues,
      "error",
      "Shared Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or the KV_REST_API aliases."
    );
  }

  if (!cloudinaryConfigured) {
    addIssue(
      issues,
      "error",
      "Cloudinary is not configured. Durable media uploads need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  if (realtimeEnabled && !env("ABLY_API_KEY")) {
    addIssue(issues, "error", "ABLY_API_KEY is required when community realtime is enabled.");
  }

  if (ownsBcnProcessResponsibilities && !isSecureWsUrl(liveKitUrl)) {
    addIssue(issues, "error", "LIVEKIT_URL should use wss:// or https:// in production.");
  }

  if (
    ownsBcnProcessResponsibilities &&
    (!turnDomain || turnDomain === "localhost" || turnDomain.endsWith(".local"))
  ) {
    addIssue(issues, "error", "TURN_DOMAIN must be a public domain in production.");
  }

  if (ownsBcnProcessResponsibilities && !turnTlsEnabled) {
    addIssue(issues, "error", "TURN_TLS_ENABLED should be true for production hardening.");
  }

  if (ownsBcnProcessResponsibilities && turnTlsEnabled && !turnTlsPort) {
    addIssue(issues, "error", "TURN_TLS_PORT must be set when TURN_TLS_ENABLED=true.");
  }

  if (
    ownsBcnProcessResponsibilities &&
    turnTlsEnabled &&
    (!turnTlsCertFile || !turnTlsKeyFile)
  ) {
    addIssue(
      issues,
      "error",
      "TURN TLS certificate and key paths must be configured when TURN_TLS_ENABLED=true."
    );
  }

  if (ownsBcnProcessResponsibilities && turnTlsEnabled && turnTlsCertDir) {
    const resolvedCertDir = resolve(process.cwd(), turnTlsCertDir);
    if (!existsSync(resolvedCertDir)) {
      addIssue(
        issues,
        "warning",
        `TURN TLS cert directory does not exist yet: ${resolvedCertDir}`
      );
    } else {
      const hostCertPath = resolve(resolvedCertDir, basename(turnTlsCertFile || "fullchain.pem"));
      const hostKeyPath = resolve(resolvedCertDir, basename(turnTlsKeyFile || "privkey.pem"));

      if (!existsSync(hostCertPath)) {
        addIssue(
          issues,
          "warning",
          `TURN TLS certificate file is missing from the host cert directory: ${hostCertPath}`
        );
      }

      if (!existsSync(hostKeyPath)) {
        addIssue(
          issues,
          "warning",
          `TURN TLS key file is missing from the host cert directory: ${hostKeyPath}`
        );
      }
    }
  }

  if (ownsBcnProcessResponsibilities && env("SEED_MODE") !== "production") {
    addIssue(issues, "error", "SEED_MODE should be set to production.");
  }

  if (env("DEMO_MEMBER_PASSWORD")) {
    addIssue(issues, "warning", "DEMO_MEMBER_PASSWORD should stay empty in production.");
  }

  if (communityAutomationEnabled) {
    if (!communityAutomationSecret && !cronSecret) {
      addIssue(
        issues,
        "error",
        "BCN automation is enabled but neither COMMUNITY_AUTOMATION_SECRET nor CRON_SECRET is set."
      );
    }

    if (communityAutomationSecret && !isStrongValue(communityAutomationSecret)) {
      addIssue(issues, "error", "COMMUNITY_AUTOMATION_SECRET is missing or too weak.");
    }

    if (cronSecret && !isStrongValue(cronSecret)) {
      addIssue(issues, "error", "CRON_SECRET is missing or too weak.");
    }

    if (!bcnSourceUrl && !bcnSourceUrls.length) {
      addIssue(
        issues,
        "error",
        "BCN automation is enabled but no sources are configured. Set BCN_COMMUNITY_SOURCE_URLS or BCN_COMMUNITY_SOURCE_URL."
      );
    }

    if (bcnSourceUrl && !isSecureWebUrl(bcnSourceUrl)) {
      addIssue(issues, "error", "BCN_COMMUNITY_SOURCE_URL must use https:// in production.");
    }

    for (const sourceUrl of bcnSourceUrls) {
      if (!isSecureWebUrl(sourceUrl)) {
        addIssue(
          issues,
          "error",
          `BCN_COMMUNITY_SOURCE_URLS contains a non-https feed URL: ${sourceUrl}`
        );
      }
    }

    if (automationAuthorId.includes("@")) {
      addIssue(
        issues,
        "error",
        "COMMUNITY_AUTOMATION_AUTHOR_ID must be a real user ID, not an email address."
      );
    }

    if (!automationAuthorId) {
      addIssue(
        issues,
        "warning",
        "COMMUNITY_AUTOMATION_AUTHOR_ID is blank. BCN automation will fall back to the first active admin user in the database."
      );
    }

    if (!isPositiveIntegerString(lookbackHours)) {
      addIssue(issues, "error", "BCN_COMMUNITY_LOOKBACK_HOURS must be a whole-number hour value.");
    } else {
      const numericLookback = Number(lookbackHours);
      if (numericLookback < 1 || numericLookback > 168) {
        addIssue(issues, "error", "BCN_COMMUNITY_LOOKBACK_HOURS must be between 1 and 168.");
      }
    }

    if (!isPositiveIntegerString(maxPostsPerRun)) {
      addIssue(issues, "error", "BCN_COMMUNITY_MAX_POSTS_PER_RUN must be a whole-number value.");
    } else {
      const numericMaxPosts = Number(maxPostsPerRun);
      if (numericMaxPosts < 1 || numericMaxPosts > 5) {
        addIssue(issues, "error", "BCN_COMMUNITY_MAX_POSTS_PER_RUN must be between 1 and 5.");
      }
    }

    if (!isPositiveIntegerString(throttleMs)) {
      addIssue(
        issues,
        "error",
        "BCN_COMMUNITY_AUTOMATION_THROTTLE_MS must be a whole-number millisecond value."
      );
    } else {
      const numericThrottle = Number(throttleMs);
      if (numericThrottle < 60_000) {
        addIssue(
          issues,
          "error",
          "BCN_COMMUNITY_AUTOMATION_THROTTLE_MS must be at least 60000."
        );
      }
    }
  }

  return issues;
}

function printIssues(issues: Issue[]) {
  if (!issues.length) {
    console.info("Production env validation passed.");
    return;
  }

  for (const issue of issues) {
    const prefix = issue.severity === "error" ? "ERROR" : "WARN";
    console.info(`[${prefix}] ${issue.message}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFileIfAvailable(options.envFile ?? ".env.production");

  const issues = validateProductionEnv();
  printIssues(issues);

  if (issues.some((issue) => issue.severity === "error")) {
    process.exit(1);
  }
}

main();
