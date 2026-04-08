import type { MembershipTier } from "@prisma/client";
import { formatMembershipPrice, getMembershipTierLabel } from "@/config/membership";
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
            <p className="text-sm font-medium">{getMembershipTierLabel(item.tier)}</p>
            <Badge variant={item.available ? getTierBadgeVariant(item.tier) : "muted"}>
              {item.available ? "Founding access" : item.statusLabel}
            </Badge>
          </div>
          {item.available ? (
            <>
              <p className="mt-3 text-sm text-foreground">
                Early access from {formatMembershipPrice(item.foundingPrice)}/month
              </p>
              <p className="mt-1 text-xs text-muted">
                {item.remaining} of {item.limit} founding places remain. When they are filled,
                pricing moves to {formatMembershipPrice(item.standardPrice)}/month.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-foreground">
                Standard access from {formatMembershipPrice(item.standardPrice)}/month
              </p>
              <p className="mt-1 text-xs text-muted">
                {item.launchClosedLabel}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
