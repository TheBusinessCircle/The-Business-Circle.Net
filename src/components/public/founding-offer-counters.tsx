import type { MembershipTier } from "@prisma/client";
import type { FoundingOfferSnapshot } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getTierBadgeVariant, getTierPanelClassName } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type FoundingOfferCountersProps = {
  offer: FoundingOfferSnapshot;
  className?: string;
};

function counterTone(tier: MembershipTier) {
  return getTierPanelClassName(tier);
}

export function FoundingOfferCounters({ offer, className }: FoundingOfferCountersProps) {
  const items = [offer.foundation, offer.innerCircle, offer.core];

  return (
    <div className={cn("grid gap-3 md:grid-cols-3", className)}>
      {items.map((item) => (
        <div
          key={item.tier}
          className={cn("rounded-2xl border px-4 py-4", counterTone(item.tier))}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{item.badgeLabel}</p>
            <Badge variant={item.available ? getTierBadgeVariant(item.tier) : "muted"}>
              {item.available ? "Available" : "Closed"}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-foreground">
            {item.claimed} of {item.limit} founding places claimed
          </p>
          <p className="mt-1 text-xs text-muted">
            {item.available
              ? "Locked-in launch pricing while places remain."
              : "Launch pricing has closed. Standard membership pricing now applies."}
          </p>
        </div>
      ))}
    </div>
  );
}
