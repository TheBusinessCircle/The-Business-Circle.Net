import { describe, expect, it } from "vitest";
import {
  TOOLING_ONLY_ENV_NAMES,
  validateProductionRuntimeEnvironment,
  validateProductionToolingEnvironment
} from "../scripts/validate-production-env";

const ZERO_CREDENTIAL = "00000000000000000000000000000000";

function bcnRuntimeFixture(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_BRAND: "bcn",
    APP_URL: "https://thebusinesscircle.net",
    AUTH_URL: "https://thebusinesscircle.net",
    NEXTAUTH_URL: "https://thebusinesscircle.net",
    NEXT_RUNTIME_DIST_DIR: ".runtime/bcn",
    AUTH_SECRET: `local-contract-auth-${ZERO_CREDENTIAL}`,
    NEXTAUTH_SECRET: `local-contract-nextauth-${ZERO_CREDENTIAL}`,
    DATABASE_URL:
      "postgresql://fixture_user:fixture_password@db.invalid:5432/fixture_database",
    STRIPE_SECRET_KEY: `sk_live_${ZERO_CREDENTIAL}`,
    STRIPE_WEBHOOK_SECRET: `whsec_${ZERO_CREDENTIAL}`,
    STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: `prod_${ZERO_CREDENTIAL}`,
    STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID: `price_${ZERO_CREDENTIAL}`,
    CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID: `bpc_${ZERO_CREDENTIAL}`,
    CIRCLE_CARD_BILLING_ENABLED: "false",
    CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
    STRIPE_FOUNDATION_MONTHLY_PRICE_ID: `price_01${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDATION_ANNUAL_PRICE_ID: `price_02${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID: `price_03${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID: `price_04${ZERO_CREDENTIAL}`,
    STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID: `price_05${ZERO_CREDENTIAL}`,
    STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID: `price_06${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID: `price_07${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID: `price_08${ZERO_CREDENTIAL}`,
    STRIPE_CORE_MONTHLY_PRICE_ID: `price_09${ZERO_CREDENTIAL}`,
    STRIPE_CORE_ANNUAL_PRICE_ID: `price_10${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID: `price_11${ZERO_CREDENTIAL}`,
    STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID: `price_12${ZERO_CREDENTIAL}`,
    RESEND_API_KEY: `re_${ZERO_CREDENTIAL}`,
    RESEND_FROM_EMAIL:
      "BCN Contract Fixture <fixture@thebusinesscircle.net>",
    RESEND_REPLY_TO_EMAIL: "fixture-reply@thebusinesscircle.net",
    PUBLIC_CONTACT_EMAIL: "fixture-contact@thebusinesscircle.net",
    CIRCLE_CARD_RESEND_API_KEY: `re_01${ZERO_CREDENTIAL}`,
    CIRCLE_CARD_RESEND_FROM_EMAIL:
      "Circle Card Contract Fixture <fixture@circlecard.co.uk>",
    CIRCLE_CARD_RESEND_REPLY_TO_EMAIL: "fixture-reply@circlecard.co.uk",
    CIRCLE_CARD_PUBLIC_CONTACT_EMAIL: "fixture-contact@circlecard.co.uk",
    CRON_SECRET: `local-contract-cron-${ZERO_CREDENTIAL}`,
    RESEND_WEBHOOK_SECRET: `whsec_01${ZERO_CREDENTIAL}`,
    INBOUND_EMAIL_FORWARD_TO: "fixture-inbound@thebusinesscircle.net",
    UPSTASH_REDIS_REST_URL: "https://redis.invalid",
    UPSTASH_REDIS_REST_TOKEN: `local-contract-redis-${ZERO_CREDENTIAL}`,
    CLOUDINARY_CLOUD_NAME: "local-contract-fixture",
    CLOUDINARY_API_KEY: "000000000000000",
    CLOUDINARY_API_SECRET: `local-contract-cloudinary-${ZERO_CREDENTIAL}`,
    NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED: "false",
    LIVEKIT_URL: "wss://livekit.invalid",
    TURN_DOMAIN: "turn.invalid",
    TURN_TLS_ENABLED: "true",
    TURN_TLS_PORT: "5349",
    TURN_TLS_CERT_FILE: "/fixture/fullchain.pem",
    TURN_TLS_KEY_FILE: "/fixture/privkey.pem",
    BCN_COMMUNITY_AUTOMATION_ENABLED: "false"
  };
}

describe("production environment validation boundaries", () => {
  it("validates the BCN runtime without tooling-only variables", () => {
    const environment = bcnRuntimeFixture();

    for (const name of TOOLING_ONLY_ENV_NAMES) {
      expect(environment).not.toHaveProperty(name);
    }

    expect(validateProductionRuntimeEnvironment(environment)).toEqual([]);
  });

  it("does not let invalid tooling values affect runtime validation", () => {
    const environment = {
      ...bcnRuntimeFixture(),
      POSTGRES_PASSWORD: "postgres",
      ADMIN_PASSWORD: "ChangeMe123!",
      SEED_MODE: "development"
    };

    expect(validateProductionRuntimeEnvironment(environment)).toEqual([]);
  });

  it("requires tooling values only in the explicit tooling context", () => {
    const missingIssues = validateProductionToolingEnvironment({
      NODE_ENV: "production"
    });

    expect(missingIssues.map(({ message }) => message)).toEqual([
      "POSTGRES_PASSWORD is still weak or default.",
      "ADMIN_PASSWORD is still weak or default.",
      "SEED_MODE should be set to production."
    ]);

    expect(
      validateProductionToolingEnvironment({
        NODE_ENV: "production",
        POSTGRES_PASSWORD: `local-contract-postgres-${ZERO_CREDENTIAL}`,
        ADMIN_PASSWORD: `local-contract-admin-${ZERO_CREDENTIAL}`,
        SEED_MODE: "production"
      })
    ).toEqual([]);
  });
});
