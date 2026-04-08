import { MembershipTier } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getMembershipBillingPlan,
  getMembershipPlanKey,
  getMembershipTierContent,
  getMembershipTierPricing
} from "@/config/membership";

describe("membership pricing", () => {
  it("returns the expected standard and founding annual totals", () => {
    expect(getMembershipTierPricing(MembershipTier.FOUNDATION)).toMatchObject({
      standardAnnualPrice: 288,
      foundingAnnualPrice: 144
    });
    expect(getMembershipTierPricing(MembershipTier.INNER_CIRCLE)).toMatchObject({
      standardAnnualPrice: 756,
      foundingAnnualPrice: 372
    });
    expect(getMembershipTierPricing(MembershipTier.CORE)).toMatchObject({
      standardAnnualPrice: 1428,
      foundingAnnualPrice: 708
    });
  });

  it("returns monthly equivalents for annual billing plans", () => {
    const innerAnnual = getMembershipBillingPlan(
      MembershipTier.INNER_CIRCLE,
      "standard",
      "annual"
    );

    expect(innerAnnual.checkoutPrice).toBe(756);
    expect(innerAnnual.monthlyEquivalentPrice).toBe(63);
  });

  it("uses shared tier copy and plan keys as the source of truth", () => {
    expect(getMembershipTierContent(MembershipTier.FOUNDATION)).toMatchObject({
      badgeLabel: "Foundation",
      supportingBadge: "Best place to start",
      bestFitLine: "Best if you are early, refining, or building your base.",
      ctaLabel: "Enter Foundation"
    });

    expect(
      getMembershipPlanKey(MembershipTier.INNER_CIRCLE, "standard", "annual")
    ).toBe("inner-circle-annual");
    expect(getMembershipPlanKey(MembershipTier.CORE, "founding", "annual")).toBe(
      "core-founders-annual"
    );
  });
});
