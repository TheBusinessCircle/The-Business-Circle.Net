import type { MembershipTier } from "@prisma/client";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";

type EventTierBadgeProps = {
  tier: MembershipTier;
};

export function EventTierBadge({ tier }: EventTierBadgeProps) {
  return <MembershipTierBadge tier={tier} />;
}
