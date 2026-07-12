import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import {
  CIRCLE_CARD_FREE_CARD_LIMIT,
  CIRCLE_CARD_LAUNCH_LIMITS,
  CIRCLE_CARD_PRO_CARD_LIMIT,
  CIRCLE_CARD_TEAMS_STAFF_CARD_LIMIT,
  getCircleCardLaunchCapabilities,
  type CircleCardLaunchCapabilities,
  type CircleCardPlanKey
} from "@/lib/circle-card/plans";

export const CIRCLE_CARD_ACCESS_LEVELS = [
  "FREE",
  "PRO",
  "TEAMS",
  "BCN_FOUNDATION",
  "BCN_INNER_CIRCLE",
  "BCN_CORE"
] as const;

export type CircleCardAccessLevel = (typeof CIRCLE_CARD_ACCESS_LEVELS)[number];

export const CIRCLE_CARD_ENTITLEMENT_SOURCES = [
  "FREE",
  "PRO_SUBSCRIPTION",
  "TEAMS_SUBSCRIPTION",
  "BCN_INCLUDED_PRO",
  "ADMIN_OVERRIDE",
  "EARLY_ACCESS",
  "AMBASSADOR_FREE_PRO"
] as const;

export type CircleCardEntitlementSource =
  (typeof CIRCLE_CARD_ENTITLEMENT_SOURCES)[number];

export type PaidCircleCardPlanKey = Exclude<CircleCardPlanKey, "FREE">;

export type CircleCardBillingReportCategory =
  | "FREE"
  | "PAID_CIRCLE_CARD"
  | "BCN_INCLUDED"
  | "ADMIN_OVERRIDE"
  | "EARLY_ACCESS"
  | "AMBASSADOR_FREE";

export type CircleCardEntitlementInput = {
  role?: Role | null;
  membershipTier?: MembershipTier | null;
  hasActiveSubscription?: boolean | null;
  suspended?: boolean | null;
  hasActiveCircleCardSubscription?: boolean | null;
  circleCardSubscriptionPlan?: PaidCircleCardPlanKey | null;
  circleCardAdminOverridePlan?: PaidCircleCardPlanKey | null;
  circleCardEarlyAccessPlan?: PaidCircleCardPlanKey | null;
  circleCardAmbassadorFreePro?: boolean | null;
};

export type CircleCardEntitlement = {
  plan: CircleCardPlanKey;
  source: CircleCardEntitlementSource;
  accessLevel: CircleCardAccessLevel;
  label: string;
  billingReportCategory: CircleCardBillingReportCategory;
  membershipTier: MembershipTier | null;
  hasPaidCircleCardSubscription: boolean;
  isBcnIncludedPro: boolean;
  isAdminOverride: boolean;
  isEarlyAccess: boolean;
  isAmbassadorFreePro: boolean;
  affectsBcnSubscription: false;
};

export const CIRCLE_CARD_ACCESS_SOURCES = [
  "free",
  "standalone_subscription",
  "bcn_membership",
  "admin",
  "ambassador",
  "grandfathered",
  "teams"
] as const;

export type CircleCardAccessSource = (typeof CIRCLE_CARD_ACCESS_SOURCES)[number];

export type CircleCardAccessLimits = {
  circleCards: number;
  activeLinks: number;
  businessServices: number;
  businessProducts: number;
  businessPriceListItems: number;
  businessMenuOffers: number;
  businessDocuments: number;
  businessGalleryImages: number;
  businessReviews: number;
  creatorFeaturedContent: number;
  creatorOffers: number;
  creatorPressProof: number;
  creatorBrandPartnerships: number;
};

export type CircleCardAccessSnapshot = {
  plan: CircleCardPlanKey;
  source: CircleCardAccessSource;
  hasProAccess: boolean;
  accessEndsAt: Date | null;
  subscriptionStatus: SubscriptionStatus | null;
  isInRecoveryGrace: boolean;
  limits: CircleCardAccessLimits;
  capabilities: CircleCardLaunchCapabilities;
  entitlement: CircleCardEntitlement;
};

function circleCardAccessSource(source: CircleCardEntitlementSource): CircleCardAccessSource {
  switch (source) {
    case "PRO_SUBSCRIPTION":
      return "standalone_subscription";
    case "TEAMS_SUBSCRIPTION":
      return "teams";
    case "BCN_INCLUDED_PRO":
      return "bcn_membership";
    case "ADMIN_OVERRIDE":
      return "admin";
    case "AMBASSADOR_FREE_PRO":
      return "ambassador";
    case "EARLY_ACCESS":
      return "grandfathered";
    case "FREE":
    default:
      return "free";
  }
}

