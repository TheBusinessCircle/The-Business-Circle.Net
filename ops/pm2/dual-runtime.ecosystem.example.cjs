/* eslint-disable @typescript-eslint/no-require-imports -- PM2 loads ecosystem files as CommonJS. */
/*
 * Deployment example only. Load shared secrets from the server's approved
 * environment manager before invoking PM2. Never put credentials in this file.
 */
const { readFileSync } = require("node:fs");
const { isAbsolute } = require("node:path");
const { parseEnv } = require("node:util");

const releaseDirectory = process.env.RELEASE_DIR;

if (!releaseDirectory) {
  throw new Error("RELEASE_DIR must point to the checked-out, already-built release.");
}

function protectedEnvironment(variableName) {
  const filePath = process.env[variableName];
  if (!filePath || !isAbsolute(filePath)) {
    throw new Error(`${variableName} must be an absolute protected environment-file path.`);
  }
  if (typeof parseEnv !== "function") {
    throw new Error("The deployment Node.js version must support node:util parseEnv.");
  }
  return parseEnv(readFileSync(filePath, "utf8"));
}

const bcnEnvironment = protectedEnvironment("BCN_ENV_FILE");
const circleCardEnvironment = protectedEnvironment("CIRCLE_CARD_ENV_FILE");

const circleCardForbiddenEnvironment = {
  STRIPE_WEBHOOK_SECRET: "",
  RESEND_API_KEY: "",
  RESEND_FROM_EMAIL: "",
  RESEND_REPLY_TO_EMAIL: "",
  PUBLIC_CONTACT_EMAIL: "",
  RESEND_WEBHOOK_SECRET: "",
  INBOUND_EMAIL_FORWARD_TO: "",
  CRON_SECRET: "",
  COMMUNITY_AUTOMATION_SECRET: "",
  INTELLIGENCE_CRON_SECRET: "",
  CIRCLE_CARD_ACTIVATION_SECRET: "",
  RESOURCE_AUTOMATION_SECRET: "",
  BCN_COMMUNITY_SOURCE_URL: "",
  BCN_COMMUNITY_SOURCE_URLS: "",
  BCN_COMMUNITY_SOURCE_NAME: "",
  LIVEKIT_URL: "",
  LIVEKIT_API_KEY: "",
  LIVEKIT_API_SECRET: "",
  TURN_DOMAIN: "",
  TURN_SECRET: "",
  STRIPE_FOUNDATION_MONTHLY_PRICE_ID: "",
  STRIPE_FOUNDATION_PRICE_ID: "",
  STRIPE_STANDARD_PRICE_ID: "",
  STRIPE_FOUNDATION_ANNUAL_PRICE_ID: "",
  STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID: "",
  STRIPE_FOUNDING_FOUNDATION_PRICE_ID: "",
  STRIPE_FOUNDING_STANDARD_PRICE_ID: "",
  STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID: "",
  STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID: "",
  STRIPE_INNER_CIRCLE_PRICE_ID: "",
  STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID: "",
  STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID: "",
  STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID: "",
  STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID: "",
  STRIPE_CORE_MONTHLY_PRICE_ID: "",
  STRIPE_CORE_PRICE_ID: "",
  STRIPE_CORE_ANNUAL_PRICE_ID: "",
  STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID: "",
  STRIPE_FOUNDING_CORE_PRICE_ID: "",
  STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID: ""
};

module.exports = {
  apps: [
    {
      // Preserve the repository's existing production process name.
      name: "the-business-circle-network",
      cwd: releaseDirectory,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      kill_timeout: 15000,
      env: {
        ...bcnEnvironment,
        NODE_ENV: "production",
        PORT: "3000",
        APP_BRAND: "bcn",
        APP_URL: "https://thebusinesscircle.net",
        AUTH_URL: "https://thebusinesscircle.net",
        NEXTAUTH_URL: "https://thebusinesscircle.net",
        NEXT_RUNTIME_DIST_DIR: ".runtime/bcn"
      }
    },
    {
      name: "circle-card",
      cwd: releaseDirectory,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3200",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      kill_timeout: 15000,
      env: {
        ...circleCardEnvironment,
        ...circleCardForbiddenEnvironment,
        NODE_ENV: "production",
        PORT: "3200",
        APP_BRAND: "circle-card",
        APP_URL: "https://circlecard.co.uk",
        AUTH_URL: "https://circlecard.co.uk",
        NEXTAUTH_URL: "https://circlecard.co.uk",
        NEXT_RUNTIME_DIST_DIR: ".runtime/circle-card",
        BCN_COMMUNITY_AUTOMATION_ENABLED: "false"
      }
    }
  ]
};
