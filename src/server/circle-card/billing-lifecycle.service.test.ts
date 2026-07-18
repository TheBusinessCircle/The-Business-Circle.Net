import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const subscriptionFindUniqueMock = vi.hoisted(() => vi.fn());
const subscriptionFindFirstMock = vi.hoisted(() => vi.fn());
const subscriptionUpsertMock = vi.hoisted(() => vi.fn());
const subscriptionUpdateMock = vi.hoisted(() => vi.fn());
const subscriptionUpdateManyMock = vi.hoisted(() => vi.fn());
const referralFindUniqueMock = vi.hoisted(() => vi.fn());
const referralUpdateManyMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());
const bcnSubscriptionFindUniqueMock = vi.hoisted(() => vi.fn());
const checkoutCreateMock = vi.hoisted(() => vi.fn());
const checkoutRetrieveMock = vi.hoisted(() => vi.fn());
const checkoutExpireMock = vi.hoisted(() => vi.fn());
const checkoutListMock = vi.hoisted(() => vi.fn());
const customerListMock = vi.hoisted(() => vi.fn());
const customerCreateMock = vi.hoisted(() => vi.fn());
const customerRetrieveMock = vi.hoisted(() => vi.fn());
const customerUpdateMock = vi.hoisted(() => vi.fn());
const subscriptionsListMock = vi.hoisted(() => vi.fn());
const subscriptionRetrieveMock = vi.hoisted(() => vi.fn());
const invoiceRetrieveMock = vi.hoisted(() => vi.fn());
const portalCreateMock = vi.hoisted(() => vi.fn());
const acquireLeaseMock = vi.hoisted(() => vi.fn());
const markProcessedMock = vi.hoisted(() => vi.fn());
const markFailedMock = vi.hoisted(() => vi.fn());
const logInfoMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());
const canStartCheckoutMock = vi.hoisted(() => vi.fn());
const billingEnabledMock = vi.hoisted(() => vi.fn());
const proActivatedEmailMock = vi.hoisted(() => vi.fn());
const paymentFailedEmailMock = vi.hoisted(() => vi.fn());
const cancellationScheduledEmailMock = vi.hoisted(() => vi.fn());
const subscriptionRestoredEmailMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock },
    subscription: { findUnique: bcnSubscriptionFindUniqueMock },
    circleCardSubscription: {
      findUnique: subscriptionFindUniqueMock,
      findFirst: subscriptionFindFirstMock,
      upsert: subscriptionUpsertMock,
      update: subscriptionUpdateMock,
      updateMany: subscriptionUpdateManyMock,
      count: vi.fn()
    },
    circleCardGrowthReferral: {
      findUnique: referralFindUniqueMock,
      updateMany: referralUpdateManyMock,
      count: vi.fn()
    },
    circleCardCommissionLedger: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}));
vi.mock("@/server/stripe/client", () => ({
  requireStripeClient: () => ({
    checkout: {
      sessions: {
        create: checkoutCreateMock,
        retrieve: checkoutRetrieveMock,
        expire: checkoutExpireMock,
        list: checkoutListMock
      }
    },
    customers: {
      list: customerListMock,
      create: customerCreateMock,
      retrieve: customerRetrieveMock,
      update: customerUpdateMock
    },
    subscriptions: { list: subscriptionsListMock, retrieve: subscriptionRetrieveMock },
    invoices: { retrieve: invoiceRetrieveMock },
    billingPortal: { sessions: { create: portalCreateMock } }
  })
}));
vi.mock("@/server/subscriptions/subscription.service", () => ({
  acquireWebhookProcessingLease: acquireLeaseMock,
  markWebhookProcessed: markProcessedMock,
  markWebhookFailed: markFailedMock,
  stripeStatusToSubscriptionStatus: (status: string) => status.toUpperCase()
}));
vi.mock("@/lib/circle-card/pricing", () => ({
  CIRCLE_CARD_PRICING_CONFIG: { PRO: { priceMonthly: 9.99, priceAnnual: null } },
  getCircleCardProBillingConfigurationErrorMessage: () => null,
  isCircleCardBillingEnabled: billingEnabledMock,
  canUserStartCircleCardCheckout: canStartCheckoutMock
}));
vi.mock("@/lib/security/logging", () => ({
  logServerInfo: logInfoMock,
  logServerWarning: logWarningMock
}));
vi.mock("@/server/circle-card/billing-lifecycle-email.service", () => ({
  sendCircleCardProActivatedEmail: proActivatedEmailMock,
  sendCircleCardProPaymentFailedEmail: paymentFailedEmailMock,
  sendCircleCardProCancellationScheduledEmail: cancellationScheduledEmailMock,
  sendCircleCardProSubscriptionRestoredEmail: subscriptionRestoredEmailMock
}));
vi.mock("@/lib/utils", () => ({
  absoluteUrl: (path: string) =>
    `${process.env.APP_BRAND === "circle-card" ? "https://circlecard.co.uk" : "https://thebusinesscircle.net"}${path}`
}));

import {
  createCircleCardBillingPortalSession,
  createCircleCardProCheckoutSession,
  ensureCircleCardStripeCustomerId,
  processCircleCardStripeWebhookEvent,
  reconcileCircleCardSubscriptionForUser
} from "@/server/circle-card/billing.service";

const nowSeconds = Math.floor(new Date("2026-07-12T12:00:00.000Z").getTime() / 1000);
const periodStart = nowSeconds;
const periodEnd = nowSeconds + 31 * 24 * 60 * 60;

function stripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_pro_1",
    object: "subscription",
    status: "active",
    customer: "cus_pro_1",
    metadata: { userId: "user-1", circleCardPlan: "PRO" },
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: null,
    latest_invoice: null,
    items: {
      data: [
        {
          id: "si_pro_1",
          price: { id: "price_pro_monthly", product: "prod_pro" }
        }
      ]
    },
    ...overrides
  } as unknown as Stripe.Subscription;
}

function authoritativeMonthlyPrice() {
  return {
    id: "price_pro_monthly",
    object: "price",
    product: "prod_pro",
    currency: "gbp",
    unit_amount: 999,
    recurring: { interval: "month" }
  };
}

function authoritativeSubscription(overrides: Record<string, unknown> = {}) {
  return stripeSubscription({
    items: {
      data: [
        {
          id: "si_pro_1",
          price: authoritativeMonthlyPrice()
        }
      ]
    },
    ...overrides
  });
}

function stripeCustomer(id = "cus_pro_1", userId = "user-1") {
  return {
    id,
    object: "customer",
    deleted: false,
    metadata: { userId }
  } as unknown as Stripe.Customer;
}

function paidInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "in_paid_1",
    object: "invoice",
    status: "paid",
    paid: true,
    subscription: "sub_pro_1",
    customer: "cus_pro_1",
    currency: "gbp",
    created: nowSeconds,
    status_transitions: { paid_at: nowSeconds },
    lines: {
      data: [
        {
          id: "il_pro_1",
          type: "subscription",
          proration: false,
          price: authoritativeMonthlyPrice(),
          period: { start: periodStart, end: periodEnd }
        }
      ]
    },
    ...overrides
  } as unknown as Stripe.Invoice;
}

function authoritativeInvoice(overrides: Record<string, unknown> = {}) {
  return paidInvoice({
    currency: "gbp",
    lines: {
      data: [
        {
          id: "il_pro_1",
          type: "subscription",
          proration: false,
          price: authoritativeMonthlyPrice(),
          period: { start: periodStart, end: periodEnd }
        }
      ]
    },
    ...overrides
  });
}

function event(type: string, object: unknown, overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    object: "event",
    type,
    created: nowSeconds,
    livemode: false,
    data: { object },
    ...overrides
  } as unknown as Stripe.Event;
}

function openCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_open",
    object: "checkout.session",
    mode: "subscription",
    status: "open",
    url: "https://checkout.stripe.test/open",
    created: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 1800,
    customer: "cus_pro_1",
    client_reference_id: "user-1",
    metadata: {
      userId: "user-1",
      circleCardPlan: "PRO",
      billingPeriod: "monthly",
      source: "circle_card_pro_checkout"
    },
    line_items: {
      data: [{ price: { id: "price_pro_monthly" }, quantity: 1 }]
    },
    ...overrides
  } as unknown as Stripe.Checkout.Session;
}

function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ccs_1",
    userId: "user-1",
    plan: "PRO",
    status: "ACTIVE",
    billingInterval: "MONTH",
    stripeCustomerId: "cus_pro_1",
    stripeSubscriptionId: "sub_pro_1",
    stripePriceId: "price_pro_monthly",
    stripeProductId: "prod_pro",
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
    accessEndsAt: new Date(periodStart * 1000),
    lastPaidPeriodStart: null,
    lastPaidPeriodEnd: null,
    lastPaidInvoiceId: null,
    lastInvoicePaidAt: null,
    paymentFailedAt: null,
    recoveryGraceEndsAt: null,
    paymentFailureInvoiceId: null,
    paymentFailurePeriodStart: null,
    paymentFailurePeriodEnd: null,
    recoveredAt: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    cancellationEffectiveAt: null,
    latestCheckoutSessionId: null,
    checkoutSessionExpiresAt: null,
    checkoutStartedAt: null,
    checkoutAttemptId: null,
    lastStripeEventCreatedAt: null,
    lastStripeEventId: null,
    lastPaymentEventCreatedAt: null,
    lastPaymentEventId: null,
    reconciliationRequiredAt: null,
    reconciliationReason: null,
    ...overrides
  };
}

