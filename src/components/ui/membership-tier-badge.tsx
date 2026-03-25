import type { MembershipTier } from "@prisma/client";
import { Compass, Crown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTierBadgeVariant } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type MembershipTierBadgeProps = {
  tier: MembershipTier;
  className?: string;
  foundationLabel?: string;
  innerCircleLabel?: string;
  coreLabel?: string;
};

export function MembershipTierBadge({
  tier,
  className,
  foundationLabel = "Foundation",
  innerCircleLabel = "Inner Circle",
  coreLabel = "Core"
}: MembershipTierBadgeProps) {
  if (tier === "CORE") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
        <ShieldCheck size={11} className="mr-1" />
        {coreLabel}
      </Badge>
    );
  }

  if (tier === "INNER_CIRCLE") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
        <Crown size={11} className="mr-1" />
        {innerCircleLabel}
      </Badge>
    );
  }

  return (
    <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
      <Compass size={11} className="mr-1" />
      {foundationLabel}
    </Badge>
  );
}
