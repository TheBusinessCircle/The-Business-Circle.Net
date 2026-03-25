import type { MembershipTier, Role } from "@prisma/client";
import { canTierAccess, isAdminRole, resolveEffectiveTier } from "@/lib/auth/permissions";

export function canAccessTier(userTier: MembershipTier, requiredTier: MembershipTier) {
  return canTierAccess(userTier, requiredTier);
}

export function roleToTier(role: Role, tier: MembershipTier) {
  return resolveEffectiveTier(role, tier);
}

export function isAdmin(role: Role) {
  return isAdminRole(role);
}
