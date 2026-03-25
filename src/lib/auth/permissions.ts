import type { MembershipTier, Role } from "@prisma/client";
import { getMembershipTierRank } from "@/config/membership";

export type AccessUser = {
  role: Role;
  membershipTier: MembershipTier;
  hasActiveSubscription: boolean;
  suspended: boolean;
};

export function isAdminRole(role: Role): boolean {
  return role === "ADMIN";
}

export function resolveEffectiveTier(role: Role, membershipTier: MembershipTier): MembershipTier {
  if (role === "ADMIN") {
    return "CORE";
  }

  if (role === "INNER_CIRCLE" && getMembershipTierRank(membershipTier) < getMembershipTierRank("INNER_CIRCLE")) {
    return "INNER_CIRCLE";
  }

  return membershipTier;
}

export function canTierAccess(currentTier: MembershipTier, requiredTier: MembershipTier): boolean {
  return getMembershipTierRank(currentTier) >= getMembershipTierRank(requiredTier);
}

export function userCanAccessTier(user: AccessUser, requiredTier: MembershipTier): boolean {
  if (user.suspended) {
    return false;
  }

  if (!isAdminRole(user.role) && !user.hasActiveSubscription) {
    return false;
  }

  const effectiveTier = resolveEffectiveTier(user.role, user.membershipTier);
  return canTierAccess(effectiveTier, requiredTier);
}

export function canAccessMemberArea(user: AccessUser): boolean {
  if (user.suspended) {
    return false;
  }

  if (isAdminRole(user.role)) {
    return true;
  }

  return user.hasActiveSubscription;
}

export function canAccessInnerCircleArea(user: AccessUser): boolean {
  return userCanAccessTier(user, "INNER_CIRCLE");
}

export function canAccessCoreArea(user: AccessUser): boolean {
  return userCanAccessTier(user, "CORE");
}
