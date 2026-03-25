type TierInput = "FOUNDATION" | "INNER_CIRCLE" | "CORE" | "INNER";
type TierTone = "foundation" | "innerCircle" | "core";

const TIER_STYLE_MAP: Record<
  TierTone,
  {
    badgeVariant: "foundation" | "innerCircle" | "core";
    buttonVariant: "foundation" | "innerCircle" | "core";
    card: string;
    selectedRing: string;
    featuredPill: string;
    accentText: string;
    icon: string;
    panel: string;
  }
> = {
  foundation: {
    badgeVariant: "foundation",
    buttonVariant: "foundation",
    card: "border-foundation/28 bg-gradient-to-br from-foundation/12 via-card/78 to-card/70",
    selectedRing: "ring-1 ring-foundation/35",
    featuredPill: "border-foundation/35 bg-foundation/14 text-foundation",
    accentText: "text-foundation",
    icon: "text-foundation",
    panel: "border-foundation/28 bg-foundation/10 text-foundation"
  },
  innerCircle: {
    badgeVariant: "innerCircle",
    buttonVariant: "innerCircle",
    card: "border-silver/22 bg-gradient-to-br from-silver/12 via-card/78 to-card/70",
    selectedRing: "ring-1 ring-silver/28",
    featuredPill: "border-silver/24 bg-silver/12 text-silver",
    accentText: "text-silver",
    icon: "text-silver",
    panel: "border-silver/22 bg-silver/10 text-silver"
  },
  core: {
    badgeVariant: "core",
    buttonVariant: "core",
    card: "border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/68",
    selectedRing: "ring-1 ring-gold/38",
    featuredPill: "border-gold/40 bg-gold/15 text-gold",
    accentText: "text-gold",
    icon: "text-gold",
    panel: "border-gold/34 bg-gold/10 text-gold"
  }
};

function normalizeTierTone(tier: TierInput): TierTone {
  if (tier === "CORE") {
    return "core";
  }

  if (tier === "INNER_CIRCLE" || tier === "INNER") {
    return "innerCircle";
  }

  return "foundation";
}

export function getTierBadgeVariant(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].badgeVariant;
}

export function getTierButtonVariant(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].buttonVariant;
}

export function getTierCardClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].card;
}

export function getTierSelectionRingClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].selectedRing;
}

export function getTierFeaturedPillClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].featuredPill;
}

export function getTierAccentTextClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].accentText;
}

export function getTierIconClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].icon;
}

export function getTierPanelClassName(tier: TierInput) {
  return TIER_STYLE_MAP[normalizeTierTone(tier)].panel;
}
