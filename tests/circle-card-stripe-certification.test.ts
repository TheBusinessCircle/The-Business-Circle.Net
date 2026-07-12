import { describe, expect, it } from "vitest";
import {
  certifyCircleCardStripeConfiguration,
  type CircleCardStripeCertificationInput
} from "../scripts/circle-card-stripe-certification";

function validInput(
  overrides: Partial<CircleCardStripeCertificationInput> = {}
): CircleCardStripeCertificationInput {
  return {
    secretKey: "sk_live_example",
    expectedMode: "live",
    expectedProductId: "prod_circle_card_pro",
    expectedPriceId: "price_circle_card_pro_monthly",
    product: {
      id: "prod_circle_card_pro",
      active: true,
      livemode: true,
      deleted: false
    },
    price: {
      id: "price_circle_card_pro_monthly",
      active: true,
      livemode: true,
      currency: "gbp",
      unitAmount: 999,
      type: "recurring",
      recurring: { interval: "month", intervalCount: 1 },
      productId: "prod_circle_card_pro"
    },
    ...overrides
  };
}

describe("Circle Card Stripe configuration certification", () => {
  it("certifies the exact monthly £9.99 live configuration", () => {
    const result = certifyCircleCardStripeConfiguration(validInput());

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.checks).toHaveLength(13);
  });

  it("can deliberately certify an isolated test-mode configuration", () => {
    const input = validInput({
      secretKey: "sk_test_example",
      expectedMode: "test",
      product: {
        id: "prod_circle_card_pro",
        active: true,
        livemode: false
      },
      price: {
        ...validInput().price,
        livemode: false
      }
    });

    expect(certifyCircleCardStripeConfiguration(input).ok).toBe(true);
  });

  it.each([
    ["inactive product", { product: { ...validInput().product, active: false } }],
    ["deleted product", { product: { ...validInput().product, deleted: true } }],
    ["inactive price", { price: { ...validInput().price, active: false } }],
    ["wrong currency", { price: { ...validInput().price, currency: "usd" } }],
    ["wrong amount", { price: { ...validInput().price, unitAmount: 1000 } }],
    ["one-off price", { price: { ...validInput().price, type: "one_time", recurring: null } }],
    [
      "wrong interval",
      { price: { ...validInput().price, recurring: { interval: "year", intervalCount: 1 } } }
    ],
    [
      "wrong interval count",
      { price: { ...validInput().price, recurring: { interval: "month", intervalCount: 3 } } }
    ],
    ["wrong product link", { price: { ...validInput().price, productId: "prod_other" } }],
    ["wrong Stripe mode", { secretKey: "sk_test_example" }]
  ])("rejects %s", (_label, overrides) => {
    const result = certifyCircleCardStripeConfiguration(
      validInput(overrides as Partial<CircleCardStripeCertificationInput>)
    );

    expect(result.ok).toBe(false);
    expect(result.checks.some((check) => !check.ok)).toBe(true);
  });
});
