import { describe, expect, it } from "vitest";
import { updateEnvironmentFileContent } from "../scripts/circle-card-env-file";
import {
  CIRCLE_CARD_STRIPE_PORTAL_KEY,
  CIRCLE_CARD_STRIPE_PRICE_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION,
  CIRCLE_CARD_STRIPE_PRODUCT_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_NAME,
  SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS,
  SHARED_STRIPE_WEBHOOK_URL,
  maskStripeIdentifier
} from "../scripts/circle-card-stripe-operator-config";
import {
  CircleCardStripeSetupConflict,
  runCircleCardStripeSetup,
  type CircleCardStripeOperatorApi,
  type PortalSnapshot,
  type PriceSnapshot,
  type ProductSnapshot,
  type WebhookSnapshot
} from "../scripts/circle-card-stripe-setup";
import {
  parseCircleCardStripeSetupArgs,
  describeCircleCardStripeSetupResult,
  validateCircleCardStripeSetupEnvironment
} from "../scripts/setup-circle-card-pro-stripe";

const product = (overrides: Partial<ProductSnapshot> = {}): ProductSnapshot => ({
  id: "prod_circle_card",
  name: CIRCLE_CARD_STRIPE_PRODUCT_NAME,
  description: CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION,
  active: true,
  livemode: true,
  metadata: { product_key: CIRCLE_CARD_STRIPE_PRODUCT_KEY },
  ...overrides
});

const price = (overrides: Partial<PriceSnapshot> = {}): PriceSnapshot => ({
  id: "price_circle_card_monthly",
  productId: "prod_circle_card",
  active: true,
  livemode: true,
  currency: "gbp",
  unitAmount: 999,
  type: "recurring",
  billingScheme: "per_unit",
  interval: "month",
  intervalCount: 1,
  usageType: "licensed",
  trialPeriodDays: null,
  metadata: { price_key: CIRCLE_CARD_STRIPE_PRICE_KEY },
  ...overrides
});

const portal = (overrides: Partial<PortalSnapshot> = {}): PortalSnapshot => ({
  id: "bpc_circle_card",
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
  metadata: {
    configuration_key: CIRCLE_CARD_STRIPE_PORTAL_KEY,
    display_name: "Circle Card Pro Portal"
  },
  ...overrides
});

const webhook = (overrides: Partial<WebhookSnapshot> = {}): WebhookSnapshot => ({
  id: "we_shared",
  url: SHARED_STRIPE_WEBHOOK_URL,
  status: "enabled",
  livemode: true,
  enabledEvents: [...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS, "identity.verification_session.verified"],
  metadata: {},
  ...overrides
});

class MockStripeApi implements CircleCardStripeOperatorApi {
  products: ProductSnapshot[];
  prices: PriceSnapshot[];
  portals: PortalSnapshot[];
  webhooks: WebhookSnapshot[];
  mutations = { product: 0, price: 0, priceMetadata: 0, portal: 0, webhook: 0 };

  constructor(input: {
    products?: ProductSnapshot[];
    prices?: PriceSnapshot[];
    portals?: PortalSnapshot[];
    webhooks?: WebhookSnapshot[];
  } = {}) {
    this.products = input.products ?? [product()];
    this.prices = input.prices ?? [price()];
    this.portals = input.portals ?? [portal()];
    this.webhooks = input.webhooks ?? [webhook()];
  }

