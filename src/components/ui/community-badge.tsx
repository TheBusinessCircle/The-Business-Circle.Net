import { Crown, Link2, Medal, Shield, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CommunityBadgeModel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CommunityBadgeProps = {
  badge: CommunityBadgeModel | null | undefined;
  className?: string;
  mode?: "icon" | "pill";
};

const iconMap: Record<NonNullable<CommunityBadgeModel["icon"]>, LucideIcon> = {
  crown: Crown,
  star: Star,
  link: Link2,
  shield: Shield,
  medal: Medal,
  sparkles: Sparkles
};

function badgeTone(slug: string) {
  if (slug === "founder" || slug === "founding-inner-circle") {
    return "border-gold/40 bg-gold/12 text-gold";
  }

  if (slug === "core" || slug === "founding-core") {
    return "border-silver/35 bg-silver/10 text-foreground";
  }

  if (slug === "founding-member") {
    return "border-silver/35 bg-silver/10 text-silver";
  }

  if (slug === "inner-circle") {
    return "border-gold/30 bg-gold/10 text-gold";
  }

  return "border-border/80 bg-background/35 text-muted";
}

export function CommunityBadge({ badge, className, mode = "pill" }: CommunityBadgeProps) {
  if (!badge) {
    return null;
  }

  const Icon = iconMap[badge.icon] ?? Shield;

  if (mode === "icon") {
    return (
      <span
        title={badge.name}
        className={cn("inline-flex items-center justify-center text-gold", className)}
      >
        <Icon size={12} />
      </span>
    );
  }

  return (
    <Badge className={cn("inline-flex items-center gap-1 normal-case tracking-normal", badgeTone(badge.slug), className)}>
      <Icon size={12} />
      {badge.name}
    </Badge>
  );
}
