import { MembershipTier, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { TERMS_VERSION } from "@/config/legal";

const stripeWebhookEventCreateMock = vi.hoisted(() => vi.fn(async () => ({})));
const stripeWebhookEventFindUniqueMock = vi.hoisted(() => vi.fn(async () => null));
const stripeWebhookEventUpdateManyMock = vi.hoisted(() => vi.fn(async () => ({ count: 1 })));
const stripeWebhookEventUpdateMock = vi.hoisted(() => vi.fn(async () => ({})));
const pendingRegistrationFindUniqueMock = vi.hoisted(() => vi.fn());
const pendingRegistrationFindFirstMock = vi.hoisted(() => vi.fn());
const pendingRegistrationUpdateMock = vi.hoisted(() => vi.fn(async () => ({})));
const stripeCheckoutCreateMock = vi.hoisted(() => vi.fn());
const stripeCustomersListMock = vi.hoisted(() => vi.fn());
const stripeCustomersCreateMock = vi.hoisted(() => vi.fn());
const stripeCustomersUpdateMock = vi.hoisted(() => vi.fn());
const reserveFoundingSlotMock = vi.hoisted(() => vi.fn());
const attachFoundingReservationToCheckoutSessionMock = vi.hoisted(() => vi.fn(async () => {}));
const releaseFoundingReservationMock = vi.hoisted(() => vi.fn(async () => {}));
const claimFoundingReservationMock = vi.hoisted(() => vi.fn(async () => {}));
const resolveManagedMembershipPlanMock = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.STRIPE_STANDARD_PRICE_ID = "price_standard_test";
  process.env.STRIPE_FOUNDATION_PRICE_ID = "price_foundation_test";
  process.env.STRIPE_FOUNDATION_MONTHLY_PRICE_ID = "price_foundation_test";
  process.env.STRIPE_FOUNDATION_ANNUAL_PRICE_ID = "price_foundation_annual_test";
  process.env.STRIPE_INNER_CIRCLE_PRICE_ID = "price_inner_circle_test";
  process.env.STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID = "price_inner_circle_test";
  process.env.STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID = "price_inner_circle_annual_test";
  process.env.STRIPE_CORE_PRICE_ID = "price_core_test";
  process.env.STRIPE_CORE_MONTHLY_PRICE_ID = "price_core_test";
  process.env.STRIPE_CORE_ANNUAL_PRICE_ID = "price_core_annual_test";
  process.env.STRIPE_FOUNDING_STANDARD_PRICE_ID = "price_founding_standard_test";
  process.env.STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID = "price_founding_standard_test";
  process.env.STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID =
    "price_founding_foundation_annual_test";
  process.env.STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID = "price_founding_inner_circle_test";
  process.env.STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID =
    "price_founding_inner_circle_test";
  process.env.STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID =
    "price_founding_inner_circle_annual_test";
  process.env.STRIPE_FOUNDING_CORE_PRICE_ID = "price_founding_core_test";
  process.env.STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID = "price_founding_core_test";
  process.env.STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID = "price_founding_core_annual_test";
});

vi.mock("@/lib/db", () => ({
  db: {
    stripeWebhookEvent: {
      create: stripeWebhookEventCreateMock,
      findUnique: stripeWebhookEventFindUniqueMock,
      updateMany: stripeWebhookEventUpdateManyMock,
      update: stripeWebhookEventUpdateMock
    },
    pendingRegistration: {
      findUnique: pendingRegistrationFindUniqueMock,
      findFirst: pendingRegistrationFindFirstMock,
      update: pendingRegistrationUpdateMock
    }
  }
}));

vi.mock("@/server/stripe/client", () => ({
  requireStripeClient: vi.fn(() => ({
    checkout: {
      sessions: {
        create: stripeCheckoutCreateMock
      }
    },
    customers: {
      list: stripeCustomersListMock,
      create: stripeCustomersCreateMock,
      update: stripeCustomersUpdateMock
    }
  }))
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ sent: true, skipped: false }))
}));

