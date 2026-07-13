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
    expectedPortalConfigurationId: "bpc_circle_card_pro",
    product: {
      id: "prod_circle_card_pro",
      name: "Circle Card Pro",
      description: "Unlock the full working version of Circle Card with two professional identities, 25 active links, Circle Studio, Business Builder, Creator Media Kit, Audience Snapshot and expanded presentation tools.",
      active: true,
      livemode: true,
      metadata: { product_key: "circle_card_pro" },
      deleted: false
    },
    price: {
      id: "price_circle_card_pro_monthly",
      active: true,
      livemode: true,
      currency: "gbp",
      unitAmount: 999,
      type: "recurring",
      billingScheme: "per_unit",
      recurring: { interval: "month", intervalCount: 1, usageType: "licensed", trialPeriodDays: null },
      productId: "prod_circle_card_pro",
      metadata: { price_key: "circle_card_pro_monthly_gbp" }
    },
    portal: {
      id: "bpc_circle_card_pro",
      active: true,
      livemode: true,
      defaultReturnUrl: "https://thebusinesscircle.net/dashboard/circle-card",
      privacyPolicyUrl: "https://thebusinesscircle.net/privacy-policy",
      termsOfServiceUrl: "https://thebusinesscircle.net/terms-of-service",
      paymentMethodUpdate: true,
      invoiceHistory: true,
      subscriptionCancel: true,
      cancellationMode: "at_period_end",
      subscriptionUpdate: false,
      allowedSubscriptionUpdates: [],
      metadata: { configuration_key: "circle_card_pro_portal", display_name: "Circle Card Pro Portal" }
    },
    webhook: {
      id: "we_shared",
      url: "https://thebusinesscircle.net/api/stripe/webhook",
      status: "enabled",
      livemode: true,
      enabledEvents: [
        "checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_failed",
        "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
        "invoice.paid", "invoice.payment_failed", "invoice.payment_action_required", "charge.refunded",
        "identity.verification_session.verified"
      ]
    },
    ...overrides
  };
}

describe("Circle Card Stripe configuration certification", () => {
  it("certifies the exact monthly £9.99 live configuration", () => {
    const result = certifyCircleCardStripeConfiguration(validInput());

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.checks).toHaveLength(33);
  });

  it("can deliberately certify an isolated test-mode configuration", () => {
    const input = validInput({
      secretKey: "sk_test_example",
      expectedMode: "test",
      product: {
        ...validInput().product,
        livemode: false
      },
      price: {
        ...validInput().price,
        livemode: false
      },
      portal: { ...validInput().portal, livemode: false },
      webhook: { ...validInput().webhook, livemode: false }
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
      { price: { ...validInput().price, recurring: { ...validInput().price.recurring!, interval: "year" } } }
    ],
    [
      "wrong interval count",
      { price: { ...validInput().price, recurring: { ...validInput().price.recurring!, intervalCount: 3 } } }
    ],
    ["wrong product link", { price: { ...validInput().price, productId: "prod_other" } }],
    ["metered usage", { price: { ...validInput().price, recurring: { ...validInput().price.recurring!, usageType: "metered" } } }],
    ["trial", { price: { ...validInput().price, recurring: { ...validInput().price.recurring!, trialPeriodDays: 7 } } }],
    ["Portal switching", { portal: { ...validInput().portal, subscriptionUpdate: true } }],
    ["missing webhook event", { webhook: { ...validInput().webhook, enabledEvents: [] } }],
    ["wrong Stripe mode", { secretKey: "sk_test_example" }]
  ])("rejects %s", (_label, overrides) => {
    const result = certifyCircleCardStripeConfiguration(
      validInput(overrides as Partial<CircleCardStripeCertificationInput>)
    );

    expect(result.ok).toBe(false);
    expect(result.checks.some((check) => !check.ok)).toBe(true);
  });
});
