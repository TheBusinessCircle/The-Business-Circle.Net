import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_LAUNCH_BILLING_PERIODS,
  CIRCLE_CARD_PRO_BILLING_ENV_VARS,
  isCircleCardBillingPeriod,
  isCircleCardLaunchBillingPeriod
} from "@/lib/circle-card/billing-blueprint";

describe("Circle Card launch billing blueprint", () => {
  it("requires product, monthly price and dedicated Portal configuration for Circle Card Pro", () => {
    expect(CIRCLE_CARD_PRO_BILLING_ENV_VARS).toEqual([
      "CIRCLE_CARD_BILLING_ENABLED",
      "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
      "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
      "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID"
    ]);
  });

  it("keeps annual parsing compatibility without offering annual at launch", () => {
    expect(CIRCLE_CARD_LAUNCH_BILLING_PERIODS).toEqual(["monthly"]);
    expect(isCircleCardBillingPeriod("annual")).toBe(true);
    expect(isCircleCardLaunchBillingPeriod("monthly")).toBe(true);
    expect(isCircleCardLaunchBillingPeriod("annual")).toBe(false);
  });
});