vi.mock("@/server/products-pricing", () => ({
  resolveManagedMembershipPlan: resolveManagedMembershipPlanMock,
  resolveManagedMembershipPlanFromStripePriceId: vi.fn(async () => ({
    tier: "FOUNDATION",
    billingVariant: "standard",
    billingInterval: "monthly",
    amountMinor: 3000,
    checkoutPrice: 30,
    monthlyEquivalentPrice: 30,
    stripePriceId: "price_foundation_test",
    planKey: "foundation-monthly"
  })),
  resolveManagedMembershipTierFromStripePriceId: vi.fn(async () => "FOUNDATION")
}));

vi.mock("@/server/founding", () => ({
  attachFoundingReservationToCheckoutSession: attachFoundingReservationToCheckoutSessionMock,
  claimFoundingReservation: claimFoundingReservationMock,
  releaseFoundingReservation: releaseFoundingReservationMock,
  reserveFoundingSlot: reserveFoundingSlotMock
}));

import {
  getMembershipBillingPlan,
  resolveBillingIntervalFromPriceId
} from "@/config/membership";
import {
  createStripeCheckoutSessionForPendingRegistration,
  getTierFromStripePriceId,
  isSubscriptionEntitled,
  processStripeWebhookEvent,
  stripeStatusToSubscriptionStatus
} from "@/server/subscriptions/subscription.service";
import { db } from "@/lib/db";

