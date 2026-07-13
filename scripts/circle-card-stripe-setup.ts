import type Stripe from "stripe";
import {
  CIRCLE_CARD_PORTAL_RETURN_URL,
  CIRCLE_CARD_PRIVACY_URL,
  CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS,
  CIRCLE_CARD_STRIPE_PORTAL_KEY,
  CIRCLE_CARD_STRIPE_PORTAL_NAME,
  CIRCLE_CARD_STRIPE_PRICE_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION,
  CIRCLE_CARD_STRIPE_PRODUCT_KEY,
  CIRCLE_CARD_STRIPE_PRODUCT_NAME,
  CIRCLE_CARD_TERMS_URL,
  SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS,
  SHARED_STRIPE_WEBHOOK_URL,
  mergeWebhookEvents,
  requiredWebhookEventsPresent
} from "./circle-card-stripe-operator-config";

export type ProductSnapshot = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  livemode: boolean;
  metadata: Record<string, string>;
};

export type PriceSnapshot = {
  id: string;
  productId: string;
  active: boolean;
  livemode: boolean;
  currency: string;
  unitAmount: number | null;
  type: string;
  billingScheme: string;
  interval: string | null;
  intervalCount: number | null;
  usageType: string | null;
  trialPeriodDays: number | null;
  metadata: Record<string, string>;
};

export type PortalSnapshot = {
  id: string;
  active: boolean;
  livemode: boolean;
  defaultReturnUrl: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  paymentMethodUpdate: boolean;
  invoiceHistory: boolean;
  subscriptionCancel: boolean;
  cancellationMode: string;
  subscriptionUpdate: boolean;
  allowedSubscriptionUpdates: string[];
  metadata: Record<string, string>;
};

export type WebhookSnapshot = {
  id: string;
  url: string;
  status: string;
  livemode: boolean;
  enabledEvents: string[];
  metadata: Record<string, string>;
  secret?: string;
};

export interface CircleCardStripeOperatorApi {
  listProducts(): Promise<ProductSnapshot[]>;
  createProduct(): Promise<ProductSnapshot>;
  listPrices(productId: string): Promise<PriceSnapshot[]>;
  createPrice(productId: string): Promise<PriceSnapshot>;
  applyPriceMetadata(priceId: string): Promise<PriceSnapshot>;
  listPortalConfigurations(): Promise<PortalSnapshot[]>;
  createPortalConfiguration(): Promise<PortalSnapshot>;
  updatePortalConfiguration(configurationId: string): Promise<PortalSnapshot>;
  listWebhookEndpoints(): Promise<WebhookSnapshot[]>;
  createWebhookEndpoint(): Promise<WebhookSnapshot>;
  updateWebhookEndpoint(endpointId: string, enabledEvents: string[]): Promise<WebhookSnapshot>;
}

export class CircleCardStripeSetupConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircleCardStripeSetupConflict";
  }
}

export type SetupAction = "create" | "reuse" | "update" | "adopt-metadata" | "reactivate";

export type CircleCardStripeSetupPlan = {
  product: { action: SetupAction; id?: string };
  price: { action: SetupAction; id?: string };
  portal: { action: SetupAction; id?: string };
  webhook: { action: SetupAction; id?: string; addedEvents: string[]; preservesExistingEvents: boolean };
};

export type CircleCardStripeSetupResult = {
  product: ProductSnapshot;
  price: PriceSnapshot;
  portal: PortalSnapshot;
  webhook: WebhookSnapshot;
  webhookSecret?: string;
  webhookSecretRequiresManualConfirmation: boolean;
};

export async function runCircleCardStripeSetup(
  api: CircleCardStripeOperatorApi,
  execute: boolean
) {
  const plan = await buildCircleCardStripeSetupPlan(api);
  if (!execute) return { plan, result: null };
  return { plan, result: await executeCircleCardStripeSetup(api) };
}

function productIsExact(product: ProductSnapshot) {
  return product.name === CIRCLE_CARD_STRIPE_PRODUCT_NAME &&
    product.description === CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION &&
    product.active &&
    product.livemode &&
    product.metadata.product_key === CIRCLE_CARD_STRIPE_PRODUCT_KEY;
}