function circleCardAccessLimits(plan: CircleCardPlanKey): CircleCardAccessLimits {
  if (plan === "FREE") {
    return {
      circleCards: CIRCLE_CARD_LAUNCH_LIMITS.FREE.circleCards,
      activeLinks: CIRCLE_CARD_LAUNCH_LIMITS.FREE.activeLinks,
      businessServices: 0,
      businessProducts: 0,
      businessPriceListItems: 0,
      businessMenuOffers: 0,
      businessDocuments: 0,
      businessGalleryImages: 0,
      businessReviews: 0,
      creatorFeaturedContent: CIRCLE_CARD_LAUNCH_LIMITS.FREE.creatorFeaturedContent,
      creatorOffers: CIRCLE_CARD_LAUNCH_LIMITS.FREE.creatorOffers,
      creatorPressProof: CIRCLE_CARD_LAUNCH_LIMITS.FREE.creatorPressProof,
      creatorBrandPartnerships: CIRCLE_CARD_LAUNCH_LIMITS.FREE.creatorBrandPartnerships
    };
  }

  return {
    ...CIRCLE_CARD_LAUNCH_LIMITS.PRO
  };
}

export function buildCircleCardAccessSnapshot(input: {
  entitlement: CircleCardEntitlement;
  accessEndsAt?: Date | null;
  subscriptionStatus?: SubscriptionStatus | null;
  isInRecoveryGrace?: boolean;
}): CircleCardAccessSnapshot {
  return {
    plan: input.entitlement.plan,
    source: circleCardAccessSource(input.entitlement.source),
    hasProAccess: input.entitlement.plan !== "FREE",
    accessEndsAt: input.accessEndsAt ?? null,
    subscriptionStatus: input.subscriptionStatus ?? null,
    isInRecoveryGrace: input.isInRecoveryGrace ?? false,
    limits: circleCardAccessLimits(input.entitlement.plan),
    capabilities: getCircleCardLaunchCapabilities(input.entitlement.plan),
    entitlement: input.entitlement
  };
}

export const CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS: Record<
  CircleCardEntitlementSource,
  string
