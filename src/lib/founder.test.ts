import { describe, expect, it } from "vitest";
import {
  getServicePrice,
  getFounderServicePricing,
  isGrowthArchitectServiceSlug
} from "@/lib/founder";

describe("founder pricing", () => {
  it("flags the dedicated Growth Architect service slugs", () => {
    expect(isGrowthArchitectServiceSlug("growth-architect-clarity-audit")).toBe(true);
    expect(isGrowthArchitectServiceSlug("business-growth-audit")).toBe(false);
  });

  it("applies the Business Circle member rate to Growth Architect services", () => {
    const pricing = getFounderServicePricing(
      {
        slug: "growth-architect-clarity-audit",
        price: 19900
      },
      {
        role: "MEMBER",
        membershipTier: "FOUNDATION",
        hasActiveSubscription: true
      }
    );

    expect(pricing.discountPercent).toBe(0);
    expect(pricing.baseAmount).toBe(19900);
    expect(pricing.finalAmount).toBe(19900);
    expect(pricing.appliedMembershipTier).toBe("FOUNDATION");
  });

  it("applies the Inner Circle rate to growth architect services", () => {
    const pricing = getFounderServicePricing(
      {
        slug: "growth-architect-full-growth-architect",
        price: 180000
      },
      {
        role: "MEMBER",
        membershipTier: "INNER_CIRCLE",
        hasActiveSubscription: true
      }
    );

    expect(pricing.discountPercent).toBe(10);
    expect(pricing.baseAmount).toBe(100000);
    expect(pricing.finalAmount).toBe(90000);
    expect(pricing.appliedMembershipTier).toBe("INNER_CIRCLE");
  });

  it("keeps member pricing available even when the service starts with an application", () => {
    const pricing = getFounderServicePricing(
      {
        slug: "growth-architect-growth-strategy",
        price: 40000,
        intakeMode: "APPLICATION"
      },
      {
        role: "MEMBER",
        membershipTier: "CORE",
        hasActiveSubscription: true
      }
    );

    expect(pricing.isApplicationOnly).toBe(true);
    expect(pricing.discountPercent).toBe(20);
    expect(pricing.baseAmount).toBe(40000);
    expect(pricing.finalAmount).toBe(32000);
  });

  it("applies the Core discount to growth architect services", () => {
    expect(getServicePrice("CORE", 100000)).toBe(80000);
    expect(getServicePrice("INNER_CIRCLE", 50000)).toBe(45000);
    expect(getServicePrice("FOUNDATION", 25000)).toBe(25000);
  });

  it("does not apply discounts to unrelated founder services", () => {
    const pricing = getFounderServicePricing(
      {
        slug: "business-growth-audit",
        price: 14900
      },
      {
        role: "MEMBER",
        membershipTier: "INNER_CIRCLE",
        hasActiveSubscription: true
      }
    );

    expect(pricing.isGrowthArchitect).toBe(false);
    expect(pricing.discountPercent).toBe(0);
    expect(pricing.finalAmount).toBe(14900);
    expect(pricing.appliedMembershipTier).toBeNull();
  });
});

