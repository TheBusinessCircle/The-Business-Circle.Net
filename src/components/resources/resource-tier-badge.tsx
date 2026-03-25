import type { ResourceTier } from "@prisma/client";
import { Compass, Crown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTierBadgeVariant } from "@/lib/tier-styles";

export function ResourceTierBadge({ tier }: { tier: ResourceTier }) {
  if (tier === "CORE") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className="gap-1">
        <ShieldCheck size={11} className="mr-1" />
        Core
      </Badge>
    );
  }

  if (tier === "INNER") {
    return (
      <Badge variant={getTierBadgeVariant(tier)} className="gap-1">
        <Crown size={11} className="mr-1" />
        Inner Circle
      </Badge>
    );
  }

  return (
    <Badge variant={getTierBadgeVariant(tier)} className="gap-1">
      <Compass size={11} className="mr-1" />
      Foundation
    </Badge>
  );
}
