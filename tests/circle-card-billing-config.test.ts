import { describe, expect, it } from "vitest";
import {
  parseCircleCardBillingEnabled,
  validateCircleCardBillingEnvironment
} from "../scripts/circle-card-billing-config";

const completeEnabledEnvironment = {
  CIRCLE_CARD_BILLING_ENABLED: "true",
  CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
  CIRCLE_CARD_BILLING_OPERATOR_USER_IDS: "user_operator_1",
  STRIPE_SECRET_KEY: "sk_live_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: "prod_circle_card_pro",
  STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID: "price_circle_card_pro_monthly",
  CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID: "bpc_circle_card_pro"
};

describe("Circle Card production billing environment validation", () => {
  it("passes with billing explicitly disabled and no Circle Card Stripe configuration", () => {
    expect(
      validateCircleCardBillingEnvironment({
        CIRCLE_CARD_BILLING_ENABLED: "false",
        STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: "",
        STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID: ""
      })
    ).toEqual([]);
  });

  it("fails safely when billing is enabled with incomplete configuration", () => {
    const issues = validateCircleCardBillingEnvironment({
      CIRCLE_CARD_BILLING_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_live_example"
    });

    expect(issues.map((issue) => issue.variable)).toEqual([
      "CIRCLE_CARD_BILLING_ACCESS_MODE",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
      "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
      "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID"
    ]);
  });

  it("passes enabled launch configuration without annual or Teams values", () => {
    expect(validateCircleCardBillingEnvironment(completeEnabledEnvironment)).toEqual([]);
  });

  it("requires an explicit operator allowlist and explicit public launch mode", () => {
    expect(validateCircleCardBillingEnvironment({
      ...completeEnabledEnvironment,
      CIRCLE_CARD_BILLING_OPERATOR_USER_IDS: ""
    })).toEqual([
      expect.objectContaining({ variable: "CIRCLE_CARD_BILLING_OPERATOR_USER_IDS" })
    ]);

    expect(validateCircleCardBillingEnvironment({
      ...completeEnabledEnvironment,
      CIRCLE_CARD_BILLING_ACCESS_MODE: "public",
      CIRCLE_CARD_BILLING_OPERATOR_USER_IDS: ""
    })).toEqual([]);
  });

  it("rejects blank and malformed configured Stripe identifiers", () => {
    const issues = validateCircleCardBillingEnvironment({
      ...completeEnabledEnvironment,
      STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: "   ",
      STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID: "prod_wrong_kind"
    });

    expect(issues.map((issue) => issue.variable)).toEqual([
      "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
      "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID"
    ]);
  });

  it("rejects ambiguous billing flag values", () => {
    expect(
      validateCircleCardBillingEnvironment({ CIRCLE_CARD_BILLING_ENABLED: "maybe" })
    ).toEqual([
      expect.objectContaining({ variable: "CIRCLE_CARD_BILLING_ENABLED" })
    ]);
  });

  it("requires the production billing switch to be explicit", () => {
    expect(validateCircleCardBillingEnvironment({})).toEqual([
      expect.objectContaining({ variable: "CIRCLE_CARD_BILLING_ENABLED" })
    ]);
  });

  it("recognises supported explicit true values", () => {
    expect(parseCircleCardBillingEnabled({ CIRCLE_CARD_BILLING_ENABLED: "on" })).toBe(true);
    expect(parseCircleCardBillingEnabled({ CIRCLE_CARD_BILLING_ENABLED: "false" })).toBe(false);
  });
});
