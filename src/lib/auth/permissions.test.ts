import { describe, expect, it } from "vitest";
import {
  canAccessInnerCircleArea,
  canAccessMemberArea,
  canTierAccess,
  resolveEffectiveTier,
  userCanAccessTier
} from "@/lib/auth/permissions";

describe("auth permissions", () => {
  it("resolves admin and inner-circle roles to the correct effective tier", () => {
    expect(resolveEffectiveTier("ADMIN", "FOUNDATION")).toBe("CORE");
    expect(resolveEffectiveTier("INNER_CIRCLE", "FOUNDATION")).toBe("INNER_CIRCLE");
    expect(resolveEffectiveTier("MEMBER", "FOUNDATION")).toBe("FOUNDATION");
  });

  it("checks tier rank access", () => {
    expect(canTierAccess("INNER_CIRCLE", "FOUNDATION")).toBe(true);
    expect(canTierAccess("FOUNDATION", "INNER_CIRCLE")).toBe(false);
  });

  it("blocks suspended or unentitled users", () => {
    expect(
      userCanAccessTier(
        {
          role: "MEMBER",
          membershipTier: "INNER_CIRCLE",
          hasActiveSubscription: false,
          suspended: false
        },
        "FOUNDATION"
      )
    ).toBe(false);

    expect(
      userCanAccessTier(
        {
          role: "MEMBER",
          membershipTier: "INNER_CIRCLE",
          hasActiveSubscription: true,
          suspended: true
        },
        "FOUNDATION"
      )
    ).toBe(false);
  });

  it("allows admins regardless of subscription status", () => {
    expect(
      userCanAccessTier(
        {
          role: "ADMIN",
          membershipTier: "FOUNDATION",
          hasActiveSubscription: false,
          suspended: false
        },
        "INNER_CIRCLE"
      )
    ).toBe(true);
  });

  it("member and inner-circle area checks align with tier/subscription", () => {
    const standardMember = {
      role: "MEMBER" as const,
      membershipTier: "FOUNDATION" as const,
      hasActiveSubscription: true,
      suspended: false
    };

    expect(canAccessMemberArea(standardMember)).toBe(true);
    expect(canAccessInnerCircleArea(standardMember)).toBe(false);
  });
});

