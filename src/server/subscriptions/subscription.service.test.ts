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
const stripeCheckoutListLineItemsMock = vi.hoisted(() => vi.fn());
const stripeCustomersListMock = vi.hoisted(() => vi.fn());
const stripeCustomersCreateMock = vi.hoisted(() => vi.fn());
const stripeCustomersUpdateMock = vi.hoisted(() => vi.fn());
const reserveFoundingSlotMock = vi.hoisted(() => vi.fn());
const attachFoundingReservationToCheckoutSessionMock = vi.hoisted(() => vi.fn(async () => {}));
const releaseFoundingReservationMock = vi.hoisted(() => vi.fn(async () => {}));
const claimFoundingReservationMock = vi.hoisted(() => vi.fn(async () => {}));
const resolveManagedMembershipPlanMock = vi.hoisted(() => vi.fn());
const isKnownManagedMembershipStripePriceIdMock = vi.hoisted(() =>
  vi.fn(async () => true)
);
const stripeSubscriptionsRetrieveMock = vi.hoisted(() => vi.fn());
const sendTransactionalEmailMock = vi.hoisted(() =>
  vi.fn(async () => ({ sent: true, skipped: false }))
);
const validateInviteCodeForCheckoutMock = vi.hoisted(() =>
  vi.fn(async () => ({ valid: false, reason: "missing" }))
);
const claimInviteCodeRedemptionMock = vi.hoisted(() => vi.fn(async () => null));
const reserveLaunchCodePlaceMock = vi.hoisted(() =>
  vi.fn(async (): Promise<unknown> => null)
);
const attachLaunchCodeReservationToCheckoutSessionMock = vi.hoisted(() => vi.fn(async () => {}));
const failLaunchCodeReservationMock = vi.hoisted(() => vi.fn(async () => {}));
const completeLaunchCodeRedemptionFromStripeMock = vi.hoisted(() => vi.fn(async () => null));
const updateLaunchCodeSubscriptionFromStripeMock = vi.hoisted(() => vi.fn(async () => null));
const siteEventCreateMock = vi.hoisted(() => vi.fn(async () => ({})));

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_subscriptions";
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
    },
    siteEvent: { create: siteEventCreateMock }
  }
}));

vi.mock("@/server/stripe/client", () => ({
  requireStripeClient: vi.fn(() => ({
    checkout: {
      sessions: {
        create: stripeCheckoutCreateMock,
        listLineItems: stripeCheckoutListLineItemsMock
      }
    },
    customers: {
      list: stripeCustomersListMock,
      create: stripeCustomersCreateMock,
      update: stripeCustomersUpdateMock
    },
    subscriptions: {
      retrieve: stripeSubscriptionsRetrieveMock
    }
  }))
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: sendTransactionalEmailMock
}));