describe("subscription service", () => {
  it("maps Stripe price IDs to membership tiers", () => {
    const innerPriceId = getMembershipBillingPlan(
      MembershipTier.INNER_CIRCLE,
      "standard",
      "monthly"
    ).stripePriceId;
    const innerAnnualPriceId = getMembershipBillingPlan(
      MembershipTier.INNER_CIRCLE,
      "standard",
      "annual"
    ).stripePriceId;
    const standardPriceId = getMembershipBillingPlan(
      MembershipTier.FOUNDATION,
      "standard",
      "monthly"
    ).stripePriceId;
    const foundingInnerPriceId = "price_founding_inner_circle_test";
    const foundingInnerAnnualPriceId = "price_founding_inner_circle_annual_test";
    const foundingStandardPriceId = "price_founding_standard_test";
    const foundingCorePriceId = "price_founding_core_test";

    expect(getTierFromStripePriceId(innerPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(innerAnnualPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(standardPriceId)).toBe(MembershipTier.FOUNDATION);
    expect(getTierFromStripePriceId(foundingInnerPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(foundingInnerAnnualPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(foundingStandardPriceId)).toBe(MembershipTier.FOUNDATION);
    expect(getTierFromStripePriceId(foundingCorePriceId)).toBe(MembershipTier.CORE);
    expect(getTierFromStripePriceId("unknown_price")).toBe(MembershipTier.FOUNDATION);
  });

  it("maps Stripe price IDs to the correct billing interval", () => {
    expect(resolveBillingIntervalFromPriceId("price_foundation_test")).toBe("monthly");
    expect(resolveBillingIntervalFromPriceId("price_foundation_annual_test")).toBe("annual");
    expect(resolveBillingIntervalFromPriceId("price_founding_core_annual_test")).toBe("annual");
  });

  it("maps Stripe subscription statuses into internal status enum", () => {
    expect(stripeStatusToSubscriptionStatus("active")).toBe(SubscriptionStatus.ACTIVE);
    expect(stripeStatusToSubscriptionStatus("trialing")).toBe(SubscriptionStatus.TRIALING);
    expect(stripeStatusToSubscriptionStatus("past_due")).toBe(SubscriptionStatus.PAST_DUE);
    expect(stripeStatusToSubscriptionStatus("canceled")).toBe(SubscriptionStatus.CANCELED);
    expect(stripeStatusToSubscriptionStatus("paused")).toBe(SubscriptionStatus.PAUSED);
  });

  it("treats only ACTIVE and TRIALING as entitled statuses", () => {
    expect(isSubscriptionEntitled(SubscriptionStatus.ACTIVE)).toBe(true);
    expect(isSubscriptionEntitled(SubscriptionStatus.TRIALING)).toBe(true);
    expect(isSubscriptionEntitled(SubscriptionStatus.PAST_DUE)).toBe(false);
    expect(isSubscriptionEntitled(SubscriptionStatus.CANCELED)).toBe(false);
    expect(isSubscriptionEntitled(null)).toBe(false);
  });

  it("routes webhook event types to the expected handlers", async () => {
    const processors = {
      handleCheckoutSessionCompleted: vi.fn(async () => {}),
      handleCheckoutSessionExpired: vi.fn(async () => {}),
      handleSubscriptionChanged: vi.fn(async () => {}),
      handleInvoiceEvent: vi.fn(async () => {})
    };

    await processStripeWebhookEvent(
      {
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_123" }
        }
      } as unknown as Stripe.Event,
      processors
    );

    await processStripeWebhookEvent(
      {
        id: "evt_expired",
        type: "checkout.session.expired",
        data: {
          object: { id: "cs_expired" }
        }
      } as unknown as Stripe.Event,
      processors
    );

    await processStripeWebhookEvent(
      {
        id: "evt_sub",
        type: "customer.subscription.updated",
        data: {
          object: { id: "sub_123" }
        }
      } as unknown as Stripe.Event,
      processors
    );

    await processStripeWebhookEvent(
      {
        id: "evt_invoice",
        type: "invoice.paid",
        data: {
          object: { id: "in_123" }
        }
      } as unknown as Stripe.Event,
      processors
    );

    expect(processors.handleCheckoutSessionCompleted).toHaveBeenCalledTimes(1);
    expect(processors.handleCheckoutSessionExpired).toHaveBeenCalledTimes(1);
    expect(processors.handleSubscriptionChanged).toHaveBeenCalledTimes(1);
    expect(processors.handleInvoiceEvent).toHaveBeenCalledTimes(1);
  });

  it("does not reprocess an already completed webhook event", async () => {
    vi.mocked(db.stripeWebhookEvent.create).mockRejectedValueOnce({
      code: "P2002"
    });
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValueOnce({
      id: "evt_completed",
      type: "checkout.session.completed",
      status: "PROCESSED",
      processingStartedAt: new Date(),
      processedAt: new Date(),
      attemptCount: 1,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const processors = {
      handleCheckoutSessionCompleted: vi.fn(async () => {})
    };

    await processStripeWebhookEvent(
      {
        id: "evt_completed",
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_completed" }
        }
      } as unknown as Stripe.Event,
      processors
    );

    expect(processors.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("includes Terms acceptance metadata on pending registration checkout sessions", async () => {
    const acceptedAt = new Date("2026-04-25T10:15:00.000Z");

    resolveManagedMembershipPlanMock.mockResolvedValueOnce({
      stripePriceId: "price_inner_circle_annual_test",
      planKey: "inner-circle-annual",
      checkoutPrice: 468,
      monthlyEquivalentPrice: 39
    });
    reserveFoundingSlotMock.mockResolvedValueOnce(null);
    stripeCustomersListMock.mockResolvedValueOnce({
      data: []
    });
    stripeCustomersCreateMock.mockResolvedValueOnce({
      id: "cus_pending_123"
    });
    pendingRegistrationFindUniqueMock
      .mockResolvedValueOnce({
        stripeCustomerId: null
      })
      .mockResolvedValueOnce({
        id: "pending_123",
        stripeCheckoutSessionId: null
      });
    stripeCheckoutCreateMock.mockResolvedValueOnce({
      id: "cs_pending_123",
      url: "https://checkout.stripe.com/c/pay/cs_pending_123",
      customer: "cus_pending_123",
      subscription: null
    });

    await createStripeCheckoutSessionForPendingRegistration({
      pendingRegistrationId: "pending_123",
      email: "trev@example.com",
      name: "Trevor Newton",
      targetTier: MembershipTier.INNER_CIRCLE,
      billingInterval: "annual",
      coreAccessConfirmed: false,
      inviteCode: "BC-TREV-1234",
      acceptedTermsVersion: TERMS_VERSION,
      acceptedAt,
      allowFoundingOffer: false
    });

    const checkoutPayload = stripeCheckoutCreateMock.mock.calls[0]?.[0];

    expect(checkoutPayload.metadata).toMatchObject({
      acceptedTerms: "true",
      acceptedTermsVersion: TERMS_VERSION,
      acceptedLegalAt: acceptedAt.toISOString()
    });
    expect(checkoutPayload.subscription_data.metadata).toMatchObject({
      acceptedTerms: "true",
      acceptedTermsVersion: TERMS_VERSION,
      acceptedLegalAt: acceptedAt.toISOString()
    });
    expect(checkoutPayload.metadata).not.toHaveProperty("acceptedRules");
    expect(checkoutPayload.subscription_data.metadata).not.toHaveProperty("acceptedRules");
  });
});
