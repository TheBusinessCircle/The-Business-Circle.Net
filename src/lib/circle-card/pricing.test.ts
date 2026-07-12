import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CIRCLE_CARD_PRICING_CONFIG,
  formatCircleCardAnnualPrice,
  formatCircleCardPrice,
  getCircleCardBillingReadiness,
  getCircleCardProBillingConfigurationErrorMessage
} from "@/lib/circle-card/pricing";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Circle Card Pro controlled launch pricing", () => {
  it("launches Pro at £9.99 monthly without an annual offer", () => {
    expect(CIRCLE_CARD_PRICING_CONFIG.PRO.priceMonthly).toBe(9.99);
    expect(CIRCLE_CARD_PRICING_CONFIG.PRO.priceAnnual).toBeNull();
    expect(formatCircleCardPrice("PRO")).toBe("£9.99/month");
    expect(formatCircleCardAnnualPrice("PRO")).toBeNull();
  });

  it("keeps Teams compatibility deferred without launch pricing", () => {
    expect(CIRCLE_CARD_PRICING_CONFIG.TEAMS.launchAvailable).toBe(false);
    expect(CIRCLE_CARD_PRICING_CONFIG.TEAMS.priceMonthly).toBeNull();
    expect(CIRCLE_CARD_PRICING_CONFIG.TEAMS.stripe).toEqual({});
    expect(formatCircleCardPrice("TEAMS")).toBe("Pricing deferred");
    expect(formatCircleCardAnnualPrice("TEAMS")).toBeNull();
  });

  it("requires only the Pro product and monthly price when billing is enabled", () => {
    vi.stubEnv("CIRCLE_CARD_BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID", "prod_circle_card_pro");
    vi.stubEnv("STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID", "price_circle_card_pro_monthly");
    vi.stubEnv("STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID", "");
    vi.stubEnv("STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID", "");

    expect(getCircleCardProBillingConfigurationErrorMessage()).toBeNull();
    expect(getCircleCardBillingReadiness()).toMatchObject({
      proLaunchConfigured: true,
      teamsPriceConfigured: false,
      pro: {
        productConfigured: true,
        monthlyPriceConfigured: true,
        annualPriceConfigured: false
      }
    });
  });

  it("keeps billing safely disabled by default", () => {
    vi.stubEnv("CIRCLE_CARD_BILLING_ENABLED", "false");

    expect(getCircleCardProBillingConfigurationErrorMessage()).toBe(
      "Circle Card billing is disabled."
    );
  });
});
