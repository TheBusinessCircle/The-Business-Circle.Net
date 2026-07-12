export type StripeMode = "live" | "test";

export type CircleCardStripeProductSnapshot = {
  id: string;
  active: boolean;
  livemode: boolean;
  deleted?: boolean;
};

export type CircleCardStripePriceSnapshot = {
  id: string;
  active: boolean;
  livemode: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  recurring: {
    interval: string;
    intervalCount: number;
  } | null;
  productId: string;
};

export type CircleCardStripeCertificationInput = {
  secretKey: string;
  expectedMode: StripeMode;
  expectedProductId: string;
  expectedPriceId: string;
  product: CircleCardStripeProductSnapshot;
  price: CircleCardStripePriceSnapshot;
};

export type CircleCardStripeCertificationResult = {
  ok: boolean;
  mode: StripeMode | "unknown";
  checks: Array<{
    name: string;
    ok: boolean;
    message: string;
  }>;
};

function secretKeyMode(secretKey: string): StripeMode | "unknown" {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}

export function certifyCircleCardStripeConfiguration(
  input: CircleCardStripeCertificationInput
): CircleCardStripeCertificationResult {
  const mode = secretKeyMode(input.secretKey);
  const expectedLivemode = input.expectedMode === "live";
  const checks: CircleCardStripeCertificationResult["checks"] = [];
  const check = (name: string, ok: boolean, message: string) => {
    checks.push({ name, ok, message });
  };

  check(
    "secret-key-mode",
    mode === input.expectedMode,
    mode === input.expectedMode
      ? `Stripe secret key is in expected ${input.expectedMode} mode.`
      : `Stripe secret key mode is ${mode}; expected ${input.expectedMode}.`
  );
  check(
    "product-id",
    input.product.id === input.expectedProductId,
    "Retrieved the configured Circle Card Pro product."
  );
  check("product-exists", !input.product.deleted, "Circle Card Pro product exists.");
  check("product-active", input.product.active, "Circle Card Pro product is active.");
  check(
    "product-mode",
    input.product.livemode === expectedLivemode,
    `Circle Card Pro product belongs to Stripe ${input.expectedMode} mode.`
  );
  check(
    "price-id",
    input.price.id === input.expectedPriceId,
    "Retrieved the configured Circle Card Pro monthly price."
  );
  check("price-active", input.price.active, "Circle Card Pro monthly price is active.");
  check(
    "price-mode",
    input.price.livemode === expectedLivemode,
    `Circle Card Pro monthly price belongs to Stripe ${input.expectedMode} mode.`
  );
  check(
    "price-currency",
    input.price.currency.toLowerCase() === "gbp",
    "Circle Card Pro monthly price currency is GBP."
  );
  check(
    "price-amount",
    input.price.unitAmount === 999,
    "Circle Card Pro monthly price unit amount is 999 pence (£9.99)."
  );
  check(
    "price-recurring",
    input.price.type === "recurring" && input.price.recurring !== null,
    "Circle Card Pro price is recurring."
  );
  check(
    "price-monthly-interval",
    input.price.recurring?.interval === "month" && input.price.recurring.intervalCount === 1,
    "Circle Card Pro price recurs every one month."
  );
  check(
    "price-product-link",
    input.price.productId === input.expectedProductId,
    "Circle Card Pro price belongs to the configured product."
  );

  return {
    ok: checks.every((item) => item.ok),
    mode,
    checks
  };
}
