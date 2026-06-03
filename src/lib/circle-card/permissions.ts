import type { MembershipTier, Role } from "@prisma/client";
import { getMembershipTierRank } from "@/config/membership";

export const CIRCLE_CARD_ACCESS_LEVELS = [
  "FREE",
  "PRO",
  "TEAMS",
  "BCN_FOUNDATION",
  "BCN_INNER_CIRCLE",
  "BCN_CORE"
] as const;

export type CircleCardAccessLevel = (typeof CIRCLE_CARD_ACCESS_LEVELS)[number];

export type CircleCardFeatureAccess = {
  label: string;
  cardLimit: number;
  futureCardLimit: number;
  walletEnabled: boolean;
  notesEnabled: boolean;
  analyticsPreview: boolean;
  teamsPreview: boolean;
};

export const CIRCLE_CARD_FEATURE_ACCESS: Record<CircleCardAccessLevel, CircleCardFeatureAccess> = {
  FREE: {
    label: "Free",
    cardLimit: 1,
    futureCardLimit: 1,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  PRO: {
    label: "Pro",
    cardLimit: 1,
    futureCardLimit: 3,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  TEAMS: {
    label: "Teams",
    cardLimit: 1,
    futureCardLimit: 25,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: true
  },
  BCN_FOUNDATION: {
    label: "BCN Foundation",
    cardLimit: 1,
    futureCardLimit: 1,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  BCN_INNER_CIRCLE: {
    label: "BCN Inner Circle",
    cardLimit: 1,
    futureCardLimit: 3,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  BCN_CORE: {
    label: "BCN Core",
    cardLimit: 1,
    futureCardLimit: 5,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: true
  }
};

export function resolveCircleCardAccessLevel(input?: {
  role?: Role | null;
  membershipTier?: MembershipTier | null;
}): CircleCardAccessLevel {
  if (!input?.role || !input.membershipTier) {
    return "FREE";
  }

  if (input.role === "ADMIN") {
    return "BCN_CORE";
  }

  if (getMembershipTierRank(input.membershipTier) >= getMembershipTierRank("CORE")) {
    return "BCN_CORE";
  }

  if (getMembershipTierRank(input.membershipTier) >= getMembershipTierRank("INNER_CIRCLE")) {
    return "BCN_INNER_CIRCLE";
  }

  return "BCN_FOUNDATION";
}

export function getCircleCardFeatureAccess(accessLevel: CircleCardAccessLevel) {
  return CIRCLE_CARD_FEATURE_ACCESS[accessLevel];
}

export function canCreateCircleCard(input: {
  accessLevel: CircleCardAccessLevel;
  existingCardCount: number;
}) {
  return input.existingCardCount < CIRCLE_CARD_FEATURE_ACCESS[input.accessLevel].cardLimit;
}