  async listProducts() { return this.products; }
  async createProduct() {
    this.mutations.product += 1;
    const created = product();
    this.products.push(created);
    return created;
  }
  async listPrices(productId: string) { return this.prices.filter((item) => item.productId === productId); }
  async createPrice(productId: string) {
    this.mutations.price += 1;
    const created = price({ productId });
    this.prices.push(created);
    return created;
  }
  async applyPriceMetadata(priceId: string) {
    this.mutations.priceMetadata += 1;
    const existing = this.prices.find((item) => item.id === priceId)!;
    existing.metadata = { ...existing.metadata, price_key: CIRCLE_CARD_STRIPE_PRICE_KEY };
    return existing;
  }
  async listPortalConfigurations() { return this.portals; }
  async createPortalConfiguration() {
    this.mutations.portal += 1;
    const created = portal();
    this.portals.push(created);
    return created;
  }
  async updatePortalConfiguration(configurationId: string) {
    this.mutations.portal += 1;
    const index = this.portals.findIndex((item) => item.id === configurationId);
    this.portals[index] = portal({ id: configurationId });
    return this.portals[index];
  }
  async listWebhookEndpoints() {
    return this.webhooks.map(({ secret: _secret, ...item }) => item);
  }
  async createWebhookEndpoint() {
    this.mutations.webhook += 1;
    const created = webhook({ secret: "whsec_must_never_be_logged" });
    this.webhooks.push(created);
    return created;
  }
  async updateWebhookEndpoint(endpointId: string, enabledEvents: string[]) {
    this.mutations.webhook += 1;
    const existing = this.webhooks.find((item) => item.id === endpointId)!;
    existing.enabledEvents = enabledEvents;
    existing.status = "enabled";
    return existing;
  }
}

