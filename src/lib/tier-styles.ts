type TierInput = "FOUNDATION" | "INNER_CIRCLE" | "CORE" | "INNER";
type TierTone = "foundation" | "innerCircle" | "core";

type MemberTierPresentation = {
  label: string;
  profileLabel: string;
  description: string;
  cardClassName: string;
  badgeClassName: string;
  signalBadgeClassName: string;
  avatarRingClassName: string;
  headerAccentClassName: string;
  accentTextClassName: string;
  panelClassName: string;
  shouldShowProfileSignal: boolean;
};

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

export function getMemberTierPresentation(tier: TierInput): MemberTierPresentation {
  if (tier === "CORE") {
    return {
      label: "Core",
      profileLabel: "Core member",
      description: "Highest signal tier inside The Business Circle.",
      cardClassName:
        "border-gold/45 bg-[radial-gradient(circle_at_84%_0%,rgba(214,180,103,0.2),transparent_32%),linear-gradient(145deg,rgba(214,180,103,0.12),rgba(15,8,24,0.84)_52%,rgba(8,4,13,0.88))] shadow-[0_26px_70px_rgba(214,180,103,0.18)]",
      badgeClassName: "border-gold/45 bg-gold/18 text-gold shadow-[0_0_24px_rgba(214,180,103,0.24)]",
      signalBadgeClassName:
        "border-gold/45 bg-gold/14 text-gold shadow-[0_0_28px_rgba(214,180,103,0.22)]",
      avatarRingClassName: "ring-2 ring-gold/50 shadow-[0_0_34px_rgba(214,180,103,0.24)]",
      headerAccentClassName: "border-gold/45 bg-gold/12 shadow-[0_22px_70px_rgba(214,180,103,0.18)]",
      accentTextClassName: "text-gold",
      panelClassName: "border-gold/35 bg-gold/10 text-gold",
      shouldShowProfileSignal: true
    };
  }

  if (tier === "INNER_CIRCLE" || tier === "INNER") {
    return {
      label: "Inner Circle",
      profileLabel: "Inner Circle member",
      description: "Elevated member tier with stronger visibility and closer momentum.",
      cardClassName:
        "border-violet-300/35 bg-[radial-gradient(circle_at_84%_0%,rgba(139,92,246,0.18),transparent_34%),linear-gradient(145deg,rgba(79,70,229,0.12),rgba(15,8,28,0.82)_52%,rgba(8,4,16,0.86))] shadow-[0_22px_62px_rgba(109,76,255,0.14)]",
      badgeClassName:
        "border-violet-300/45 bg-violet-500/14 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.18)]",
      signalBadgeClassName:
        "border-violet-300/40 bg-violet-500/12 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]",
      avatarRingClassName: "ring-2 ring-violet-300/45 shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      headerAccentClassName: "border-violet-300/38 bg-violet-500/10 shadow-[0_18px_60px_rgba(109,76,255,0.16)]",
      accentTextClassName: "text-violet-100",
      panelClassName: "border-violet-300/35 bg-violet-500/10 text-violet-100",
      shouldShowProfileSignal: true
    };
  }

  return {
    label: "Foundation",
    profileLabel: "Foundation member",
    description: "Standard member access inside The Business Circle.",
    cardClassName: "border-border/80 bg-card/70",
    badgeClassName: "",
    signalBadgeClassName: "border-border bg-background/30 text-muted",
    avatarRingClassName: "ring-1 ring-border/70",
    headerAccentClassName: "border-border/80 bg-background/28",
    accentTextClassName: "text-muted",
    panelClassName: "border-border/80 bg-background/28 text-muted",
    shouldShowProfileSignal: false
  };
}