function priceSpecificationIsExact(price: PriceSnapshot, productId: string) {
  return price.productId === productId &&
    price.active &&
    price.livemode &&
    price.currency.toLowerCase() === "gbp" &&
    price.unitAmount === 999 &&
    price.type === "recurring" &&
    price.billingScheme === "per_unit" &&
    price.interval === "month" &&
    price.intervalCount === 1 &&
    price.usageType === "licensed" &&
    price.trialPeriodDays === null;
}

function portalIsExact(portal: PortalSnapshot) {
  return portal.active &&
    portal.livemode &&
    portal.defaultReturnUrl === CIRCLE_CARD_PORTAL_RETURN_URL &&
    portal.privacyPolicyUrl === CIRCLE_CARD_PRIVACY_URL &&
    portal.termsOfServiceUrl === CIRCLE_CARD_TERMS_URL &&
    portal.paymentMethodUpdate &&
    portal.invoiceHistory &&
    portal.subscriptionCancel &&
    portal.cancellationMode === "at_period_end" &&
    !portal.subscriptionUpdate &&
    portal.allowedSubscriptionUpdates.length === 0 &&
    portal.metadata.configuration_key === CIRCLE_CARD_STRIPE_PORTAL_KEY &&
    portal.metadata.display_name === CIRCLE_CARD_STRIPE_PORTAL_NAME;
}

function resolveProduct(products: ProductSnapshot[]) {
  const keyed = products.filter(
    (product) => product.metadata.product_key === CIRCLE_CARD_STRIPE_PRODUCT_KEY
  );
  if (keyed.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple Stripe products use product_key=circle_card_pro. Resolve the conflict before continuing."
    );
  }
  if (keyed.length === 1) {
    const competingProducts = products.filter(
      (product) => product.id !== keyed[0].id && product.name === CIRCLE_CARD_STRIPE_PRODUCT_NAME
    );
    if (competingProducts.length) {
      throw new CircleCardStripeSetupConflict(
        "More than one Circle Card Pro-named product exists. Stop and resolve the duplicate before continuing."
      );
    }
    if (!productIsExact(keyed[0])) {
      throw new CircleCardStripeSetupConflict(
        "The product_key=circle_card_pro product does not match the required active live product contract."
      );
    }
    return { action: "reuse" as const, product: keyed[0] };
  }

  const nameCollisions = products.filter((product) => product.name === CIRCLE_CARD_STRIPE_PRODUCT_NAME);
  if (nameCollisions.length) {
    throw new CircleCardStripeSetupConflict(
      "A Circle Card Pro product exists without the stable product key. Stop rather than create a duplicate."
    );
  }
  return { action: "create" as const, product: null };
}

function resolvePrice(prices: PriceSnapshot[], productId: string) {
  const keyed = prices.filter((price) => price.metadata.price_key === CIRCLE_CARD_STRIPE_PRICE_KEY);
  if (keyed.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple Stripe prices use price_key=circle_card_pro_monthly_gbp. Resolve the conflict before continuing."
    );
  }
  if (keyed.length === 1) {
    const competingPrices = prices.filter(
      (price) => price.id !== keyed[0].id && priceSpecificationIsExact(price, productId)
    );
    if (competingPrices.length) {
      throw new CircleCardStripeSetupConflict(
        "More than one exact Circle Card Pro monthly price exists. Stop and resolve the duplicate before continuing."
      );
    }
    if (!priceSpecificationIsExact(keyed[0], productId)) {
      throw new CircleCardStripeSetupConflict(
        "The keyed Circle Card Pro price does not match the required live GBP 999 monthly licensed contract."
      );
    }
    return { action: "reuse" as const, price: keyed[0] };
  }

  const exactUnkeyed = prices.filter((price) => priceSpecificationIsExact(price, productId));
  if (exactUnkeyed.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple exact unkeyed Circle Card Pro prices exist. Stop rather than guess which price to adopt."
    );
  }
  if (exactUnkeyed.length === 1) {
    if (exactUnkeyed[0].metadata.price_key) {
      throw new CircleCardStripeSetupConflict(
        "An exact Circle Card Pro price is already assigned a different stable price key."
      );
    }
    return { action: "adopt-metadata" as const, price: exactUnkeyed[0] };
  }
  return { action: "create" as const, price: null };
}