describe("Circle Card live Stripe operator", () => {
  it("requires explicit live arguments and treats missing --execute as a dry run", () => {
    expect(parseCircleCardStripeSetupArgs(["--env-file", ".env.production", "--mode", "live"]))
      .toEqual({ envFile: ".env.production", mode: "live", execute: false });
    expect(() => parseCircleCardStripeSetupArgs(["--env-file", ".env.production", "--mode", "test"]))
      .toThrow("--mode live");
  });

  it("refuses enabled billing and test keys", () => {
    expect(() => validateCircleCardStripeSetupEnvironment({
      CIRCLE_CARD_BILLING_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_live_example",
      APP_URL: "https://thebusinesscircle.net"
    })).toThrow("must be explicitly false");
    expect(() => validateCircleCardStripeSetupEnvironment({
      CIRCLE_CARD_BILLING_ENABLED: "false",
      STRIPE_SECRET_KEY: "sk_test_example",
      APP_URL: "https://thebusinesscircle.net"
    })).toThrow("sk_live_");
  });

  it("performs a read-only plan when execute is absent", async () => {
    const api = new MockStripeApi();
    const run = await runCircleCardStripeSetup(api, false);
    expect(run.result).toBeNull();
    expect(run.plan.product.action).toBe("reuse");
    expect(api.mutations).toEqual({ product: 0, price: 0, priceMetadata: 0, portal: 0, webhook: 0 });
  });

  it("reuses exact resources and remains idempotent on repeated execution", async () => {
    const api = new MockStripeApi();
    await runCircleCardStripeSetup(api, true);
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations).toEqual({ product: 0, price: 0, priceMetadata: 0, portal: 0, webhook: 0 });
  });

  it("creates missing product and price exactly once", async () => {
    const api = new MockStripeApi({ products: [], prices: [] });
    await runCircleCardStripeSetup(api, true);
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations.product).toBe(1);
    expect(api.mutations.price).toBe(1);
  });

  it("creates a missing price once without duplicating the product", async () => {
    const api = new MockStripeApi({ prices: [] });
    await runCircleCardStripeSetup(api, true);
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations.product).toBe(0);
    expect(api.mutations.price).toBe(1);
  });

  it("adopts one exact unkeyed price instead of creating another", async () => {
    const api = new MockStripeApi({ prices: [price({ metadata: {} })] });
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations.price).toBe(0);
    expect(api.mutations.priceMetadata).toBe(1);
  });

  it("stops on duplicate keyed products or prices", async () => {
    await expect(runCircleCardStripeSetup(new MockStripeApi({
      products: [product(), product({ id: "prod_duplicate" })]
    }), false)).rejects.toBeInstanceOf(CircleCardStripeSetupConflict);
    await expect(runCircleCardStripeSetup(new MockStripeApi({
      prices: [price(), price({ id: "price_duplicate" })]
    }), false)).rejects.toBeInstanceOf(CircleCardStripeSetupConflict);
  });

  it("stops when a keyed resource competes with an exact unkeyed duplicate", async () => {
    await expect(runCircleCardStripeSetup(new MockStripeApi({
      products: [product(), product({ id: "prod_unkeyed", metadata: {} })]
    }), false)).rejects.toBeInstanceOf(CircleCardStripeSetupConflict);
    await expect(runCircleCardStripeSetup(new MockStripeApi({
      prices: [price(), price({ id: "price_unkeyed", metadata: {} })]
    }), false)).rejects.toBeInstanceOf(CircleCardStripeSetupConflict);
  });

  it("uses a separate keyed Portal configuration and leaves unrelated BCN config alone", async () => {
    const bcnPortal = portal({ id: "bpc_bcn", metadata: { configuration_key: "bcn_membership" } });
    const api = new MockStripeApi({ portals: [bcnPortal] });
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations.portal).toBe(1);
    expect(api.portals).toContain(bcnPortal);
    expect(api.portals).toHaveLength(2);
  });

  it("reuses the shared webhook and merges missing events without removing BCN events", async () => {
    const bcnEvent = "identity.verification_session.verified";
    const api = new MockStripeApi({ webhooks: [webhook({ enabledEvents: [bcnEvent] })] });
    await runCircleCardStripeSetup(api, true);
    expect(api.mutations.webhook).toBe(1);
    expect(api.webhooks[0].enabledEvents).toEqual(expect.arrayContaining([
      bcnEvent,
      ...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS
    ]));
  });

  it("creates a missing webhook only once and captures its secret for secure file storage", async () => {
    const api = new MockStripeApi({ webhooks: [] });
    const first = await runCircleCardStripeSetup(api, true);
    const second = await runCircleCardStripeSetup(api, true);
    expect(api.mutations.webhook).toBe(1);
    expect(first.result?.webhookSecret).toBe("whsec_must_never_be_logged");
    expect(second.result?.webhookSecret).toBeUndefined();
    expect(second.result?.webhookSecretRequiresManualConfirmation).toBe(true);
  });

  it("stops when the exact webhook URL has multiple enabled endpoints", async () => {
    const api = new MockStripeApi({ webhooks: [webhook(), webhook({ id: "we_duplicate" })] });
    await expect(runCircleCardStripeSetup(api, false)).rejects.toBeInstanceOf(
      CircleCardStripeSetupConflict
    );
  });

  it("preserves comments and unrelated values while replacing duplicate managed keys", () => {
    const original = [
      "# production settings",
      "UNRELATED=keep-me",
      "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=old",
      "# this comment remains",
      "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=duplicate",
      "CIRCLE_CARD_BILLING_ENABLED=false",
      ""
    ].join("\n");
    const updated = updateEnvironmentFileContent(original, {
      STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID: "prod_new",
      CIRCLE_CARD_BILLING_ENABLED: "false"
    });
    expect(updated).toContain("# production settings");
    expect(updated).toContain("UNRELATED=keep-me");
    expect(updated).toContain("# this comment remains");
    expect(updated.match(/STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID=/g)).toHaveLength(1);
    expect(updated).toContain('STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID="prod_new"');
  });

  it("masks identifiers and never turns a secret into reportable output", () => {
    const output = describeCircleCardStripeSetupResult({
      product: { id: "prod_circle_card_abcd" },
      price: { id: "price_circle_card_efgh" },
      portal: { id: "bpc_circle_card_ijkl" },
      webhook: { id: "we_circle_card_mnop" },
      webhookSecretRequiresManualConfirmation: false
    }).join("\n");
    expect(output).not.toContain("prod_circle_card_abcd");
    expect(output).not.toContain("price_circle_card_efgh");
    expect(output).not.toContain("whsec_must_never_be_logged");
    expect(maskStripeIdentifier("prod_circle_card_abcd")).toBe("prod_...abcd");
  });
});
