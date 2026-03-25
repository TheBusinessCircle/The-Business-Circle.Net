import type { MembershipTier } from "@prisma/client";
import { Compass, Crown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTierBadgeVariant } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type FoundingBadgeProps = {
  tier: MembershipTier | null | undefined;
  className?: string;
};

export function FoundingBadge({ tier, className }: FoundingBadgeProps) {
  if (!tier) {
    return null;
  }

  if (tier === "CORE") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
        <ShieldCheck size={11} />
        Founding Core
      </Badge>
    );
  }

  if (tier === "INNER_CIRCLE") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
        <Crown size={11} />
        Founding Inner Circle
      </Badge>
    );
  }

  return (
    <Badge variant={getTierBadgeVariant(tier)} className={cn("gap-1", className)}>
      <Compass size={11} />
      Founding Foundation
    </Badge>
  );
}
