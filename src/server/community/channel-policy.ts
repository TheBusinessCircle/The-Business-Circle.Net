import { MembershipTier } from "@prisma/client";
import { canTierAccess } from "@/lib/auth/permissions";

export function canAccessChannelTier(userTier: MembershipTier, channelTier: MembershipTier): boolean {
  return canTierAccess(userTier, channelTier);
}
