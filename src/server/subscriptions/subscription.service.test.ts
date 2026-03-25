import { MembershipTier, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.hoisted(() => {
  process.env.STRIPE_STANDARD_PRICE_ID = "price_standard_test";
  process.env.STRIPE_FOUNDATION_PRICE_ID = "price_foundation_test";
  process.env.STRIPE_INNER_CIRCLE_PRICE_ID = "price_inner_circle_test";
  process.env.STRIPE_CORE_PRICE_ID = "price_core_test";
  process.env.STRIPE_FOUNDING_STANDARD_PRICE_ID = "price_founding_standard_test";
  process.env.STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID = "price_founding_inner_circle_test";
  process.env.STRIPE_FOUNDING_CORE_PRICE_ID = "price_founding_core_test";
});

vi.mock("@/lib/db", () => ({
  db: {}
}));

vi.mock("@/server/stripe/client", () => ({
  requireStripeClient: vi.fn()
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ sent: true, skipped: false }))
}));

import { getMembershipPlan } from "@/config/membership";
import {
  getTierFromStripePriceId,
  isSubscriptionEntitled,
  processStripeWebhookEvent,
  stripeStatusToSubscriptionStatus
} from "@/server/subscriptions/subscription.service";

describe("subscription service", () => {
  it("maps Stripe price IDs to membership tiers", () => {
    const innerPriceId = getMembershipPlan(MembershipTier.INNER_CIRCLE).stripePriceId;
    const standardPriceId = getMembershipPlan(MembershipTier.FOUNDATION).stripePriceId;
    const corePriceId = getMembershipPlan(MembershipTier.CORE).stripePriceId;
    const foundingInnerPriceId = "price_founding_inner_circle_test";
    const foundingStandardPriceId = "price_founding_standard_test";
    const foundingCorePriceId = "price_founding_core_test";

    expect(getTierFromStripePriceId(innerPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(standardPriceId)).toBe(MembershipTier.FOUNDATION);
    expect(getTierFromStripePriceId(corePriceId)).toBe(MembershipTier.CORE);
    expect(getTierFromStripePriceId(foundingInnerPriceId)).toBe(MembershipTier.INNER_CIRCLE);
    expect(getTierFromStripePriceId(foundingStandardPriceId)).toBe(MembershipTier.FOUNDATION);
    expect(getTierFromStripePriceId(foundingCorePriceId)).toBe(MembershipTier.CORE);
    expect(getTierFromStripePriceId("unknown_price")).toBe(MembershipTier.FOUNDATION);
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
    expect(processors.handleSubscriptionChanged).toHaveBeenCalledTimes(1);
    expect(processors.handleInvoiceEvent).toHaveBeenCalledTimes(1);
  });
});

