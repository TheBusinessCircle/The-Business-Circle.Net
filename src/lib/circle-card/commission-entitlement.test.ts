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

  it("accepts current internal Pro entitlement without pretending a payment occurred", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        subscriptionStatus: SubscriptionStatus.ACTIVE
      })
    ).toMatchObject({ activePro: true, source: "BCN_INCLUDED_PRO", plan: "PRO" });
  });

  it("supports an active owner-granted free Pro override for testing", () => {
    expect(
      resolveCircleCardCommissionProEntitlement({
        role: Role.MEMBER,
        membershipTier: MembershipTier.FOUNDATION,
        suspended: false,
        ambassadorFreeProGranted: true,
        ambassadorActive: true
      })
    ).toMatchObject({ activePro: true, source: "AMBASSADOR_FREE_PRO" });
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