function resolvePortal(portals: PortalSnapshot[]) {
  const keyed = portals.filter(
    (portal) => portal.metadata.configuration_key === CIRCLE_CARD_STRIPE_PORTAL_KEY
  );
  if (keyed.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple Portal configurations use configuration_key=circle_card_pro_portal."
    );
  }
  if (keyed.length === 1) {
    if (!keyed[0].livemode) {
      throw new CircleCardStripeSetupConflict("The Circle Card Portal configuration is not live-mode.");
    }
    return { action: portalIsExact(keyed[0]) ? "reuse" as const : "update" as const, portal: keyed[0] };
  }

  const nameCollisions = portals.filter(
    (portal) => portal.metadata.display_name === CIRCLE_CARD_STRIPE_PORTAL_NAME
  );
  if (nameCollisions.length) {
    throw new CircleCardStripeSetupConflict(
      "A Portal configuration uses the Circle Card display name without the stable configuration key."
    );
  }
  return { action: "create" as const, portal: null };
}

function resolveWebhook(webhooks: WebhookSnapshot[]) {
  const matching = webhooks.filter((endpoint) => endpoint.url === SHARED_STRIPE_WEBHOOK_URL);
  const enabled = matching.filter((endpoint) => endpoint.status === "enabled");
  if (enabled.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple enabled webhook endpoints use the production shared webhook URL."
    );
  }

  let webhook: WebhookSnapshot | null = enabled[0] ?? null;
  let reactivating = false;
  if (!webhook && matching.length === 1) {
    webhook = matching[0];
    reactivating = true;
  } else if (!webhook && matching.length > 1) {
    throw new CircleCardStripeSetupConflict(
      "Multiple disabled webhook endpoints use the production shared webhook URL. Stop rather than guess."
    );
  }

  if (!webhook) {
    return {
      action: "create" as const,
      webhook: null,
      addedEvents: [...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS],
      preservesExistingEvents: true
    };
  }
  if (!webhook.livemode) {
    throw new CircleCardStripeSetupConflict("The matching production webhook endpoint is not live-mode.");
  }

  const merged = mergeWebhookEvents(webhook.enabledEvents);
  const addedEvents = merged.filter((event) => !webhook!.enabledEvents.includes(event));
  return {
    action: reactivating
      ? "reactivate" as const
      : requiredWebhookEventsPresent(webhook.enabledEvents)
        ? "reuse" as const
        : "update" as const,
    webhook,
    addedEvents,
    preservesExistingEvents: webhook.enabledEvents.every((event) => merged.includes(event))
  };
}

export async function buildCircleCardStripeSetupPlan(
  api: CircleCardStripeOperatorApi
): Promise<CircleCardStripeSetupPlan> {
  const [products, portals, webhooks] = await Promise.all([
    api.listProducts(),
    api.listPortalConfigurations(),
    api.listWebhookEndpoints()
  ]);
  const productResolution = resolveProduct(products);
  const priceResolution = productResolution.product
    ? resolvePrice(await api.listPrices(productResolution.product.id), productResolution.product.id)
    : { action: "create" as const, price: null };
  const portalResolution = resolvePortal(portals);
  const webhookResolution = resolveWebhook(webhooks);

  return {
    product: { action: productResolution.action, id: productResolution.product?.id },
    price: { action: priceResolution.action, id: priceResolution.price?.id },
    portal: { action: portalResolution.action, id: portalResolution.portal?.id },
    webhook: {
      action: webhookResolution.action,
      id: webhookResolution.webhook?.id,
      addedEvents: webhookResolution.addedEvents,
      preservesExistingEvents: webhookResolution.preservesExistingEvents
    }
  };
}

