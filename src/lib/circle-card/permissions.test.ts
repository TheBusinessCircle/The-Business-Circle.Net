import { describe, expect, it } from "vitest";
import {
  canCreateCircleCard,
  getCircleCardFeatureAccess,
  isCircleCardFreeAccount,
  resolveCircleCardEntitlement
} from "@/lib/circle-card/permissions";

describe("Circle Card entitlements", () => {
  it("keeps ordinary Circle Card users on Free", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      hasActiveSubscription: false
    });

    expect(entitlement.plan).toBe("FREE");
    expect(entitlement.source).toBe("FREE");
    expect(entitlement.hasPaidCircleCardSubscription).toBe(false);
    expect(isCircleCardFreeAccount({ role: "MEMBER", hasActiveSubscription: false })).toBe(true);
  });

  it("grants BCN members Pro capabilities without creating a Circle Card subscription", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "MEMBER",
      membershipTier: "CORE",
      hasActiveSubscription: true
    });

    expect(entitlement.plan).toBe("PRO");
    expect(entitlement.accessLevel).toBe("PRO");
    expect(entitlement.source).toBe("BCN_INCLUDED_PRO");
    expect(entitlement.billingReportCategory).toBe("BCN_INCLUDED");
    expect(entitlement.isBcnIncludedPro).toBe(true);
    expect(entitlement.hasPaidCircleCardSubscription).toBe(false);
    expect(entitlement.affectsBcnSubscription).toBe(false);
    expect(isCircleCardFreeAccount({ role: "MEMBER", hasActiveSubscription: true })).toBe(false);
  });

  it("distinguishes paid Circle Card Pro from BCN included Pro", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      hasActiveSubscription: false,
      hasActiveCircleCardSubscription: true,
      circleCardSubscriptionPlan: "PRO"
    });

    expect(entitlement.plan).toBe("PRO");
    expect(entitlement.accessLevel).toBe("PRO");
    expect(entitlement.source).toBe("PRO_SUBSCRIPTION");
    expect(entitlement.billingReportCategory).toBe("PAID_CIRCLE_CARD");
    expect(entitlement.hasPaidCircleCardSubscription).toBe(true);
    expect(entitlement.isBcnIncludedPro).toBe(false);
  });

  it("keeps future Teams subscriptions separate from BCN membership logic", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      hasActiveSubscription: false,
      hasActiveCircleCardSubscription: true,
      circleCardSubscriptionPlan: "TEAMS"
    });

    expect(entitlement.plan).toBe("TEAMS");
    expect(entitlement.source).toBe("TEAMS_SUBSCRIPTION");
    expect(entitlement.billingReportCategory).toBe("PAID_CIRCLE_CARD");
    expect(entitlement.affectsBcnSubscription).toBe(false);
  });

  it("enforces card limits through central feature access", () => {
    expect(canCreateCircleCard({ accessLevel: "FREE", existingCardCount: 0 })).toBe(true);
    expect(canCreateCircleCard({ accessLevel: "FREE", existingCardCount: 1 })).toBe(false);
    expect(canCreateCircleCard({ accessLevel: "PRO", existingCardCount: 1 })).toBe(true);
    expect(canCreateCircleCard({ accessLevel: "PRO", existingCardCount: 2 })).toBe(false);
    expect(getCircleCardFeatureAccess("TEAMS").cardLimit).toBeGreaterThan(2);
  });

  it("keeps admin override as its own source", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "ADMIN",
      membershipTier: "CORE",
      hasActiveSubscription: false
    });

    expect(entitlement.plan).toBe("PRO");
    expect(entitlement.source).toBe("ADMIN_OVERRIDE");
    expect(entitlement.label).toBe("Admin Preview");
    expect(entitlement.isAdminOverride).toBe(true);
    expect(entitlement.hasPaidCircleCardSubscription).toBe(false);
  });
});
