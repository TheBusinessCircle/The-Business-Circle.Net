import { describe, expect, it } from "vitest";
import {
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
        price: 50000
      },
      {
        role: "MEMBER",
        membershipTier: "FOUNDATION",
        hasActiveSubscription: true
      }
    );

    expect(pricing.discountPercent).toBe(10);
    expect(pricing.finalAmount).toBe(45000);
    expect(pricing.appliedMembershipTier).toBe("FOUNDATION");
  });

  it("applies the Inner Circle rate as the highest valid discount", () => {
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

    expect(pricing.discountPercent).toBe(20);
    expect(pricing.finalAmount).toBe(144000);
    expect(pricing.appliedMembershipTier).toBe("INNER_CIRCLE");
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

