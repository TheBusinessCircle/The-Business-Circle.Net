import { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { resolveCircleCardCommissionProEntitlement } from "@/lib/circle-card/commission-entitlement";

describe("Circle Card commission Pro entitlement", () => {
  it("does not treat a Free referred user as commission eligible", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        subscriptionStatus: null
      })
    ).toMatchObject({ activePro: false, source: "FREE", plan: "FREE" });
  });

  it("does not treat BCN included Pro as paid commission eligibility", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        subscriptionStatus: SubscriptionStatus.ACTIVE
      })
    ).toMatchObject({ activePro: false, source: "BCN_INCLUDED_PRO", plan: "PRO" });
  });

  it("does not treat Ambassador free Pro as paid commission eligibility", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        ambassadorFreeProGranted: true,
        ambassadorActive: true
      })
    ).toMatchObject({ activePro: false, source: "AMBASSADOR_FREE_PRO" });
  });

  it("accepts a paid Circle Card Pro subscription as commission eligibility", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        hasActiveCircleCardSubscription: true,
        circleCardSubscriptionPlan: "PRO"
      })
    ).toMatchObject({ activePro: true, source: "PRO_SUBSCRIPTION", plan: "PRO" });
  });

  it("blocks cancelled, inactive and suspended entitlement", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: true,
        subscriptionStatus: SubscriptionStatus.ACTIVE
      }).activePro
    ).toBe(false);
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        subscriptionStatus: SubscriptionStatus.CANCELED
      }).activePro
    ).toBe(false);
  });
});
