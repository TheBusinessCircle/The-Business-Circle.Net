import { describe, expect, it } from "vitest";
import {
  getAdminBcnMembershipLabel,
  getAdminCircleCardPlanLabel,
  resolveAdminMemberAccess
} from "@/lib/admin/member-access";

describe("admin member access display", () => {
  it("shows Circle Card-only accounts without BCN membership", () => {
    const access = resolveAdminMemberAccess({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      subscriptionStatus: "NONE"
    });

    expect(access.circleCardPlan).toBe("FREE");
    expect(access.bcnMembershipTier).toBeNull();
    expect(access.hasBcnMembershipAccess).toBe(false);
    expect(getAdminCircleCardPlanLabel(access.circleCardPlan)).toBe("Circle Card Free");
    expect(getAdminBcnMembershipLabel(access.bcnMembershipTier)).toBe("None");
  });

  it("shows active and trialing subscriptions as BCN membership", () => {
    expect(
      resolveAdminMemberAccess({
        role: "MEMBER",
        membershipTier: "FOUNDATION",
        subscriptionStatus: "ACTIVE",
        subscriptionTier: "FOUNDATION"
      }).bcnMembershipTier
    ).toBe("FOUNDATION");

    const trialing = resolveAdminMemberAccess({
      role: "INNER_CIRCLE",
      membershipTier: "INNER_CIRCLE",
      subscriptionStatus: "TRIALING",
      subscriptionTier: "INNER_CIRCLE"
    });

    expect(trialing.circleCardPlan).toBe("BCN_INCLUDED_PRO");
    expect(trialing.circleCardEntitlementPlan).toBe("PRO");
    expect(trialing.circleCardEntitlementSource).toBe("BCN_INCLUDED_PRO");
    expect(trialing.bcnMembershipTier).toBe("INNER_CIRCLE");
    expect(trialing.hasBcnMembershipAccess).toBe(true);
    expect(getAdminCircleCardPlanLabel(trialing.circleCardPlan)).toBe("BCN Included Pro");
  });

  it("does not show cancelled subscriptions as active BCN membership", () => {
    const access = resolveAdminMemberAccess({
      role: "MEMBER",
      membershipTier: "CORE",
      subscriptionStatus: "CANCELED",
      subscriptionTier: "CORE"
    });

    expect(access.circleCardPlan).toBe("FREE");
    expect(access.bcnMembershipTier).toBeNull();
    expect(access.hasBcnMembershipAccess).toBe(false);
  });

  it("keeps admin status independent from BCN membership", () => {
    const access = resolveAdminMemberAccess({
      role: "ADMIN",
      membershipTier: "CORE",
      subscriptionStatus: "NONE"
    });

    expect(access.circleCardPlan).toBe("ADMIN_OVERRIDE");
    expect(access.circleCardEntitlementPlan).toBe("PRO");
    expect(access.bcnMembershipTier).toBeNull();
    expect(access.isAdmin).toBe(true);
    expect(access.hasBcnMembershipAccess).toBe(false);
    expect(getAdminCircleCardPlanLabel(access.circleCardPlan)).toBe("Admin Preview");
  });

  it("distinguishes future paid Circle Card Pro from BCN included Pro", () => {
    const access = resolveAdminMemberAccess({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      subscriptionStatus: "NONE",
      hasActiveCircleCardSubscription: true,
      circleCardSubscriptionPlan: "PRO"
    });

    expect(access.circleCardPlan).toBe("PRO_SUBSCRIPTION");
    expect(access.circleCardEntitlementPlan).toBe("PRO");
    expect(access.hasBcnMembershipAccess).toBe(false);
    expect(getAdminCircleCardPlanLabel(access.circleCardPlan)).toBe("Paid Circle Card Pro");
  });
});