function accessUser(overrides: Record<string, unknown> = {}) {
  return {
    role: "MEMBER",
    membershipTier: "FOUNDATION",
    suspended: false,
    subscription: null,
    circleCardSubscription: null,
    circleCardAmbassadorProfile: null,
    circleCardAccessGrant: null,
    ...overrides
  };
}

describe("Circle Card billing lifecycle service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_BRAND;
    process.env.STRIPE_SECRET_KEY = "sk_test_synthetic";
    process.env.STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID = "price_pro_monthly";
    process.env.CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID = "bpc_circle_card_pro";
    process.env.STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID = "";
    process.env.STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID = "";
    process.env.STRIPE_CIRCLE_CARD_TEAMS_ANNUAL_PRICE_ID = "";
    acquireLeaseMock.mockResolvedValue("acquired");
    canStartCheckoutMock.mockReturnValue(true);
    billingEnabledMock.mockReturnValue(true);
    proActivatedEmailMock.mockResolvedValue({ sent: true, duplicate: false });
    paymentFailedEmailMock.mockResolvedValue({ sent: true, duplicate: false });
    cancellationScheduledEmailMock.mockResolvedValue({ sent: true, duplicate: false });
    subscriptionRestoredEmailMock.mockResolvedValue({ sent: true, duplicate: false });
    markProcessedMock.mockResolvedValue(undefined);
    markFailedMock.mockResolvedValue(undefined);
    subscriptionUpdateManyMock.mockResolvedValue({ count: 1 });
    subscriptionUpdateMock.mockImplementation(async ({ data }: { data: object }) => ({
      ...storedRow(),
      ...data
    }));
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_pro_1",
      status: "ACTIVE"
    });
    referralFindUniqueMock.mockResolvedValue(null);
    referralUpdateManyMock.mockResolvedValue({ count: 0 });
    bcnSubscriptionFindUniqueMock.mockResolvedValue(null);
    customerListMock.mockResolvedValue({ data: [] });
    customerCreateMock.mockResolvedValue(stripeCustomer());
    customerRetrieveMock.mockResolvedValue(stripeCustomer());
    customerUpdateMock.mockResolvedValue({ id: "cus_pro_1" });
    subscriptionsListMock.mockResolvedValue({ data: [] });
    subscriptionRetrieveMock.mockResolvedValue(stripeSubscription());
    invoiceRetrieveMock.mockResolvedValue(paidInvoice());
    portalCreateMock.mockResolvedValue({ url: "https://billing.stripe.test/session" });
    checkoutExpireMock.mockResolvedValue({ id: "cs_expired", status: "expired" });
    checkoutListMock.mockResolvedValue({ data: [] });
    userFindUniqueMock.mockResolvedValue(accessUser());
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.APP_BRAND;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("creates one server-derived monthly Checkout with an idempotency key", async () => {
    subscriptionFindUniqueMock.mockImplementation(async ({ select }: { select: Record<string, boolean> }) => {
      if (select?.plan) return null;
      if (select?.latestCheckoutSessionId) return null;
      if (select?.stripeCustomerId) return null;
      return null;
    });
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({
      id: "cs_new",
      url: "https://checkout.stripe.test/new",
      expires_at: nowSeconds + 1800
    }));

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com",
      name: "Member"
    });

    expect(result.reused).toBe(false);
    expect(checkoutCreateMock).toHaveBeenCalledOnce();
    const [params, options] = checkoutCreateMock.mock.calls[0];
    expect(params).toMatchObject({
      mode: "subscription",
      line_items: [{ price: "price_pro_monthly", quantity: 1 }],
      metadata: { userId: "user-1", circleCardPlan: "PRO", billingPeriod: "monthly" },
      success_url:
        "https://thebusinesscircle.net/dashboard/circle-card?billing=success&plan=pro&capability=explore_pro",
      cancel_url: expect.stringMatching(
        /^https:\/\/thebusinesscircle\.net\/circle-card\/pro\?.*&billing=cancelled$/
      )
    });
    expect(options.idempotencyKey).toMatch(/^circle-card-checkout:user-1:/);
    expect(customerCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: "user-1" } }),
      { idempotencyKey: "circle-card-customer:user-1" }
    );
  });

  it("creates a dedicated Circle Card customer instead of reusing a BCN customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_bcn_1" });
    customerCreateMock.mockResolvedValue(stripeCustomer("cus_circle_1"));

    await expect(
      ensureCircleCardStripeCustomerId({
        userId: "user-1",
        email: "member@example.com"
      })
    ).resolves.toBe("cus_circle_1");

    expect(customerCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: "user-1" } }),
      { idempotencyKey: "circle-card-customer:user-1" }
    );
  });

  it("refuses Checkout customer resolution for a legacy shared BCN relationship", async () => {
    subscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_shared" });
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_shared" });

    await expect(
      ensureCircleCardStripeCustomerId({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-billing-customer-isolation-required");

    expect(customerCreateMock).not.toHaveBeenCalled();
  });

  it("reuses an open unexpired Checkout session", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_pending",
      checkoutSessionExpiresAt: new Date(Date.now() + 600_000)
    };
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select: Record<string, boolean> }) => {
        if (select?.plan) return null;
        if (select?.stripeCustomerId) return { stripeCustomerId: "cus_pro_1" };
        if (select?.latestCheckoutSessionId) return pending;
        return null;
      }
    );
    checkoutRetrieveMock.mockResolvedValue(openCheckoutSession({
      id: "cs_pending",
      url: "https://checkout.stripe.test/pending",
      expires_at: Math.floor(Date.now() / 1000) + 600
    }));

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(result).toMatchObject({ id: "cs_pending", reused: true });
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("does not return a reusable Checkout URL for a legacy shared BCN customer", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_shared_customer",
      checkoutSessionExpiresAt: new Date(Date.now() + 600_000)
    };
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select: Record<string, boolean> }) => {
        if (select?.plan) return storedRow({ stripeCustomerId: "cus_shared" });
        if (select?.stripeCustomerId) return { stripeCustomerId: "cus_shared" };
        if (select?.latestCheckoutSessionId) return pending;
        return null;
      }
    );
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_shared" });

    await expect(
      createCircleCardProCheckoutSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-billing-customer-isolation-required");

    expect(checkoutRetrieveMock).not.toHaveBeenCalled();
  });

  it("fails closed for a tracked Circle Checkout session owned by another customer", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_wrong_customer",
      checkoutSessionExpiresAt: new Date(Date.now() + 600_000)
    };
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select: Record<string, boolean> }) => {
        if (select?.plan) return null;
        if (select?.stripeCustomerId) return { stripeCustomerId: "cus_pro_1" };
        if (select?.latestCheckoutSessionId) return pending;
        return null;
      }
    );
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_bcn_1" });
    checkoutRetrieveMock.mockResolvedValue(
      openCheckoutSession({ id: "cs_wrong_customer", customer: "cus_bcn_1" })
    );
    await expect(
      createCircleCardProCheckoutSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(checkoutExpireMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("fails closed for a completed tracked Checkout owned by another customer", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_completed_wrong_customer",
      checkoutSessionExpiresAt: new Date(Date.now() - 600_000)
    };
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select: Record<string, boolean> }) => {
        if (select?.plan) return null;
        if (select?.stripeCustomerId) return { stripeCustomerId: "cus_pro_1" };
        if (select?.latestCheckoutSessionId) return pending;
        return null;
      }
    );
    checkoutRetrieveMock.mockResolvedValue(
      openCheckoutSession({
        id: "cs_completed_wrong_customer",
        customer: "cus_other",
        status: "complete",
        url: null
      })
    );

    await expect(
      createCircleCardProCheckoutSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("does not create a new Checkout when Stripe already has a past-due subscription", async () => {
    subscriptionFindUniqueMock.mockImplementation(async ({ select }: { select: Record<string, boolean> }) => {
      if (select?.plan) {
        return storedRow({
          status: "PAST_DUE",
          accessEndsAt: new Date("2026-06-01T00:00:00.000Z"),
          paymentFailedAt: null,
          recoveryGraceEndsAt: null
        });
      }
      if (select?.stripeCustomerId) return { stripeCustomerId: "cus_pro_1" };
      return null;
    });
    subscriptionsListMock.mockResolvedValue({ data: [stripeSubscription({ status: "past_due" })] });
    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("circle-card-pro-existing-subscription");
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("blocks Checkout at the service boundary for a non-operator user", async () => {
    canStartCheckoutMock.mockReturnValue(false);

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("circle-card-billing-operator-restricted");
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(customerCreateMock).not.toHaveBeenCalled();
  });

  it("keeps signed webhooks and the existing Portal operational during emergency Checkout disablement", async () => {
    billingEnabledMock.mockReturnValue(false);
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [stripeSubscription()] });

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("Circle Card billing is disabled.");
    await expect(
      processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()))
    ).resolves.toBe(true);
    await expect(
      createCircleCardBillingPortalSession({ userId: "user-1", email: "member@example.com" })
    ).resolves.toMatchObject({ url: "https://billing.stripe.test/session" });

    expect(markProcessedMock).toHaveBeenCalled();
    expect(portalCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ configuration: "bpc_circle_card_pro" })
    );
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("expires and refuses a locally tracked session with the wrong price contract", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_wrong_price",
      checkoutSessionExpiresAt: new Date(Date.now() + 600_000)
    };
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select: Record<string, boolean> }) => {
        if (select?.plan) return null;
        if (select?.stripeCustomerId) return { stripeCustomerId: "cus_pro_1" };
        if (select?.latestCheckoutSessionId) return pending;
        return null;
      }
    );
    checkoutRetrieveMock.mockResolvedValue(openCheckoutSession({
      id: "cs_wrong_price",
      line_items: { data: [{ price: { id: "price_not_circle_card" }, quantity: 1 }] }
    }));
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({ id: "cs_replacement" }));

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(checkoutRetrieveMock).toHaveBeenCalledWith("cs_wrong_price", {
      expand: ["line_items"]
    });
    expect(checkoutExpireMock).toHaveBeenCalledWith("cs_wrong_price");
    expect(result.id).toBe("cs_replacement");
  });

  it.each([
    ["admin", accessUser({ role: "ADMIN" })],
    ["BCN membership", accessUser({ subscription: { status: "ACTIVE" } })],
    [
      "ambassador",
      accessUser({ circleCardAmbassadorProfile: { freeProGranted: true, active: true } })
    ],
    [
      "grandfathered",
      accessUser({
        circleCardAccessGrant: {
          plan: "PRO",
          source: "GRANDFATHERED",
          active: true,
          startsAt: null,
          endsAt: null
        }
      })
    ]
  ])("blocks unnecessary standalone Checkout for %s access", async (_label, user) => {
    userFindUniqueMock.mockResolvedValue(user);

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("circle-card-pro-already-included");
    expect(customerListMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("recovers a crash-window Checkout with the same persisted Stripe idempotency attempt", async () => {
    const startedAt = new Date("2026-07-12T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    subscriptionFindUniqueMock.mockResolvedValue(null);
    subscriptionUpsertMock.mockResolvedValueOnce({
      checkoutAttemptId: null,
      checkoutStartedAt: null,
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null
    });
    checkoutCreateMock.mockRejectedValueOnce(new Error("network response lost"));

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("network response lost");
    const firstAttemptId = subscriptionUpdateManyMock.mock.calls.find(
      ([call]) => call.data?.checkoutAttemptId
    )?.[0].data.checkoutAttemptId as string;
    expect(firstAttemptId).toBeTruthy();

    vi.setSystemTime(new Date(startedAt.getTime() + 3 * 60 * 1000));
    subscriptionUpsertMock.mockResolvedValueOnce({
      checkoutAttemptId: firstAttemptId,
      checkoutStartedAt: startedAt,
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null
    });
    checkoutCreateMock.mockResolvedValueOnce(openCheckoutSession({
      id: "cs_recovered",
      url: "https://checkout.stripe.test/recovered",
      expires_at: Math.floor(startedAt.getTime() / 1000) + 35 * 60
    }));

    const recovered = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(recovered).toMatchObject({ id: "cs_recovered", reused: true });
    expect(checkoutCreateMock.mock.calls[0]?.[1].idempotencyKey).toBe(
      checkoutCreateMock.mock.calls[1]?.[1].idempotencyKey
    );
  });

  it("adopts a server-authored open Stripe session that was not persisted locally", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    customerListMock.mockResolvedValue({
      data: [{ id: "cus_pro_1", email: "member@example.com" }]
    });
    checkoutListMock.mockResolvedValue({
      data: [openCheckoutSession({
        id: "cs_orphan_recovered",
        url: "https://checkout.stripe.test/orphan"
      })]
    });

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(result).toMatchObject({ id: "cs_orphan_recovered", reused: true });
    expect(subscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ latestCheckoutSessionId: "cs_orphan_recovered" })
      })
    );
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("fails closed instead of adopting an open Circle session from the BCN customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_bcn_1" });
    checkoutListMock.mockImplementation(async ({ customer }: { customer: string }) => ({
      data:
        customer === "cus_bcn_1"
          ? [
              openCheckoutSession({
                id: "cs_legacy_shared_customer",
                customer: "cus_bcn_1"
              })
            ]
          : []
    }));
    await expect(
      createCircleCardProCheckoutSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(checkoutListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_bcn_1" })
    );
    expect(customerCreateMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("fails closed for a non-terminal Circle subscription on the BCN customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_bcn_1" });
    subscriptionsListMock.mockImplementation(async ({ customer }: { customer: string }) => ({
      data:
        customer === "cus_bcn_1"
          ? [stripeSubscription({ customer: "cus_bcn_1" })]
          : []
    }));

    await expect(
      createCircleCardProCheckoutSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(subscriptionsListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_bcn_1" })
    );
    expect(customerCreateMock).not.toHaveBeenCalled();
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("expires an orphaned server-authored session whose monthly price contract no longer matches", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    checkoutListMock.mockResolvedValue({
      data: [openCheckoutSession({
        id: "cs_orphan_wrong_price",
        line_items: { data: [{ price: { id: "price_wrong" }, quantity: 1 }] }
      })]
    });
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({ id: "cs_correct_replacement" }));

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).resolves.toMatchObject({ id: "cs_correct_replacement" });

    expect(checkoutExpireMock).toHaveBeenCalledWith("cs_orphan_wrong_price");
    expect(checkoutCreateMock).toHaveBeenCalledOnce();
  });

  it("reuses an ambiguous attempt through the full payable Checkout lifetime", async () => {
    const originalStart = new Date("2026-07-12T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(originalStart.getTime() + 5 * 60 * 1000));
    subscriptionFindUniqueMock.mockResolvedValue(null);
    subscriptionUpsertMock.mockResolvedValueOnce({
      checkoutAttemptId: "attempt_old",
      checkoutStartedAt: originalStart,
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null,
      stripeSubscriptionId: null
    });
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({
      id: "cs_recovered_after_ambiguity",
      url: "https://checkout.stripe.test/recovered-after-ambiguity",
      expires_at: Math.floor(originalStart.getTime() / 1000) + 35 * 60
    }));

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(result.id).toBe("cs_recovered_after_ambiguity");
    expect(checkoutCreateMock.mock.calls[0]?.[1].idempotencyKey).toContain("attempt_old");
  });

  it("expires a Checkout session that cannot be persisted or verified as tracked", async () => {
    let pendingSessionRead = 0;
    subscriptionFindUniqueMock.mockImplementation(async ({ select }: { select: Record<string, boolean> }) => {
      if (select?.plan) return null;
      if (select?.latestCheckoutSessionId) {
        pendingSessionRead += 1;
        return pendingSessionRead === 1 ? null : { latestCheckoutSessionId: "cs_other" };
      }
      return null;
    });
    subscriptionUpsertMock.mockResolvedValue({
      checkoutAttemptId: null,
      checkoutStartedAt: null,
      latestCheckoutSessionId: null,
      checkoutSessionExpiresAt: null
    });
    subscriptionUpdateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({
      id: "cs_untracked",
      url: "https://checkout.stripe.test/untracked",
      expires_at: Math.floor(Date.now() / 1000) + 2100
    }));

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).rejects.toThrow("circle-card-checkout-persistence-conflict");
    expect(checkoutExpireMock).toHaveBeenCalledWith("cs_untracked");
  });

  it("never adopts a Stripe customer based only on a matching email address", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    customerListMock.mockResolvedValue({
      data: [
        { id: "cus_first", email: "member@example.com" },
        { id: "cus_second", email: "member@example.com" }
      ]
    });
    subscriptionsListMock.mockImplementation(async ({ customer }: { customer: string }) => ({
      data: customer === "cus_second" ? [stripeSubscription({ customer: "cus_second" })] : []
    }));
    checkoutCreateMock.mockResolvedValue(openCheckoutSession({ id: "cs_owned_customer" }));

    await expect(
      createCircleCardProCheckoutSession({ userId: "user-1", email: "member@example.com" })
    ).resolves.toMatchObject({ id: "cs_owned_customer" });
    expect(customerListMock).not.toHaveBeenCalled();
    expect(customerUpdateMock).not.toHaveBeenCalled();
    expect(subscriptionsListMock).toHaveBeenCalledOnce();
    expect(subscriptionsListMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_pro_1" })
    );
  });

  it("advances accessEndsAt only from the paid invoice line period", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    await processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()));

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "ccs_1",
          OR: [{ accessEndsAt: null }, { accessEndsAt: { lt: new Date(periodEnd * 1000) } }]
        }),
        data: expect.objectContaining({
          accessEndsAt: new Date(periodEnd * 1000),
          lastPaidPeriodStart: new Date(periodStart * 1000),
          lastPaidPeriodEnd: new Date(periodEnd * 1000),
          lastPaidInvoiceId: "in_paid_1"
        })
      })
    );
    expect(markProcessedMock).toHaveBeenCalled();
  });

  it("creates clean Circle Card Checkout return URLs only for the Circle Card runtime", async () => {
    process.env.APP_BRAND = "circle-card";
    subscriptionFindUniqueMock.mockResolvedValue(null);
    checkoutCreateMock.mockResolvedValue(
      openCheckoutSession({
        id: "cs_circle_runtime",
        url: "https://checkout.stripe.test/circle-runtime",
        expires_at: nowSeconds + 1800
      })
    );

    await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "https://circlecard.co.uk/app?billing=success&plan=pro&capability=explore_pro",
        cancel_url: expect.stringMatching(
          /^https:\/\/circlecard\.co\.uk\/pro\?.*&billing=cancelled$/
        )
      }),
      expect.any(Object)
    );
  });

  it("sends Pro activation only after the first authoritative paid invoice advances access", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.paid",
        authoritativeInvoice({ billing_reason: "subscription_create" })
      )
    );

    expect(proActivatedEmailMock).toHaveBeenCalledWith({
      userId: "user-1",
      evidenceId: "in_paid_1",
      planName: "Circle Card Pro",
      monthlyPriceLabel: "£9.99 monthly",
      activationDate: new Date(nowSeconds * 1000),
      billingDateLabel: "Renews on",
      billingDate: new Date(periodEnd * 1000)
    });
    expect(markProcessedMock).toHaveBeenCalledWith("evt_invoice_paid");
  });

  it("does not send another activation for a renewal or reconciliation", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({ lastPaidInvoiceId: "in_original_activation" })
    );
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

    await processCircleCardStripeWebhookEvent(
      event("invoice.paid", authoritativeInvoice({ id: "in_renewal" }))
    );
    expect(proActivatedEmailMock).not.toHaveBeenCalled();

    subscriptionsListMock.mockResolvedValue({ data: [authoritativeSubscription()] });
    invoiceRetrieveMock.mockResolvedValue(authoritativeInvoice({ id: "in_reconciled" }));
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ latest_invoice: "in_reconciled" })
    );
    await reconcileCircleCardSubscriptionForUser("user-1");
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("accepts a zero-total renewal only when the configured recurring Price is authoritative", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({ lastPaidInvoiceId: "in_original_activation" })
    );
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.paid",
        authoritativeInvoice({
          id: "in_credited_renewal",
          billing_reason: "subscription_cycle",
          amount_due: 0,
          amount_paid: 0,
          subtotal: 0,
          total: 0
        })
      )
    );

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessEndsAt: new Date(periodEnd * 1000),
          lastPaidInvoiceId: "in_credited_renewal"
        })
      })
    );
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it.each(["trialing", "incomplete", "incomplete_expired"])(
    "never grants paid access from a zero-value %s subscription invoice",
    async (status) => {
      subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
      subscriptionRetrieveMock.mockResolvedValue(
        authoritativeSubscription({ status })
      );

      await processCircleCardStripeWebhookEvent(
        event(
          "invoice.paid",
          authoritativeInvoice({
            billing_reason: "subscription_create",
            amount_due: 0,
            amount_paid: 0,
            subtotal: 0,
            total: 0
          })
        )
      );

      expect(
        subscriptionUpdateManyMock.mock.calls.some(
          ([call]) => call.data?.accessEndsAt instanceof Date
        )
      ).toBe(false);
      expect(proActivatedEmailMock).not.toHaveBeenCalled();
    }
  );

  it.each(["manual", "subscription_update"])(
    "does not describe a %s invoice as initial Pro activation",
    async (billingReason) => {
      subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
      subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

      await processCircleCardStripeWebhookEvent(
        event(
          "invoice.paid",
          authoritativeInvoice({ billing_reason: billingReason })
        )
      );

      expect(proActivatedEmailMock).not.toHaveBeenCalled();
    }
  );

  it("does not grant access from a proration-only invoice", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());
    const prorationInvoice = authoritativeInvoice({
      billing_reason: "subscription_update",
      lines: {
        data: [
          {
            id: "il_proration",
            type: "subscription",
            proration: true,
            price: authoritativeMonthlyPrice(),
            period: { start: periodStart, end: periodEnd }
          }
        ]
      }
    });

    await processCircleCardStripeWebhookEvent(
      event("invoice.paid", prorationInvoice)
    );

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("sends the initial activation when reconciliation beats the delayed paid webhook", async () => {
    const firstInvoice = authoritativeInvoice({
      billing_reason: "subscription_create"
    });
    const currentSubscription = authoritativeSubscription({
      latest_invoice: "in_paid_1"
    });
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [currentSubscription] });
    subscriptionRetrieveMock.mockResolvedValue(currentSubscription);
    invoiceRetrieveMock.mockResolvedValue(firstInvoice);

    await reconcileCircleCardSubscriptionForUser("user-1");
    expect(proActivatedEmailMock).not.toHaveBeenCalled();

    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        lastPaidInvoiceId: "in_paid_1",
        lastInvoicePaidAt: new Date(nowSeconds * 1000),
        accessEndsAt: new Date(periodEnd * 1000)
      })
    );
    await processCircleCardStripeWebhookEvent(event("invoice.paid", firstInvoice));

    expect(proActivatedEmailMock).toHaveBeenCalledOnce();
    expect(proActivatedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceId: "in_paid_1", userId: "user-1" })
    );
  });

  it("does not send delayed activation after a newer invoice became authoritative", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        lastPaidInvoiceId: "in_newer_renewal",
        lastInvoicePaidAt: new Date((nowSeconds + 31 * 24 * 60 * 60) * 1000),
        accessEndsAt: new Date((periodEnd + 31 * 24 * 60 * 60) * 1000),
        paymentFailedAt: new Date((nowSeconds + 31 * 24 * 60 * 60 + 60) * 1000),
        lastPaymentEventCreatedAt: new Date(
          (nowSeconds + 31 * 24 * 60 * 60 + 60) * 1000
        ),
        lastPaymentEventId: "evt_newer_payment_failure"
      })
    );
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ status: "past_due" })
    );
    subscriptionUpdateManyMock.mockResolvedValue({ count: 0 });

    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.paid",
        authoritativeInvoice({ billing_reason: "subscription_create" }),
        { id: "evt_delayed_initial_invoice" }
      )
    );

    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("does not email or grant from a forged return without Stripe payment evidence", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
    subscriptionsListMock.mockResolvedValue({
      data: [authoritativeSubscription({ status: "incomplete", latest_invoice: null })]
    });

    await reconcileCircleCardSubscriptionForUser("user-1");

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("rejects paid invoice evidence with the wrong amount or currency", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());
    const wrongPriceInvoice = authoritativeInvoice({
      currency: "usd",
      lines: {
        data: [
          {
            id: "il_wrong_amount",
            type: "subscription",
            proration: false,
            price: {
              ...authoritativeMonthlyPrice(),
              currency: "usd",
              unit_amount: 1
            },
            period: { start: periodStart, end: periodEnd }
          }
        ]
      }
    });

    await processCircleCardStripeWebhookEvent(
      event("invoice.paid", wrongPriceInvoice)
    );

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it.each([
    ["open", false],
    ["draft", false],
    ["void", false],
    ["uncollectible", false],
    ["paid", false]
  ])(
    "does not grant from malformed invoice.paid evidence with status=%s paid=%s",
    async (status, paid) => {
      subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
      subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

      await processCircleCardStripeWebhookEvent(
        event(
          "invoice.paid",
          authoritativeInvoice({ status, paid, billing_reason: "subscription_create" })
        )
      );

      expect(
        subscriptionUpdateManyMock.mock.calls.some(
          ([call]) => call.data?.accessEndsAt instanceof Date
        )
      ).toBe(false);
      expect(proActivatedEmailMock).not.toHaveBeenCalled();
      expect(markProcessedMock).toHaveBeenCalled();
    }
  );

  it("rejects an invoice whose customer does not match its subscription", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.paid",
        authoritativeInvoice({ customer: "cus_different", billing_reason: "subscription_create" })
      )
    );

    expect(subscriptionUpsertMock).not.toHaveBeenCalled();
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
    expect(logWarningMock).toHaveBeenCalledWith(
      "circle-card-invoice-subscription-mismatch",
      expect.objectContaining({ eventType: "invoice.paid" })
    );
  });

  it("synchronizes current Stripe status when invoice.paid arrives before a status webhook", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ status: "INCOMPLETE" }));
    subscriptionRetrieveMock.mockResolvedValue(stripeSubscription({ status: "active" }));

    await processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()));

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE", stripeSubscriptionId: "sub_pro_1" })
      })
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessEndsAt: new Date(periodEnd * 1000) })
      })
    );
  });

  it("continues confirmed renewals for an exact stored subscription after a price-ID rotation", async () => {
    process.env.STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID = "price_pro_monthly_new";
    const legacyRow = storedRow({ stripePriceId: "price_pro_monthly" });
    subscriptionFindUniqueMock.mockResolvedValue(legacyRow);
    subscriptionRetrieveMock.mockResolvedValue(stripeSubscription());

    await processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()));

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessEndsAt: new Date(periodEnd * 1000),
          lastPaidInvoiceId: "in_paid_1"
        })
      })
    );
  });

  it("records a fixed failure grace and later clears it on paid recovery", async () => {
    const failedRow = storedRow({
      accessEndsAt: new Date((periodStart - 1) * 1000),
      status: "PAST_DUE"
    });
    subscriptionFindUniqueMock.mockResolvedValue(failedRow);
    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", paidInvoice({ status: "open", paid: false }))
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "ccs_1" }),
        data: expect.objectContaining({
          paymentFailedAt: new Date(nowSeconds * 1000),
          recoveryGraceEndsAt: new Date(nowSeconds * 1000 + 7 * 24 * 60 * 60 * 1000)
        })
      })
    );

    subscriptionUpdateMock.mockClear();
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        accessEndsAt: new Date((periodStart - 1) * 1000),
        paymentFailedAt: new Date(nowSeconds * 1000),
        recoveryGraceEndsAt: new Date(nowSeconds * 1000 + 7 * 24 * 60 * 60 * 1000)
      })
    );
    await processCircleCardStripeWebhookEvent(
      event("invoice.paid", paidInvoice(), { id: "evt_invoice_recovered", created: nowSeconds + 60 })
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentFailedAt: null, recoveryGraceEndsAt: null })
      })
    );
  });

  it("sends payment-failed mail only after a durable authoritative failure transition", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ status: "past_due" })
    );
    const failedInvoice = authoritativeInvoice({
      status: "open",
      paid: false,
      next_payment_attempt: nowSeconds + 86_400
    });

    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", failedInvoice)
    );

    expect(paymentFailedEmailMock).toHaveBeenCalledWith({
      userId: "user-1",
      evidenceId: "in_paid_1",
      planName: "Circle Card Pro",
      monthlyPriceLabel: "£9.99 monthly",
      failedAt: new Date(nowSeconds * 1000),
      retryDate: new Date((nowSeconds + 86_400) * 1000)
    });
  });

  it("stores failed-payment state even when the product email cannot be delivered", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ status: "past_due" })
    );
    paymentFailedEmailMock.mockResolvedValue({ sent: false, duplicate: false });

    await expect(
      processCircleCardStripeWebhookEvent(
        event(
          "invoice.payment_failed",
          authoritativeInvoice({ status: "open", paid: false })
        )
      )
    ).resolves.toBe(true);

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentFailedAt: new Date(nowSeconds * 1000) })
      })
    );
    expect(markProcessedMock).toHaveBeenCalledWith("evt_invoice_payment_failed");
    expect(markFailedMock).not.toHaveBeenCalled();
  });

  it("does not record failure state from a malformed payment-failed event for a paid invoice", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(authoritativeSubscription());

    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", authoritativeInvoice())
    );

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.paymentFailedAt instanceof Date
      )
    ).toBe(false);
    expect(paymentFailedEmailMock).not.toHaveBeenCalled();
  });

  it("does not record failure state without matching GBP Circle Card Price evidence", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ status: "past_due" })
    );
    const wrongProductInvoice = authoritativeInvoice({
      status: "open",
      paid: false,
      currency: "usd",
      lines: {
        data: [
          {
            id: "il_wrong_product",
            type: "subscription",
            proration: false,
            price: {
              ...authoritativeMonthlyPrice(),
              id: "price_other_product",
              currency: "usd"
            },
            period: { start: periodStart, end: periodEnd }
          }
        ]
      }
    });

    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", wrongProductInvoice)
    );

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.paymentFailedAt instanceof Date
      )
    ).toBe(false);
    expect(paymentFailedEmailMock).not.toHaveBeenCalled();
  });

  it("initializes failure grace atomically and never restarts an existing cycle", async () => {
    const existingFailure = storedRow({
      paymentFailedAt: new Date((nowSeconds - 120) * 1000),
      recoveryGraceEndsAt: new Date((nowSeconds - 120) * 1000 + 7 * 24 * 60 * 60 * 1000)
    });
    subscriptionFindUniqueMock.mockResolvedValue(existingFailure);
    subscriptionUpdateManyMock
      .mockResolvedValueOnce({ count: 1 }) // status snapshot
      .mockResolvedValueOnce({ count: 0 }) // initialize requires paymentFailedAt null
      .mockResolvedValueOnce({ count: 0 }) // same/older invoice is not a new cycle
      .mockResolvedValueOnce({ count: 0 }) // no backdate
      .mockResolvedValueOnce({ count: 1 }); // chronology only

    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", paidInvoice({ status: "open", paid: false }))
    );

    const failureWrites = subscriptionUpdateManyMock.mock.calls.map(([call]) => call);
    expect(failureWrites).toContainEqual(
      expect.objectContaining({
        where: expect.objectContaining({ paymentFailedAt: null }),
        data: expect.objectContaining({ recoveryGraceEndsAt: expect.any(Date) })
      })
    );
    expect(failureWrites).toContainEqual(
      expect.objectContaining({
        where: expect.objectContaining({ paymentFailedAt: { not: null } }),
        data: {
          lastPaymentEventCreatedAt: new Date(nowSeconds * 1000),
          lastPaymentEventId: "evt_invoice_payment_failed"
        }
      })
    );
  });

  it("starts a new fixed grace for a later invoice cycle even if prior recovery arrives late", async () => {
    const nextPeriodEnd = periodEnd + 31 * 24 * 60 * 60;
    const nextInvoice = paidInvoice({
      id: "in_failed_next_cycle",
      status: "open",
      paid: false,
      lines: {
        data: [
          {
            id: "il_next_cycle",
            type: "subscription",
            proration: false,
            price: authoritativeMonthlyPrice(),
            period: { start: periodEnd, end: nextPeriodEnd }
          }
        ]
      }
    });
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        paymentFailedAt: new Date((nowSeconds - 31 * 24 * 60 * 60) * 1000),
        recoveryGraceEndsAt: new Date((nowSeconds - 24 * 24 * 60 * 60) * 1000),
        paymentFailureInvoiceId: "in_failed_previous_cycle",
        paymentFailurePeriodEnd: new Date(periodEnd * 1000),
        lastPaymentEventCreatedAt: new Date((nowSeconds - 60) * 1000),
        lastPaymentEventId: "evt_previous_failure"
      })
    );
    subscriptionUpdateManyMock
      .mockResolvedValueOnce({ count: 1 }) // status snapshot
      .mockResolvedValueOnce({ count: 0 }) // existing failure
      .mockResolvedValueOnce({ count: 1 }); // later invoice cycle restart

    await processCircleCardStripeWebhookEvent(
      event("invoice.payment_failed", nextInvoice, {
        id: "evt_new_cycle_failure",
        created: nowSeconds
      })
    );

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentFailedAt: new Date(nowSeconds * 1000),
          recoveryGraceEndsAt: new Date(nowSeconds * 1000 + 7 * 24 * 60 * 60 * 1000),
          paymentFailureInvoiceId: "in_failed_next_cycle",
          paymentFailurePeriodEnd: new Date(nextPeriodEnd * 1000)
        })
      })
    );
  });

  it("does not reopen failure state when an older payment_failed arrives after recovery", async () => {
    const recoveredAt = new Date((nowSeconds + 120) * 1000);
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        paymentFailedAt: null,
        paymentFailureInvoiceId: null,
        recoveredAt,
        lastPaymentEventCreatedAt: recoveredAt,
        lastPaymentEventId: "evt_newer_paid"
      })
    );
    subscriptionRetrieveMock.mockResolvedValue(
      authoritativeSubscription({ status: "active" })
    );
    subscriptionUpdateManyMock.mockResolvedValue({ count: 0 });

    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.payment_failed",
        authoritativeInvoice({ status: "open", paid: false }),
        { id: "evt_older_failure", created: nowSeconds }
      )
    );

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentFailedAt: null,
          OR: expect.any(Array)
        })
      })
    );
    expect(paymentFailedEmailMock).not.toHaveBeenCalled();
  });

  it("does not process an exact duplicate event twice", async () => {
    acquireLeaseMock.mockResolvedValue("processed");
    await processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()));
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("allows only one concurrent delivery of the same event to mutate lifecycle state", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    acquireLeaseMock
      .mockResolvedValueOnce("acquired")
      .mockResolvedValueOnce("busy");
    const delivered = event("invoice.paid", paidInvoice());

    const results = await Promise.allSettled([
      processCircleCardStripeWebhookEvent(delivered),
      processCircleCardStripeWebhookEvent(delivered)
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: expect.objectContaining({ message: "stripe-webhook-event-processing-in-progress" })
    });
    expect(subscriptionRetrieveMock).toHaveBeenCalledOnce();
    expect(markProcessedMock).toHaveBeenCalledOnce();
  });

  it("marks a webhook failure retryable and completes a later redelivery", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionRetrieveMock.mockRejectedValueOnce(new Error("temporary Stripe failure"));
    const delivered = event("invoice.paid", paidInvoice(), { id: "evt_retryable_paid" });

    await expect(processCircleCardStripeWebhookEvent(delivered)).rejects.toThrow(
      "temporary Stripe failure"
    );
    expect(markFailedMock).toHaveBeenCalledWith("evt_retryable_paid", expect.any(Error));

    await expect(processCircleCardStripeWebhookEvent(delivered)).resolves.toBe(true);
    expect(markProcessedMock).toHaveBeenCalledWith("evt_retryable_paid");
  });

  it("records Checkout completion status without inventing paid-through access", async () => {
    subscriptionFindFirstMock.mockResolvedValue({ id: "ccs_1" });
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ status: "INCOMPLETE" }));

    await processCircleCardStripeWebhookEvent(
      event("checkout.session.completed", {
        id: "cs_completed",
        object: "checkout.session",
        metadata: { userId: "user-1", circleCardPlan: "PRO" },
        subscription: "sub_pro_1",
        customer: "cus_pro_1"
      })
    );

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) })
    );
    expect(
      subscriptionUpdateManyMock.mock.calls.some(([call]) => "accessEndsAt" in (call.data ?? {}))
    ).toBe(false);
  });

  it("fails a legacy Checkout webhook instead of adopting the BCN customer", async () => {
    subscriptionFindFirstMock.mockResolvedValue({ id: "ccs_legacy_checkout" });
    subscriptionFindUniqueMock.mockResolvedValue(null);
    bcnSubscriptionFindUniqueMock.mockImplementation(async ({ where }) =>
      where.stripeCustomerId
        ? { userId: "user-1", stripeCustomerId: "cus_bcn_legacy" }
        : null
    );
    customerRetrieveMock.mockResolvedValue(stripeCustomer("cus_bcn_legacy"));
    subscriptionRetrieveMock.mockResolvedValue(
      stripeSubscription({ customer: "cus_bcn_legacy" })
    );

    await expect(
      processCircleCardStripeWebhookEvent(
        event("checkout.session.completed", {
          id: "cs_legacy_bcn",
          object: "checkout.session",
          metadata: { userId: "user-1", circleCardPlan: "PRO" },
          subscription: "sub_pro_1",
          customer: "cus_bcn_legacy"
        })
      )
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(subscriptionUpsertMock).not.toHaveBeenCalled();
    expect(markFailedMock).toHaveBeenCalledWith(
      "evt_checkout_session_completed",
      expect.any(Error)
    );
  });

  it.each([
    [
      "subscription",
      () => event("customer.subscription.updated", stripeSubscription({ customer: "cus_wrong" }))
    ],
    [
      "invoice",
      () => event("invoice.paid", paidInvoice({ customer: "cus_wrong" }))
    ]
  ])("fails a %s webhook when its customer differs from the stored Circle customer", async (_kind, makeEvent) => {
    subscriptionFindUniqueMock.mockImplementation(async ({ where }) => {
      if (where.stripeSubscriptionId) return null;
      if (where.userId) return storedRow();
      if (where.stripeCustomerId) return null;
      return null;
    });
    customerRetrieveMock.mockResolvedValue(stripeCustomer("cus_wrong"));
    subscriptionRetrieveMock.mockResolvedValue(stripeSubscription({ customer: "cus_wrong" }));

    await expect(processCircleCardStripeWebhookEvent(makeEvent())).rejects.toThrow(
      "circle-card-reconciliation-conflict"
    );

    expect(subscriptionUpsertMock).not.toHaveBeenCalled();
    expect(markFailedMock).toHaveBeenCalled();
  });

  it("fails a Circle webhook when another application user owns its customer", async () => {
    subscriptionFindUniqueMock.mockImplementation(async ({ where }) => {
      if (where.stripeSubscriptionId || where.userId) return null;
      if (where.stripeCustomerId) {
        return storedRow({
          userId: "user-2",
          stripeCustomerId: "cus_cross_user",
          stripeSubscriptionId: "sub_other"
        });
      }
      return null;
    });
    customerRetrieveMock.mockResolvedValue(stripeCustomer("cus_cross_user"));

    await expect(
      processCircleCardStripeWebhookEvent(
        event(
          "customer.subscription.updated",
          stripeSubscription({ customer: "cus_cross_user" })
        )
      )
    ).rejects.toThrow("circle-card-reconciliation-conflict");

    expect(subscriptionUpsertMock).not.toHaveBeenCalled();
    expect(markFailedMock).toHaveBeenCalled();
  });

  it("applies subscription deletion while preserving confirmed paid-through evidence", async () => {
    const accessEndsAt = new Date(periodEnd * 1000);
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt }));

    await processCircleCardStripeWebhookEvent(
      event(
        "customer.subscription.deleted",
        stripeSubscription({ status: "canceled", canceled_at: nowSeconds })
      )
    );

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELED", cancelledAt: new Date(nowSeconds * 1000) })
      })
    );
    expect(
      subscriptionUpdateManyMock.mock.calls.some(([call]) => call.data?.accessEndsAt === null)
    ).toBe(false);
  });

  it("fails closed before leasing a Circle event from the wrong Stripe mode", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());

    await expect(
      processCircleCardStripeWebhookEvent(
        event("invoice.paid", authoritativeInvoice(), { livemode: true })
      )
    ).rejects.toThrow("circle-card-stripe-event-mode-mismatch");

    expect(acquireLeaseMock).not.toHaveBeenCalled();
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("fails closed in production when Stripe mode cannot be derived from configuration", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    delete process.env.STRIPE_SECRET_KEY;
    vi.stubEnv("NODE_ENV", "production");

    try {
      await expect(
        processCircleCardStripeWebhookEvent(
          event("invoice.paid", authoritativeInvoice(), { livemode: false })
        )
      ).rejects.toThrow("circle-card-stripe-event-mode-mismatch");
    } finally {
      vi.unstubAllEnvs();
    }

    expect(acquireLeaseMock).not.toHaveBeenCalled();
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
  });

  it("emails only an authoritative false-to-true cancellation schedule transition", async () => {
    const previous = storedRow({ cancelAtPeriodEnd: false });
    const updated = storedRow({
      cancelAtPeriodEnd: true,
      accessEndsAt: new Date(periodEnd * 1000),
      cancellationEffectiveAt: new Date(periodEnd * 1000),
      lastStripeEventId: "evt_customer_subscription_updated"
    });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select?: Record<string, boolean> }) => {
      if (select?.id && Object.keys(select).length === 1) return { id: "ccs_1" };
      if (select?.cancelAtPeriodEnd && !select?.plan) return previous;
      if (!select) return updated;
        return previous;
      }
    );

    await processCircleCardStripeWebhookEvent(
      event(
        "customer.subscription.updated",
        authoritativeSubscription({ cancel_at_period_end: true })
      )
    );

    expect(cancellationScheduledEmailMock).toHaveBeenCalledWith({
      userId: "user-1",
      evidenceId: `sub_pro_1:${periodEnd * 1000}`,
      planName: "Circle Card Pro",
      monthlyPriceLabel: "£9.99 monthly",
      cancellationScheduledAt: new Date(nowSeconds * 1000),
      accessEndsAt: new Date(periodEnd * 1000)
    });
  });

  it("emails only an authoritative true-to-false subscription restoration", async () => {
    const previous = storedRow({
      cancelAtPeriodEnd: true,
      cancellationEffectiveAt: new Date(periodEnd * 1000)
    });
    const updated = storedRow({
      cancelAtPeriodEnd: false,
      accessEndsAt: new Date(periodEnd * 1000),
      cancellationEffectiveAt: null,
      lastStripeEventId: "evt_customer_subscription_updated"
    });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select?: Record<string, boolean> }) => {
      if (select?.id && Object.keys(select).length === 1) return { id: "ccs_1" };
      if (select?.cancelAtPeriodEnd && !select?.plan) return previous;
      if (!select) return updated;
        return previous;
      }
    );

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.updated", authoritativeSubscription())
    );

    expect(subscriptionRestoredEmailMock).toHaveBeenCalledWith({
      userId: "user-1",
      evidenceId: `sub_pro_1:${periodEnd * 1000}`,
      planName: "Circle Card Pro",
      monthlyPriceLabel: "£9.99 monthly",
      restoredAt: new Date(nowSeconds * 1000),
      renewalDate: new Date(periodEnd * 1000)
    });
  });

  it("uses Stripe previous_attributes when reconciliation applied cancellation first", async () => {
    const current = storedRow({
      cancelAtPeriodEnd: true,
      accessEndsAt: new Date(periodEnd * 1000),
      cancellationEffectiveAt: new Date(periodEnd * 1000),
      lastStripeEventId: "reconcile:sub_pro_1"
    });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select?: Record<string, boolean> }) => {
        if (select?.id && Object.keys(select).length === 1) return { id: "ccs_1" };
        return current;
      }
    );
    const subscription = authoritativeSubscription({ cancel_at_period_end: true });

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.updated", subscription, {
        data: {
          object: subscription,
          previous_attributes: { cancel_at_period_end: false }
        }
      })
    );

    expect(cancellationScheduledEmailMock).toHaveBeenCalledOnce();
  });

  it("does not invent a cancellation transition when the first stored webhook is already scheduled", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_pro_1",
      status: "ACTIVE"
    });

    await processCircleCardStripeWebhookEvent(
      event(
        "customer.subscription.updated",
        authoritativeSubscription({ cancel_at_period_end: true })
      )
    );

    expect(cancellationScheduledEmailMock).not.toHaveBeenCalled();
    expect(subscriptionRestoredEmailMock).not.toHaveBeenCalled();
  });

  it("does not misclassify an immediate cancellation as a restoration", async () => {
    const previous = storedRow({
      cancelAtPeriodEnd: true,
      accessEndsAt: new Date(periodEnd * 1000)
    });
    const canceled = storedRow({
      status: "CANCELED",
      cancelAtPeriodEnd: false,
      accessEndsAt: new Date(periodEnd * 1000),
      lastStripeEventId: "evt_customer_subscription_updated"
    });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select?: Record<string, boolean> }) => {
        if (select?.id && Object.keys(select).length === 1) return { id: "ccs_1" };
        if (select?.cancelAtPeriodEnd && !select?.plan) return previous;
        if (!select) return canceled;
        return previous;
      }
    );

    await processCircleCardStripeWebhookEvent(
      event(
        "customer.subscription.updated",
        authoritativeSubscription({ status: "canceled", cancel_at_period_end: false }),
        {
          data: {
            object: authoritativeSubscription({
              status: "canceled",
              cancel_at_period_end: false
            }),
            previous_attributes: { cancel_at_period_end: true }
          }
        }
      )
    );

    expect(subscriptionRestoredEmailMock).not.toHaveBeenCalled();
  });

  it.each([
    ["stale cancellation", true, false, false],
    ["stale restoration", false, true, true]
  ])(
    "does not email for %s after newer opposite state is stored",
    async (_label, incomingCancel, storedCancel, previousCancel) => {
      const current = storedRow({
        cancelAtPeriodEnd: storedCancel,
        accessEndsAt: new Date(periodEnd * 1000),
        lastStripeEventId: "evt_newer_opposite_state"
      });
      subscriptionFindUniqueMock.mockResolvedValue(current);
      const subscription = authoritativeSubscription({
        cancel_at_period_end: incomingCancel
      });

      await processCircleCardStripeWebhookEvent(
        event("customer.subscription.updated", subscription, {
          id: "evt_older_transition",
          created: nowSeconds - 60,
          data: {
            object: subscription,
            previous_attributes: { cancel_at_period_end: previousCancel }
          }
        })
      );

      expect(cancellationScheduledEmailMock).not.toHaveBeenCalled();
      expect(subscriptionRestoredEmailMock).not.toHaveBeenCalled();
    }
  );

  it("does not email unchanged cancellation state or a stale status event", async () => {
    const unchanged = storedRow({
      cancelAtPeriodEnd: true,
      accessEndsAt: new Date(periodEnd * 1000),
      cancellationEffectiveAt: new Date(periodEnd * 1000),
      lastStripeEventId: "evt_newer_status"
    });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ select }: { select?: Record<string, boolean> }) => {
      if (select?.id && Object.keys(select).length === 1) return { id: "ccs_1" };
        return unchanged;
      }
    );

    await processCircleCardStripeWebhookEvent(
      event(
        "customer.subscription.updated",
        authoritativeSubscription({ cancel_at_period_end: true })
      )
    );

    expect(cancellationScheduledEmailMock).not.toHaveBeenCalled();
    expect(subscriptionRestoredEmailMock).not.toHaveBeenCalled();
  });

  it("emits a safe structured log when a status event observes confirmed access expired", async () => {
    const expiredAt = new Date((nowSeconds - 60) * 1000);
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: expiredAt }));

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.deleted", stripeSubscription({ status: "canceled" }), {
        id: "evt_access_expired"
      })
    );

    expect(logInfoMock).toHaveBeenCalledWith("circle-card-access-expired", {
      eventId: "evt_access_expired",
      userId: "user-1",
      accessEndsAt: expiredAt.toISOString()
    });
  });

  it("advances useful paid-through evidence even when its status snapshot is stale", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        accessEndsAt: new Date(periodStart * 1000),
        lastStripeEventCreatedAt: new Date((nowSeconds + 300) * 1000),
        lastStripeEventId: "evt_newer_status"
      })
    );
    subscriptionUpdateManyMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      data.lastStripeEventId ? { count: 0 } : { count: 1 }
    );

    await processCircleCardStripeWebhookEvent(event("invoice.paid", paidInvoice()));

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessEndsAt: new Date(periodEnd * 1000) })
      })
    );
  });

  it("supports cancellation followed by a new confirmed subscription without erasing history", async () => {
    const oldAccessEnd = new Date(periodStart * 1000);
    const canceledRow = storedRow({
      status: "CANCELED",
      stripeSubscriptionId: "sub_canceled",
      accessEndsAt: oldAccessEnd
    });
    const reactivatedSubscription = stripeSubscription({ id: "sub_reactivated" });
    const reactivatedRow = storedRow({
      stripeSubscriptionId: "sub_reactivated",
      accessEndsAt: oldAccessEnd
    });
    subscriptionFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(canceledRow)
      .mockResolvedValueOnce(reactivatedRow);
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_canceled",
      status: "CANCELED"
    });

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.created", reactivatedSubscription, {
        id: "evt_reactivated_subscription",
        created: nowSeconds + 60
      })
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeSubscriptionId: "sub_reactivated",
          status: "ACTIVE"
        })
      })
    );

    subscriptionFindUniqueMock.mockResolvedValue(reactivatedRow);
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_reactivated",
      status: "ACTIVE"
    });
    subscriptionRetrieveMock.mockResolvedValue(reactivatedSubscription);
    await processCircleCardStripeWebhookEvent(
      event(
        "invoice.paid",
        paidInvoice({ id: "in_reactivated", subscription: "sub_reactivated" }),
        { id: "evt_reactivated_paid", created: nowSeconds + 120 }
      )
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessEndsAt: new Date(periodEnd * 1000),
          lastPaidInvoiceId: "in_reactivated"
        })
      })
    );
  });

  it("does not claim an unrelated invoice that only shares the Stripe customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    const unrelatedInvoice = paidInvoice({
      id: "in_bcn_1",
      subscription: "sub_bcn_1",
      customer: "cus_pro_1",
      lines: {
        data: [
          {
            id: "il_bcn_1",
            type: "subscription",
            proration: false,
            price: { id: "price_bcn_membership" },
            period: { start: periodStart, end: periodEnd }
          }
        ]
      }
    });

    await expect(
      processCircleCardStripeWebhookEvent(event("invoice.payment_failed", unrelatedInvoice))
    ).resolves.toBe(false);
    expect(acquireLeaseMock).not.toHaveBeenCalled();
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
  });

  it("does not claim an unrelated Checkout session that only shares the Stripe customer", async () => {
    subscriptionFindFirstMock.mockResolvedValue(null);

    await expect(
      processCircleCardStripeWebhookEvent(
        event("checkout.session.completed", {
          id: "cs_bcn_1",
          object: "checkout.session",
          metadata: { product: "bcn-membership" },
          subscription: "sub_bcn_1",
          customer: "cus_pro_1"
        })
      )
    ).resolves.toBe(false);
    expect(acquireLeaseMock).not.toHaveBeenCalled();
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
  });

  it("treats refund notifications as non-destructive and never invents an entitlement change", async () => {
    await expect(
      processCircleCardStripeWebhookEvent(
        event("charge.refunded", {
          id: "ch_synthetic_refund",
          object: "charge",
          refunded: true
        })
      )
    ).resolves.toBe(false);

    expect(acquireLeaseMock).not.toHaveBeenCalled();
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(subscriptionUpdateManyMock).not.toHaveBeenCalled();
  });

  it("ignores a stale subscription status event without overwriting state", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        lastStripeEventCreatedAt: new Date((nowSeconds + 60) * 1000),
        lastStripeEventId: "evt_newer"
      })
    );
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_pro_1",
      status: "ACTIVE"
    });
    subscriptionUpdateManyMock.mockResolvedValue({ count: 0 });

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.updated", stripeSubscription(), { id: "evt_older" })
    );
    expect(markProcessedMock).toHaveBeenCalledWith("evt_older");
  });

  it("detects a competing subscription created concurrently instead of overwriting it", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);
    subscriptionUpsertMock.mockResolvedValue({
      id: "ccs_1",
      stripeSubscriptionId: "sub_competing",
      status: "ACTIVE"
    });

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.created", stripeSubscription())
    );

    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ccs_1" },
        data: expect.objectContaining({ reconciliationRequiredAt: expect.any(Date) })
      })
    );
    expect(subscriptionUpdateManyMock).not.toHaveBeenCalled();
    expect(markProcessedMock).toHaveBeenCalled();
  });

  it("clears only the matching expired Checkout session", async () => {
    subscriptionFindFirstMock.mockResolvedValue({ id: "ccs_1" });
    await processCircleCardStripeWebhookEvent(
      event("checkout.session.expired", {
        id: "cs_expired",
        object: "checkout.session",
        metadata: { userId: "user-1", circleCardPlan: "PRO" },
        subscription: null,
        customer: "cus_pro_1"
      })
    );
    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", latestCheckoutSessionId: "cs_expired" } })
    );
  });

  it("reports multiple Stripe subscriptions as a reconciliation conflict", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({
      data: [stripeSubscription(), stripeSubscription({ id: "sub_pro_2" })]
    });
    const result = await reconcileCircleCardSubscriptionForUser("user-1");
    expect(result.outcome).toBe("conflict");
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reconciliationRequiredAt: expect.any(Date) }) })
    );
  });

  it("returns no subscription without contacting Stripe when the user has no Stripe customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(null);

    await expect(reconcileCircleCardSubscriptionForUser("user-1")).resolves.toEqual({
      outcome: "no_subscription",
      subscriptionId: null,
      accessEndsAt: null
    });
    expect(subscriptionsListMock).not.toHaveBeenCalled();
    expect(subscriptionUpdateManyMock).not.toHaveBeenCalled();
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("does not grant during reconciliation for an unpaid or incomplete subscription", async () => {
    const incomplete = authoritativeSubscription({
      status: "incomplete",
      latest_invoice: "in_unpaid"
    });
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ accessEndsAt: null }));
    subscriptionsListMock.mockResolvedValue({ data: [incomplete] });
    subscriptionRetrieveMock.mockResolvedValue(incomplete);
    invoiceRetrieveMock.mockResolvedValue(
      authoritativeInvoice({
        id: "in_unpaid",
        status: "open",
        paid: false,
        attempt_count: 0
      })
    );

    await reconcileCircleCardSubscriptionForUser("user-1");

    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("fails reconciliation closed when the stored subscription changes to an unknown price", async () => {
    const wrongPrice = stripeSubscription({
      items: {
        data: [
          {
            id: "si_wrong_price",
            price: { ...authoritativeMonthlyPrice(), id: "price_wrong" }
          }
        ]
      }
    });
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [wrongPrice] });

    await expect(reconcileCircleCardSubscriptionForUser("user-1")).resolves.toMatchObject({
      outcome: "conflict"
    });
    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("fails reconciliation safely when the Stripe customer belongs to another local account", async () => {
    const stored = storedRow({ stripeCustomerId: "cus_other_owner" });
    const remote = authoritativeSubscription({ customer: "cus_other_owner" });
    subscriptionFindUniqueMock.mockImplementation(
      async ({ where }: { where: Record<string, string> }) => {
      if (where.stripeCustomerId) {
        return { userId: "user-2", stripeCustomerId: "cus_other_owner" };
      }
        return stored;
      }
    );
    subscriptionsListMock.mockResolvedValue({ data: [remote] });
    customerRetrieveMock.mockResolvedValue(stripeCustomer("cus_other_owner", "user-1"));

    await expect(reconcileCircleCardSubscriptionForUser("user-1")).rejects.toThrow(
      "circle-card-reconciliation-conflict"
    );
    expect(
      subscriptionUpdateManyMock.mock.calls.some(
        ([call]) => call.data?.accessEndsAt instanceof Date
      )
    ).toBe(false);
    expect(proActivatedEmailMock).not.toHaveBeenCalled();
  });

  it("reconstructs a missed payment failure and its original grace deadline", async () => {
    const failedInvoice = paidInvoice({
      status: "open",
      paid: false,
      attempt_count: 1,
      status_transitions: { finalized_at: nowSeconds }
    });
    const pastDueSubscription = stripeSubscription({
      status: "past_due",
      latest_invoice: "in_paid_1"
    });
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [pastDueSubscription] });
    subscriptionRetrieveMock.mockResolvedValue(pastDueSubscription);
    invoiceRetrieveMock.mockResolvedValue(failedInvoice);

    await reconcileCircleCardSubscriptionForUser("user-1");

    expect(subscriptionUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentFailedAt: new Date(nowSeconds * 1000),
          recoveryGraceEndsAt: new Date(nowSeconds * 1000 + 7 * 24 * 60 * 60 * 1000)
        })
      })
    );
  });

  it("does not clear a recorded reconciliation conflict from an ordinary status event", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(
      storedRow({
        reconciliationRequiredAt: new Date("2026-07-12T11:00:00.000Z"),
        reconciliationReason: "Multiple non-terminal Circle Card subscriptions require review."
      })
    );

    await processCircleCardStripeWebhookEvent(
      event("customer.subscription.updated", stripeSubscription())
    );

    const statusWrite = subscriptionUpdateManyMock.mock.calls.find(
      ([call]) => call.data?.lastStripeEventId === "evt_customer_subscription_updated"
    )?.[0];
    expect(statusWrite?.data).not.toHaveProperty("reconciliationRequiredAt");
    expect(statusWrite?.data).not.toHaveProperty("reconciliationReason");
  });

  it("still opens the billing portal when reconciliation reports duplicate subscriptions", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({
      data: [stripeSubscription(), stripeSubscription({ id: "sub_pro_2" })]
    });

    await expect(
      createCircleCardBillingPortalSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).resolves.toMatchObject({ url: "https://billing.stripe.test/session" });
    expect(portalCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_pro_1" })
    );
  });

  it("uses the dedicated Circle Card Portal configuration without changing BCN Portal behavior", async () => {
    process.env.CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID = "bpc_circle_card_pro";
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [stripeSubscription()] });

    await createCircleCardBillingPortalSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(portalCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_pro_1",
        configuration: "bpc_circle_card_pro",
        return_url:
          "https://thebusinesscircle.net/dashboard/circle-card?billing=portal-return"
      })
    );
  });

  it("uses the Circle Card canonical Portal return in the Circle Card runtime", async () => {
    process.env.APP_BRAND = "circle-card";
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());
    subscriptionsListMock.mockResolvedValue({ data: [authoritativeSubscription()] });

    await createCircleCardBillingPortalSession({
      userId: "user-1",
      email: "member@example.com",
      returnPath: "/app?billing=portal-return"
    });

    expect(portalCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: "https://circlecard.co.uk/app?billing=portal-return"
      })
    );
  });

  it("fails closed when a legacy Circle Card relationship shares its BCN customer", async () => {
    subscriptionFindUniqueMock.mockResolvedValue(storedRow({ stripeCustomerId: "cus_shared" }));
    bcnSubscriptionFindUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_shared" });

    await expect(
      createCircleCardBillingPortalSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-billing-customer-isolation-required");

    expect(subscriptionsListMock).not.toHaveBeenCalled();
    expect(portalCreateMock).not.toHaveBeenCalled();
  });

  it("fails closed when the dedicated Circle Card Portal configuration is missing", async () => {
    process.env.CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID = "";
    subscriptionFindUniqueMock.mockResolvedValue(storedRow());

    await expect(
      createCircleCardBillingPortalSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).rejects.toThrow("circle-card-billing-portal-configuration-missing");
    expect(portalCreateMock).not.toHaveBeenCalled();
  });

  it("opens the portal for an expired customer relationship without creating a customer", async () => {
    subscriptionFindUniqueMock
      .mockResolvedValueOnce({ stripeCustomerId: "cus_pro_1" })
      .mockResolvedValueOnce(storedRow())
      .mockResolvedValueOnce(storedRow())
      .mockResolvedValueOnce({ accessEndsAt: new Date(periodStart * 1000), stripeSubscriptionId: "sub_pro_1" });
    subscriptionsListMock.mockResolvedValue({ data: [stripeSubscription({ status: "canceled" })] });
    subscriptionRetrieveMock.mockResolvedValue(stripeSubscription({ status: "canceled" }));
    subscriptionUpsertMock.mockResolvedValue({ id: "ccs_1" });

    await expect(
      createCircleCardBillingPortalSession({
        userId: "user-1",
        email: "member@example.com"
      })
    ).resolves.toMatchObject({ url: "https://billing.stripe.test/session" });
    expect(customerCreateMock).not.toHaveBeenCalled();
  });
});