vi.mock("@/server/products-pricing", () => ({
  isKnownManagedMembershipStripePriceId: isKnownManagedMembershipStripePriceIdMock,
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

vi.mock("@/server/invite-codes", () => ({
  claimInviteCodeRedemption: claimInviteCodeRedemptionMock,
  validateInviteCodeForCheckout: validateInviteCodeForCheckoutMock
}));

vi.mock("@/server/admin/launch-codes.service", () => ({
  attachLaunchCodeReservationToCheckoutSession: attachLaunchCodeReservationToCheckoutSessionMock,
  completeLaunchCodeRedemptionFromStripe: completeLaunchCodeRedemptionFromStripeMock,
  failLaunchCodeReservation: failLaunchCodeReservationMock,
  reserveLaunchCodePlace: reserveLaunchCodePlaceMock,
  updateLaunchCodeSubscriptionFromStripe: updateLaunchCodeSubscriptionFromStripeMock
}));

import {
  getMembershipBillingPlan,
  isConfiguredMembershipStripePriceId,
  resolveBillingIntervalFromPriceId
} from "@/config/membership";
import {
  acquireWebhookProcessingLease,
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

  it("recognises only explicitly configured membership Stripe price IDs", () => {
    expect(isConfiguredMembershipStripePriceId("price_foundation_test")).toBe(true);
    expect(isConfiguredMembershipStripePriceId("price_circle_card_pro")).toBe(false);
    expect(isConfiguredMembershipStripePriceId(null)).toBe(false);
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

  it("throws while another webhook worker holds an active processing lease", async () => {
    vi.mocked(db.stripeWebhookEvent.create).mockRejectedValueOnce({ code: "P2002" });
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValueOnce({
      id: "evt_busy",
      type: "customer.subscription.updated",
      status: "PROCESSING",
      processingStartedAt: new Date(),
      processedAt: null,
      attemptCount: 1,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vi.mocked(db.stripeWebhookEvent.updateMany).mockResolvedValueOnce({ count: 0 });

    const handleSubscriptionChanged = vi.fn(async () => {});
    await expect(
      processStripeWebhookEvent(
        {
          id: "evt_busy",
          type: "customer.subscription.updated",
          data: { object: { id: "sub_busy" } }
        } as unknown as Stripe.Event,
        { handleSubscriptionChanged }
      )
    ).rejects.toThrow("stripe-webhook-event-processing-in-progress");

    expect(handleSubscriptionChanged).not.toHaveBeenCalled();
    expect(stripeWebhookEventUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "evt_busy" } })
    );
  });

  it("reclaims a stale webhook processing lease and completes the retry", async () => {
    vi.mocked(db.stripeWebhookEvent.create).mockRejectedValueOnce({ code: "P2002" });
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValueOnce({
      id: "evt_stale",
      type: "customer.subscription.updated",
      status: "PROCESSING",
      processingStartedAt: new Date(Date.now() - 11 * 60 * 1000),
      processedAt: null,
      attemptCount: 1,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vi.mocked(db.stripeWebhookEvent.updateMany).mockResolvedValueOnce({ count: 1 });

    const handleSubscriptionChanged = vi.fn(async () => {});
    await processStripeWebhookEvent(
      {
        id: "evt_stale",
        type: "customer.subscription.updated",
        data: { object: { id: "sub_stale" } }
      } as unknown as Stripe.Event,
      { handleSubscriptionChanged }
    );

    expect(handleSubscriptionChanged).toHaveBeenCalledTimes(1);
    expect(stripeWebhookEventUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_stale" },
        data: expect.objectContaining({ status: "PROCESSED" })
      })
    );
  });

  it("reclaims a previously failed webhook lease", async () => {
    vi.mocked(db.stripeWebhookEvent.create).mockRejectedValueOnce({ code: "P2002" });
    vi.mocked(db.stripeWebhookEvent.findUnique).mockResolvedValueOnce({
      id: "evt_failed_retry",
      type: "invoice.payment_failed",
      status: "FAILED",
      processingStartedAt: new Date(),
      processedAt: null,
      attemptCount: 1,
      lastError: "synthetic failure",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vi.mocked(db.stripeWebhookEvent.updateMany).mockResolvedValueOnce({ count: 1 });

    await expect(
      acquireWebhookProcessingLease({
        id: "evt_failed_retry",
        type: "invoice.payment_failed"
      } as Stripe.Event)
    ).resolves.toBe("acquired");
  });

  it("ignores subscription events whose price is not a managed BCN membership price", async () => {
    isKnownManagedMembershipStripePriceIdMock.mockResolvedValueOnce(false);
    pendingRegistrationUpdateMock.mockClear();
    updateLaunchCodeSubscriptionFromStripeMock.mockClear();

    await processStripeWebhookEvent({
      id: "evt_unmanaged_subscription",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_unmanaged",
          customer: "cus_shared",
          status: "active",
          metadata: { userId: "user_1" },
          items: { data: [{ price: { id: "price_circle_card_pro" } }] }
        }
      }
    } as unknown as Stripe.Event);

    expect(isKnownManagedMembershipStripePriceIdMock).toHaveBeenCalledWith(
      "price_circle_card_pro"
    );
    expect(pendingRegistrationUpdateMock).not.toHaveBeenCalled();
    expect(updateLaunchCodeSubscriptionFromStripeMock).not.toHaveBeenCalled();
  });

  it("ignores completed Checkout sessions whose line item is not a managed BCN price", async () => {
    stripeCheckoutListLineItemsMock.mockResolvedValueOnce({
      data: [{ price: { id: "price_circle_card_pro" }, quantity: 1 }],
      has_more: false
    });
    isKnownManagedMembershipStripePriceIdMock.mockResolvedValueOnce(false);

    await processStripeWebhookEvent({
      id: "evt_unmanaged_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_unmanaged",
          mode: "subscription",
          customer: "cus_shared",
          metadata: {
            userId: "user_1",
            pendingRegistrationId: "pending_1",
            foundingReservationId: "founding_1",
            launchCodeRedemptionId: "launch_1"
          }
        }
      }
    } as unknown as Stripe.Event);

    expect(pendingRegistrationUpdateMock).not.toHaveBeenCalled();
    expect(stripeSubscriptionsRetrieveMock).not.toHaveBeenCalled();
    expect(claimFoundingReservationMock).not.toHaveBeenCalled();
    expect(completeLaunchCodeRedemptionFromStripeMock).not.toHaveBeenCalled();
    expect(siteEventCreateMock).not.toHaveBeenCalled();
  });

  it("does not release BCN reservations for an unmanaged expired Checkout session", async () => {
    stripeCheckoutListLineItemsMock.mockResolvedValueOnce({
      data: [{ price: { id: "price_circle_card_pro" }, quantity: 1 }],
      has_more: false
    });
    isKnownManagedMembershipStripePriceIdMock.mockResolvedValueOnce(false);

    await processStripeWebhookEvent({
      id: "evt_unmanaged_expired_checkout",
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_unmanaged_expired",
          mode: "subscription",
          metadata: {
            pendingRegistrationId: "pending_1",
            foundingReservationId: "founding_1",
            launchCodeRedemptionId: "launch_1"
          }
        }
      }
    } as unknown as Stripe.Event);

    expect(releaseFoundingReservationMock).not.toHaveBeenCalled();
    expect(failLaunchCodeReservationMock).not.toHaveBeenCalled();
    expect(pendingRegistrationUpdateMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "multiple line items",
      lineItems: {
        data: [
          { price: { id: "price_foundation_test" }, quantity: 1 },
          { price: { id: "price_extra" }, quantity: 1 }
        ],
        has_more: false
      }
    },
    {
      label: "wrong quantity",
      lineItems: {
        data: [{ price: { id: "price_foundation_test" }, quantity: 2 }],
        has_more: false
      }
    }
  ])("fails closed for a BCN Checkout session with $label", async ({ lineItems }) => {
    stripeCheckoutListLineItemsMock.mockResolvedValueOnce(lineItems);

    await processStripeWebhookEvent({
      id: `evt_bad_shape_${lineItems.data.length}_${lineItems.data[0]?.quantity}`,
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_bad_shape",
          mode: "subscription",
          metadata: { foundingReservationId: "founding_1" }
        }
      }
    } as unknown as Stripe.Event);

    expect(releaseFoundingReservationMock).not.toHaveBeenCalled();
  });

  it("leaves the webhook retryable when Checkout line-item classification fails", async () => {
    stripeCheckoutListLineItemsMock.mockRejectedValueOnce(new Error("temporary Stripe failure"));

    await expect(
      processStripeWebhookEvent({
        id: "evt_checkout_lookup_failure",
        type: "checkout.session.completed",
        data: { object: { id: "cs_lookup_failure", mode: "subscription" } }
      } as unknown as Stripe.Event)
    ).rejects.toThrow("temporary Stripe failure");

    expect(stripeWebhookEventUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_checkout_lookup_failure" },
        data: expect.objectContaining({ status: "FAILED" })
      })
    );
    expect(siteEventCreateMock).not.toHaveBeenCalled();
  });

  it("handles a single managed BCN Checkout line with quantity one", async () => {
    stripeCheckoutListLineItemsMock.mockResolvedValueOnce({
      data: [{ price: { id: "price_foundation_test" }, quantity: 1 }],
      has_more: false
    });
    isKnownManagedMembershipStripePriceIdMock.mockResolvedValueOnce(true);

    await processStripeWebhookEvent({
      id: "evt_managed_expired_checkout",
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_managed_expired",
          mode: "subscription",
          metadata: { foundingReservationId: "founding_1" }
        }
      }
    } as unknown as Stripe.Event);

    expect(releaseFoundingReservationMock).toHaveBeenCalledWith({
      reservationId: "founding_1",
      checkoutSessionId: "cs_managed_expired"
    });
  });

  it("does not sync or email receipts for invoices on unmanaged subscriptions", async () => {
    stripeSubscriptionsRetrieveMock.mockResolvedValueOnce({
      id: "sub_unmanaged_invoice",
      customer: "cus_shared",
      status: "active",
      metadata: { userId: "user_1" },
      items: { data: [{ price: { id: "price_circle_card_pro" } }] }
    });
    isKnownManagedMembershipStripePriceIdMock.mockResolvedValueOnce(false);
    sendTransactionalEmailMock.mockClear();

    await processStripeWebhookEvent({
      id: "evt_unmanaged_invoice",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_unmanaged",
          subscription: "sub_unmanaged_invoice",
          customer: "cus_shared",
          customer_email: "synthetic@example.test",
          paid: true,
          lines: { data: [{ price: { id: "price_circle_card_pro" } }] }
        }
      }
    } as unknown as Stripe.Event);

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
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
    expect(stripeCustomersListMock).not.toHaveBeenCalled();
    expect(stripeCustomersCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "trev@example.com",
        metadata: { pendingRegistrationId: "pending_123" }
      }),
      { idempotencyKey: "bcn-pending-registration-customer:pending_123" }
    );
  });

  it("applies launch code trial metadata to pending registration checkout sessions", async () => {
    resolveManagedMembershipPlanMock.mockResolvedValueOnce({
      stripePriceId: "price_foundation_test",
      planKey: "foundation-monthly",
      checkoutPrice: 30,
      monthlyEquivalentPrice: 30
    });
    reserveFoundingSlotMock.mockResolvedValueOnce(null);
    reserveLaunchCodePlaceMock.mockResolvedValueOnce({
      id: "launch_redemption_1",
      launchCodeId: "launch_code_1",
      code: "FACEBOOK25",
      platform: "FACEBOOK",
      trialDays: 90
    });
    stripeCustomersListMock.mockResolvedValueOnce({ data: [] });
    stripeCustomersCreateMock.mockResolvedValueOnce({ id: "cus_launch_123" });
    pendingRegistrationFindUniqueMock
      .mockResolvedValueOnce({ stripeCustomerId: null })
      .mockResolvedValueOnce({
        id: "pending_launch_123",
        stripeCheckoutSessionId: null
      });
    stripeCheckoutCreateMock.mockResolvedValueOnce({
      id: "cs_launch_123",
      url: "https://checkout.stripe.com/c/pay/cs_launch_123",
      customer: "cus_launch_123",
      subscription: null
    });

    await createStripeCheckoutSessionForPendingRegistration({
      pendingRegistrationId: "pending_launch_123",
      email: "member@example.com",
      name: "Member Example",
      targetTier: MembershipTier.FOUNDATION,
      billingInterval: "monthly",
      coreAccessConfirmed: false,
      inviteCode: "FACEBOOK25",
      acceptedTermsVersion: TERMS_VERSION,
      acceptedAt: new Date("2026-05-24T10:00:00.000Z"),
      allowFoundingOffer: true
    });

    const checkoutPayload = stripeCheckoutCreateMock.mock.calls.at(-1)?.[0];

    expect(checkoutPayload.payment_method_collection).toBe("always");
    expect(checkoutPayload.metadata).toMatchObject({
      launchCodeId: "launch_code_1",
      launchCodeRedemptionId: "launch_redemption_1",
      launchCode: "FACEBOOK25",
      sourcePlatform: "FACEBOOK",
      selectedTier: MembershipTier.FOUNDATION,
      source: "launch_code",
      trialDays: "90"
    });
    expect(checkoutPayload.subscription_data.trial_period_days).toBe(90);
    expect(checkoutPayload.subscription_data.trial_settings).toEqual({
      end_behavior: {
        missing_payment_method: "cancel"
      }
    });
    expect(attachLaunchCodeReservationToCheckoutSessionMock).toHaveBeenCalledWith({
      redemptionId: "launch_redemption_1",
      stripeCheckoutSessionId: "cs_launch_123",
      stripeCustomerId: "cus_launch_123"
    });
  });
});
