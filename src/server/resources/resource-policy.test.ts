import { MembershipTier, ResourceTier } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { roleToTier } from "@/lib/permissions";
import {
  canAccessResourceTier,
  getAccessibleResourceTiers
} from "@/server/resources/resource-policy";

describe("resource access policy", () => {
  it("returns the correct visible tiers for each membership level", () => {
    expect(getAccessibleResourceTiers(MembershipTier.FOUNDATION)).toEqual([
      ResourceTier.FOUNDATION
    ]);

    expect(getAccessibleResourceTiers(MembershipTier.INNER_CIRCLE)).toEqual([
      ResourceTier.FOUNDATION,
      ResourceTier.INNER
    ]);

    expect(getAccessibleResourceTiers(MembershipTier.CORE)).toEqual([
      ResourceTier.FOUNDATION,
      ResourceTier.INNER,
      ResourceTier.CORE
    ]);
  });

  it("applies tier access exactly as the dashboard rules require", () => {
    expect(canAccessResourceTier(MembershipTier.FOUNDATION, ResourceTier.FOUNDATION)).toBe(true);
    expect(canAccessResourceTier(MembershipTier.FOUNDATION, ResourceTier.INNER)).toBe(false);
    expect(canAccessResourceTier(MembershipTier.FOUNDATION, ResourceTier.CORE)).toBe(false);

    expect(canAccessResourceTier(MembershipTier.INNER_CIRCLE, ResourceTier.FOUNDATION)).toBe(true);
    expect(canAccessResourceTier(MembershipTier.INNER_CIRCLE, ResourceTier.INNER)).toBe(true);
    expect(canAccessResourceTier(MembershipTier.INNER_CIRCLE, ResourceTier.CORE)).toBe(false);

    expect(canAccessResourceTier(MembershipTier.CORE, ResourceTier.FOUNDATION)).toBe(true);
    expect(canAccessResourceTier(MembershipTier.CORE, ResourceTier.INNER)).toBe(true);
    expect(canAccessResourceTier(MembershipTier.CORE, ResourceTier.CORE)).toBe(true);
  });

  it("gives admins access to the full editorial library", () => {
    expect(getAccessibleResourceTiers(roleToTier("ADMIN", MembershipTier.FOUNDATION))).toEqual([
      ResourceTier.FOUNDATION,
      ResourceTier.INNER,
      ResourceTier.CORE
    ]);
  });
});