export async function executeCircleCardStripeSetup(
  api: CircleCardStripeOperatorApi
): Promise<CircleCardStripeSetupResult> {
  const productResolution = resolveProduct(await api.listProducts());
  const product = productResolution.product ?? await api.createProduct();

  const priceResolution = resolvePrice(await api.listPrices(product.id), product.id);
  const price = priceResolution.action === "reuse"
    ? priceResolution.price!
    : priceResolution.action === "adopt-metadata"
      ? await api.applyPriceMetadata(priceResolution.price!.id)
      : await api.createPrice(product.id);

  const portalResolution = resolvePortal(await api.listPortalConfigurations());
  const portal = portalResolution.action === "reuse"
    ? portalResolution.portal!
    : portalResolution.action === "update"
      ? await api.updatePortalConfiguration(portalResolution.portal!.id)
      : await api.createPortalConfiguration();

  const webhookResolution = resolveWebhook(await api.listWebhookEndpoints());
  const webhook = webhookResolution.action === "reuse"
    ? webhookResolution.webhook!
    : webhookResolution.action === "create"
      ? await api.createWebhookEndpoint()
      : await api.updateWebhookEndpoint(
          webhookResolution.webhook!.id,
          mergeWebhookEvents(webhookResolution.webhook!.enabledEvents)
        );

  if (!productIsExact(product) || !priceSpecificationIsExact(price, product.id) ||
      price.metadata.price_key !== CIRCLE_CARD_STRIPE_PRICE_KEY || !portalIsExact(portal) ||
      webhook.status !== "enabled" || !webhook.livemode ||
      webhook.url !== SHARED_STRIPE_WEBHOOK_URL || !requiredWebhookEventsPresent(webhook.enabledEvents)) {
    throw new CircleCardStripeSetupConflict(
      "Post-mutation verification did not match the required Circle Card Stripe contract."
    );
  }

  return {
    product,
    price,
    portal,
    webhook,
    webhookSecret: webhook.secret,
    webhookSecretRequiresManualConfirmation: !webhook.secret
  };
}

type StripeList<T> = { data: T[]; has_more: boolean };

async function collectPages<T extends { id: string }>(
  loader: (startingAfter?: string) => Promise<StripeList<T>>
) {
  const items: T[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await loader(startingAfter);
    items.push(...page.data);
    if (!page.has_more) break;
    const last = page.data.at(-1);
    if (!last || last.id === startingAfter) {
      throw new CircleCardStripeSetupConflict("Stripe pagination did not advance safely.");
    }
    startingAfter = last.id;
  } while (true);
  return items;
}

function productSnapshot(product: Stripe.Product): ProductSnapshot {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    active: product.active,
    livemode: product.livemode,
    metadata: product.metadata
  };
}

function priceSnapshot(price: Stripe.Price): PriceSnapshot {
  return {
    id: price.id,
    productId: typeof price.product === "string" ? price.product : price.product.id,
    active: price.active,
    livemode: price.livemode,
    currency: price.currency,
    unitAmount: price.unit_amount,
    type: price.type,
    billingScheme: price.billing_scheme,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
    usageType: price.recurring?.usage_type ?? null,
    trialPeriodDays: price.recurring?.trial_period_days ?? null,
    metadata: price.metadata
  };
}

function portalSnapshot(portal: Stripe.BillingPortal.Configuration): PortalSnapshot {
  return {
    id: portal.id,
    active: portal.active,
    livemode: portal.livemode,
    defaultReturnUrl: portal.default_return_url,
    privacyPolicyUrl: portal.business_profile.privacy_policy_url,
    termsOfServiceUrl: portal.business_profile.terms_of_service_url,
    paymentMethodUpdate: portal.features.payment_method_update.enabled,
    invoiceHistory: portal.features.invoice_history.enabled,
    subscriptionCancel: portal.features.subscription_cancel.enabled,
    cancellationMode: portal.features.subscription_cancel.mode,
    subscriptionUpdate: portal.features.subscription_update.enabled,
    allowedSubscriptionUpdates: portal.features.subscription_update.default_allowed_updates,
    metadata: portal.metadata ?? {}
  };
}

function webhookSnapshot(webhook: Stripe.WebhookEndpoint): WebhookSnapshot {
  return {
    id: webhook.id,
    url: webhook.url,
    status: webhook.status,
    livemode: webhook.livemode,
    enabledEvents: webhook.enabled_events,
    metadata: webhook.metadata ?? {},
    ...(webhook.secret ? { secret: webhook.secret } : {})
  };
}