> = {
  FREE: "Circle Card Free",
  PRO_SUBSCRIPTION: "Paid Circle Card Pro",
  TEAMS_SUBSCRIPTION: "Paid Circle Card Teams",
  BCN_INCLUDED_PRO: "BCN Included Pro",
  ADMIN_OVERRIDE: "Admin Preview",
  EARLY_ACCESS: "Early Access",
  AMBASSADOR_FREE_PRO: "Ambassador Free Pro"
};

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
    label: "Circle Card Free",
    cardLimit: CIRCLE_CARD_FREE_CARD_LIMIT,
    futureCardLimit: CIRCLE_CARD_FREE_CARD_LIMIT,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  PRO: {
    label: "Pro",
    cardLimit: CIRCLE_CARD_PRO_CARD_LIMIT,
    futureCardLimit: CIRCLE_CARD_PRO_CARD_LIMIT,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  TEAMS: {
    label: "Teams",
    cardLimit: CIRCLE_CARD_TEAMS_STAFF_CARD_LIMIT,
    futureCardLimit: CIRCLE_CARD_TEAMS_STAFF_CARD_LIMIT,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: true
  },
  BCN_FOUNDATION: {
    label: "Foundation Member",
    cardLimit: 1,
    futureCardLimit: 1,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  BCN_INNER_CIRCLE: {
    label: "Inner Circle Member",
    cardLimit: 1,
    futureCardLimit: 3,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: false
  },
  BCN_CORE: {
    label: "Core Member",
    cardLimit: 1,
    futureCardLimit: 5,
    walletEnabled: true,
    notesEnabled: true,
    analyticsPreview: true,
    teamsPreview: true
  }
};

const CIRCLE_CARD_ACCESS_LEVEL_BY_PLAN: Record<CircleCardPlanKey, CircleCardAccessLevel> = {
  FREE: "FREE",
  PRO: "PRO",
  TEAMS: "TEAMS"
};

function circleCardBillingReportCategory(
  source: CircleCardEntitlementSource
): CircleCardBillingReportCategory {
  switch (source) {
    case "PRO_SUBSCRIPTION":
    case "TEAMS_SUBSCRIPTION":
      return "PAID_CIRCLE_CARD";
    case "BCN_INCLUDED_PRO":
      return "BCN_INCLUDED";
    case "ADMIN_OVERRIDE":
      return "ADMIN_OVERRIDE";
    case "EARLY_ACCESS":
      return "EARLY_ACCESS";
    case "AMBASSADOR_FREE_PRO":
      return "AMBASSADOR_FREE";
    case "FREE":
    default:
      return "FREE";
  }
}

function buildCircleCardEntitlement(input: {
  plan: CircleCardPlanKey;
  source: CircleCardEntitlementSource;
  membershipTier?: MembershipTier | null;
}): CircleCardEntitlement {
  const hasPaidCircleCardSubscription =
    input.source === "PRO_SUBSCRIPTION" || input.source === "TEAMS_SUBSCRIPTION";

  return {
    plan: input.plan,
    source: input.source,
    accessLevel: CIRCLE_CARD_ACCESS_LEVEL_BY_PLAN[input.plan],
    label: CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS[input.source],
    billingReportCategory: circleCardBillingReportCategory(input.source),
    membershipTier: input.membershipTier ?? null,
    hasPaidCircleCardSubscription,
    isBcnIncludedPro: input.source === "BCN_INCLUDED_PRO",
    isAdminOverride: input.source === "ADMIN_OVERRIDE",
    isEarlyAccess: input.source === "EARLY_ACCESS",
    isAmbassadorFreePro: input.source === "AMBASSADOR_FREE_PRO",
    affectsBcnSubscription: false
  };
}

export function resolveCircleCardEntitlement(
  input?: CircleCardEntitlementInput
): CircleCardEntitlement {
  if (!input?.role || input.suspended) {
    return buildCircleCardEntitlement({ plan: "FREE", source: "FREE" });
  }

  if (input.circleCardAdminOverridePlan) {
    return buildCircleCardEntitlement({
      plan: input.circleCardAdminOverridePlan,
      source: "ADMIN_OVERRIDE",
      membershipTier: input.membershipTier
    });
  }

  if (input.role === "ADMIN") {
    return buildCircleCardEntitlement({
      plan: "PRO",
      source: "ADMIN_OVERRIDE",
      membershipTier: input.membershipTier
    });
  }

  if (input.hasActiveCircleCardSubscription && input.circleCardSubscriptionPlan) {
    return buildCircleCardEntitlement({
      plan: input.circleCardSubscriptionPlan,
      source:
        input.circleCardSubscriptionPlan === "TEAMS"
          ? "TEAMS_SUBSCRIPTION"
          : "PRO_SUBSCRIPTION",
      membershipTier: input.membershipTier
    });
  }

  if (input.circleCardAmbassadorFreePro) {
    return buildCircleCardEntitlement({
      plan: "PRO",
      source: "AMBASSADOR_FREE_PRO",
      membershipTier: input.membershipTier
    });
  }

  if (input.hasActiveSubscription) {
    return buildCircleCardEntitlement({
      plan: "PRO",
      source: "BCN_INCLUDED_PRO",
      membershipTier: input.membershipTier
    });
  }

  if (input.circleCardEarlyAccessPlan) {
    return buildCircleCardEntitlement({
      plan: input.circleCardEarlyAccessPlan,
      source: "EARLY_ACCESS",
      membershipTier: input.membershipTier
    });
  }

  return buildCircleCardEntitlement({
    plan: "FREE",
    source: "FREE",
    membershipTier: input.membershipTier
  });
}

export function resolveCircleCardAccessLevel(input?: CircleCardEntitlementInput): CircleCardAccessLevel {
  return resolveCircleCardEntitlement(input).accessLevel;
}

export function getCircleCardFeatureAccess(accessLevel: CircleCardAccessLevel) {
  return CIRCLE_CARD_FEATURE_ACCESS[accessLevel];
}

export function canAccessCircleCard(input?: {
  role?: Role | null;
  suspended?: boolean | null;
}) {
  return Boolean(input?.role) && !input?.suspended;
}

export function canAccessBcnMemberFeatures(input?: {
  role?: Role | null;
  hasActiveSubscription?: boolean | null;
  suspended?: boolean | null;
}) {
  if (!input?.role || input.suspended) {
    return false;
  }

  return input.role === "ADMIN" || Boolean(input.hasActiveSubscription);
}

export function isCircleCardFreeAccount(input?: CircleCardEntitlementInput) {
  return (
    canAccessCircleCard(input) &&
    resolveCircleCardEntitlement(input).source === "FREE"
  );
}

export function getCircleCardAccountLabel(input?: CircleCardEntitlementInput) {
  return resolveCircleCardEntitlement(input).label;
}

export function canCreateCircleCard(input: {
  accessLevel: CircleCardAccessLevel;
  existingCardCount: number;
}) {
  return input.existingCardCount < CIRCLE_CARD_FEATURE_ACCESS[input.accessLevel].cardLimit;
}
