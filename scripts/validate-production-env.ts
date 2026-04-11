import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

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

  if (typeof loadEnvFile === "function") {
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

function isSecureWsUrl(value: string) {
  return value.startsWith("wss://") || value.startsWith("https://");
}

function isStrongValue(value: string, minimumLength = 24) {
  return value.length >= minimumLength;
}

function validateProductionEnv() {
  const issues: Issue[] = [];

  const appUrl = env("APP_URL");
  const nextAuthUrl = env("NEXTAUTH_URL");
  const authSecret = env("AUTH_SECRET");
  const nextAuthSecret = env("NEXTAUTH_SECRET");
  const postgresPassword = env("POSTGRES_PASSWORD");
  const adminPassword = env("ADMIN_PASSWORD");
  const stripeSecretKey = env("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = env("STRIPE_WEBHOOK_SECRET");
  const resendApiKey = env("RESEND_API_KEY");
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

  if (!isSecureWebUrl(appUrl)) {
    addIssue(issues, "error", "APP_URL must use https:// in production.");
  }

  if (!isSecureWebUrl(nextAuthUrl)) {
    addIssue(issues, "error", "NEXTAUTH_URL must use https:// in production.");
  }

  if (appUrl && nextAuthUrl && appUrl !== nextAuthUrl) {
    addIssue(issues, "error", "APP_URL and NEXTAUTH_URL should match exactly in production.");
  }

  if (!isStrongValue(authSecret) || authSecret === "change-this-secret") {
    addIssue(issues, "error", "AUTH_SECRET is missing or too weak.");
  }

  if (!isStrongValue(nextAuthSecret) || nextAuthSecret === "change-this-secret") {
    addIssue(issues, "error", "NEXTAUTH_SECRET is missing or too weak.");
  }

  if (!isStrongValue(postgresPassword) || postgresPassword === "postgres") {
    addIssue(issues, "error", "POSTGRES_PASSWORD is still weak or default.");
  }

  if (!isStrongValue(adminPassword) || adminPassword === "ChangeMe123!") {
    addIssue(issues, "error", "ADMIN_PASSWORD is still weak or default.");
  }

  if (!stripeSecretKey.startsWith("sk_live_")) {
    addIssue(issues, "error", "STRIPE_SECRET_KEY should be a live Stripe key.");
  }

  if (!stripeWebhookSecret.startsWith("whsec_")) {
    addIssue(issues, "error", "STRIPE_WEBHOOK_SECRET is missing or invalid.");
  }

  if (!resendApiKey.startsWith("re_")) {
    addIssue(issues, "error", "RESEND_API_KEY is missing or invalid.");
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

  if (!isSecureWsUrl(liveKitUrl)) {
    addIssue(issues, "error", "LIVEKIT_URL should use wss:// or https:// in production.");
  }

  if (!turnDomain || turnDomain === "localhost" || turnDomain.endsWith(".local")) {
    addIssue(issues, "error", "TURN_DOMAIN must be a public domain in production.");
  }

  if (!turnTlsEnabled) {
    addIssue(issues, "error", "TURN_TLS_ENABLED should be true for production hardening.");
  }

  if (turnTlsEnabled && !turnTlsPort) {
    addIssue(issues, "error", "TURN_TLS_PORT must be set when TURN_TLS_ENABLED=true.");
  }

  if (turnTlsEnabled && (!turnTlsCertFile || !turnTlsKeyFile)) {
    addIssue(
      issues,
      "error",
      "TURN TLS certificate and key paths must be configured when TURN_TLS_ENABLED=true."
    );
  }

  if (turnTlsEnabled && turnTlsCertDir) {
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

  if (env("SEED_MODE") !== "production") {
    addIssue(issues, "error", "SEED_MODE should be set to production.");
  }

  if (env("DEMO_MEMBER_PASSWORD")) {
    addIssue(issues, "warning", "DEMO_MEMBER_PASSWORD should stay empty in production.");
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