const portalConfigurationParams = {
  default_return_url: CIRCLE_CARD_PORTAL_RETURN_URL,
  business_profile: {
    headline: CIRCLE_CARD_STRIPE_PORTAL_NAME,
    privacy_policy_url: CIRCLE_CARD_PRIVACY_URL,
    terms_of_service_url: CIRCLE_CARD_TERMS_URL
  },
  features: {
    customer_update: { enabled: false, allowed_updates: [] },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" as const },
    subscription_update: {
      enabled: false,
      default_allowed_updates: [] as never[],
      proration_behavior: "none" as const
    }
  },
  metadata: {
    configuration_key: CIRCLE_CARD_STRIPE_PORTAL_KEY,
    display_name: CIRCLE_CARD_STRIPE_PORTAL_NAME
  }
};

export function createCircleCardStripeOperatorApi(stripe: Stripe): CircleCardStripeOperatorApi {
  return {
    async listProducts() {
      const products = await collectPages((startingAfter) =>
        stripe.products.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) })
      );
      return products.map(productSnapshot);
    },
    async createProduct() {
      return productSnapshot(await stripe.products.create({
        name: CIRCLE_CARD_STRIPE_PRODUCT_NAME,
        description: CIRCLE_CARD_STRIPE_PRODUCT_DESCRIPTION,
        active: true,
        metadata: { product_key: CIRCLE_CARD_STRIPE_PRODUCT_KEY }
      }, { idempotencyKey: CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS.product }));
    },
    async listPrices(productId) {
      const listByActive = (active: boolean) => collectPages((startingAfter) =>
        stripe.prices.list({
          product: productId,
          active,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {})
        })
      );
      const [activePrices, inactivePrices] = await Promise.all([listByActive(true), listByActive(false)]);
      return [...activePrices, ...inactivePrices].map(priceSnapshot);
    },
    async createPrice(productId) {
      return priceSnapshot(await stripe.prices.create({
        product: productId,
        active: true,
        currency: "gbp",
        unit_amount: 999,
        billing_scheme: "per_unit",
        recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
        metadata: { price_key: CIRCLE_CARD_STRIPE_PRICE_KEY }
      }, { idempotencyKey: CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS.price }));
    },
    async applyPriceMetadata(priceId) {
      return priceSnapshot(await stripe.prices.update(priceId, {
        metadata: { price_key: CIRCLE_CARD_STRIPE_PRICE_KEY }
      }));
    },
    async listPortalConfigurations() {
      const portals = await collectPages((startingAfter) =>
        stripe.billingPortal.configurations.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {})
        })
      );
      return portals.map(portalSnapshot);
    },
    async createPortalConfiguration() {
      return portalSnapshot(await stripe.billingPortal.configurations.create(
        portalConfigurationParams,
        { idempotencyKey: CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS.portal }
      ));
    },
    async updatePortalConfiguration(configurationId) {
      return portalSnapshot(await stripe.billingPortal.configurations.update(
        configurationId,
        { ...portalConfigurationParams, active: true }
      ));
    },
    async listWebhookEndpoints() {
      const endpoints = await collectPages((startingAfter) =>
        stripe.webhookEndpoints.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {})
        })
      );
      return endpoints.map(webhookSnapshot);
    },
    async createWebhookEndpoint() {
      return webhookSnapshot(await stripe.webhookEndpoints.create({
        url: SHARED_STRIPE_WEBHOOK_URL,
        enabled_events: [...SHARED_STRIPE_WEBHOOK_REQUIRED_EVENTS],
        description: "The Business Circle shared webhook",
        metadata: { endpoint_key: "the_business_circle_shared" }
      }, { idempotencyKey: CIRCLE_CARD_SETUP_IDEMPOTENCY_KEYS.webhook }));
    },
    async updateWebhookEndpoint(endpointId, enabledEvents) {
      return webhookSnapshot(await stripe.webhookEndpoints.update(endpointId, {
        disabled: false,
        enabled_events: enabledEvents as Stripe.WebhookEndpointUpdateParams.EnabledEvent[]
      }));
    }
  };
}
