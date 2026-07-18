import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_BILLING_ENV_NAMES,
  validateCircleCardBillingEnvironment
} from "../../scripts/circle-card-billing-config";

const circleCardWebRuntimeEnvironment = {
  CIRCLE_CARD_BILLING_ENABLED: "true",
  CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
  CIRCLE_CARD_BILLING_OPERATOR_USER_IDS: "operator-user-id",
  STRIPE_SECRET_KEY: "sk_live_example",
  STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: "prod_example",
  STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID: "price_example",
  CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID: "bpc_example"
};

describe("Circle Card billing validation process ownership", () => {
  it("keeps the webhook secret mandatory for the BCN owner process", () => {
    expect(validateCircleCardBillingEnvironment(circleCardWebRuntimeEnvironment)).toContainEqual({
      variable: CIRCLE_CARD_BILLING_ENV_NAMES.stripeWebhookSecret,
      message: "STRIPE_WEBHOOK_SECRET is required when Circle Card billing is enabled."
    });
  });

  it("does not require the webhook secret in the non-owner Circle Card web process", () => {
    expect(
      validateCircleCardBillingEnvironment(circleCardWebRuntimeEnvironment, {
        requireWebhookSecret: false
      })
    ).toEqual([]);
  });
});
