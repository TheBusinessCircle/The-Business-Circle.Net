import {
  FoundingReservationSource,
  SubscriptionStatus
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  hasMembershipHistory,
  isEligibleForDiscountedPricing
} from "@/lib/billing-eligibility";

describe("billing eligibility", () => {
  it("treats incomplete checkout attempts as no membership history", () => {
    expect(
      hasMembershipHistory({
        foundingMember: false,
        subscription: {
          status: SubscriptionStatus.INCOMPLETE,
          stripeSubscriptionId: null,
          currentPeriodStart: null,
          canceledAt: null
        }
      })
    ).toBe(false);
  });

  it("treats previous subscriptions as membership history", () => {
    expect(
      hasMembershipHistory({
        foundingMember: false,
        subscription: {
          status: SubscriptionStatus.CANCELED,
          stripeSubscriptionId: "sub_123",
          currentPeriodStart: new Date("2026-01-10T00:00:00.000Z"),
          canceledAt: new Date("2026-02-10T00:00:00.000Z")
        }
      })
    ).toBe(true);
  });

  it("blocks discounted pricing for upgrades and returning members", () => {
    expect(
      isEligibleForDiscountedPricing({
        source: FoundingReservationSource.UPGRADE,
        foundingMember: false,
        subscription: null
      })
    ).toBe(false);

    expect(
      isEligibleForDiscountedPricing({
        source: FoundingReservationSource.CHECKOUT,
        foundingMember: false,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: "sub_456"
        }
      })
    ).toBe(false);
  });

  it("allows discounted pricing only for genuinely new members", () => {
    expect(
      isEligibleForDiscountedPricing({
        source: FoundingReservationSource.CHECKOUT,
        foundingMember: false,
        subscription: {
          status: SubscriptionStatus.INCOMPLETE,
          stripeSubscriptionId: null,
          currentPeriodStart: null,
          canceledAt: null
        }
      })
    ).toBe(true);
  });
});
