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
vi.mock("@/lib/utils", () => ({
  absoluteUrl: (path: string) => `https://thebusinesscircle.net${path}`
}));

import {
  createCircleCardBillingPortalSession,
  createCircleCardProCheckoutSession,
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

function paidInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "in_paid_1",
    object: "invoice",
    status: "paid",
    subscription: "sub_pro_1",
    customer: "cus_pro_1",
    created: nowSeconds,
    status_transitions: { paid_at: nowSeconds },
    lines: {
      data: [
        {
          id: "il_pro_1",
          type: "subscription",
          proration: false,
          price: { id: "price_pro_monthly" },
          period: { start: periodStart, end: periodEnd }
        }
      ]
    },
    ...overrides
  } as unknown as Stripe.Invoice;
}

function event(type: string, object: unknown, overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    object: "event",
    type,
    created: nowSeconds,
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
    process.env.STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID = "price_pro_monthly";
    process.env.CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID = "bpc_circle_card_pro";
    process.env.STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID = "";
    process.env.STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID = "";
    process.env.STRIPE_CIRCLE_CARD_TEAMS_ANNUAL_PRICE_ID = "";
    acquireLeaseMock.mockResolvedValue("acquired");
    canStartCheckoutMock.mockReturnValue(true);
    billingEnabledMock.mockReturnValue(true);
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
    customerCreateMock.mockResolvedValue({ id: "cus_pro_1" });
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
  });

  it("creates one server-derived monthly Checkout with an idempotency key", async () => {
    subscriptionFindUniqueMock.mockImplementation(async ({ select }: { select: Record<string, boolean> }) => {
      if (select?.plan) return null;
      if (select?.latestCheckoutSessionId) return null;
      if (select?.stripeCustomerId) return null;
      return null;
    });
    checkoutCreateMock.mockResolvedValue({
      id: "cs_new",
      url: "https://checkout.stripe.test/new",
      status: "open",
      expires_at: nowSeconds + 1800
    });

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
      metadata: { userId: "user-1", circleCardPlan: "PRO", billingPeriod: "monthly" }
    });
    expect(options.idempotencyKey).toMatch(/^circle-card-checkout:user-1:/);
    expect(customerCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: "user-1" } }),
      { idempotencyKey: "circle-card-customer:user-1" }
    );
  });

  it("reuses an open unexpired Checkout session", async () => {
    const pending = {
      latestCheckoutSessionId: "cs_pending",
      checkoutSessionExpiresAt: new Date(Date.now() + 600_000)
    };
    subscriptionFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pending);
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
    subscriptionFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pending);
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
    checkoutCreateMock.mockResolvedValueOnce({
      id: "cs_recovered",
      url: "https://checkout.stripe.test/recovered",
      status: "open",
      expires_at: Math.floor(startedAt.getTime() / 1000) + 35 * 60
    });

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

  it("replaces an old ambiguous attempt after open-session recovery finds nothing", async () => {
    const originalStart = new Date("2026-07-12T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(originalStart.getTime() + 5 * 60 * 1000));
    subscriptionFindUniqueMock.mockResolvedValue(null);
    subscriptionUpsertMock
      .mockResolvedValueOnce({
        checkoutAttemptId: "attempt_old",
        checkoutStartedAt: originalStart,
        latestCheckoutSessionId: null,
        checkoutSessionExpiresAt: null
      })
      .mockResolvedValueOnce({
        checkoutAttemptId: null,
        checkoutStartedAt: null,
        latestCheckoutSessionId: null,
        checkoutSessionExpiresAt: null
      });
    checkoutCreateMock.mockResolvedValue({
      id: "cs_new_after_ambiguity",
      url: "https://checkout.stripe.test/new-after-ambiguity",
      status: "open",
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60
    });

    const result = await createCircleCardProCheckoutSession({
      userId: "user-1",
      email: "member@example.com"
    });

    expect(result.id).toBe("cs_new_after_ambiguity");
    expect(checkoutCreateMock.mock.calls[0]?.[1].idempotencyKey).not.toContain("attempt_old");
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
    checkoutCreateMock.mockResolvedValue({
      id: "cs_untracked",
      url: "https://checkout.stripe.test/untracked",
      status: "open",
      expires_at: Math.floor(Date.now() / 1000) + 2100
    });

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
    await processCircleCardStripeWebhookEvent(event("invoice.payment_failed", paidInvoice({ status: "open" })));
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
      event("invoice.payment_failed", paidInvoice({ status: "open" }))
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
      lines: {
        data: [
          {
            id: "il_next_cycle",
            type: "subscription",
            proration: false,
            price: { id: "price_pro_monthly" },
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

  it("reconstructs a missed payment failure and its original grace deadline", async () => {
    const failedInvoice = paidInvoice({
      status: "open",
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
        configuration: "bpc_circle_card_pro"
      })
    );
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
