import { Badge } from "@/components/ui/badge";
import { getTierBadgeVariant } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type TierBadgeProps = {
  tier: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
  className?: string;
};

const TIER_LABELS: Record<TierBadgeProps["tier"], string> = {
  FOUNDATION: "Foundation",
  INNER_CIRCLE: "Inner Circle",
  CORE: "Core"
};

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <Badge
      variant={getTierBadgeVariant(tier)}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] tracking-[0.08em] uppercase",
        className
      )}
    >
      {TIER_LABELS[tier]}
    </Badge>
  );
}
