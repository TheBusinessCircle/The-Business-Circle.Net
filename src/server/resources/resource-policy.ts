import { MembershipTier, ResourceTier } from "@prisma/client";
import { canTierAccess } from "@/lib/auth/permissions";
import {
  allowedEditorialResourceTiers,
  membershipTierForResourceTier
} from "@/lib/db/access";

export function getAccessibleResourceTiers(userTier: MembershipTier): ResourceTier[] {
  return allowedEditorialResourceTiers(userTier);
}

export function canAccessResourceTier(
  userTier: MembershipTier,
  resourceTier: ResourceTier
): boolean {
  return (
    getAccessibleResourceTiers(userTier).includes(resourceTier) &&
    canTierAccess(userTier, membershipTierForResourceTier(resourceTier))
  );
}
