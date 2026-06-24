import type { MembershipTier, Role } from "@prisma/client";
import {
  CIRCLE_CARD_FREE_CARD_LIMIT,
  CIRCLE_CARD_PRO_CARD_LIMIT,
  CIRCLE_CARD_TEAMS_STAFF_CARD_LIMIT,
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
  "EARLY_ACCESS"
] as const;

export type CircleCardEntitlementSource =
  (typeof CIRCLE_CARD_ENTITLEMENT_SOURCES)[number];

export type PaidCircleCardPlanKey = Exclude<CircleCardPlanKey, "FREE">;

export type CircleCardBillingReportCategory =
  | "FREE"
  | "PAID_CIRCLE_CARD"
  | "BCN_INCLUDED"
  | "ADMIN_OVERRIDE"
  | "EARLY_ACCESS";

export type CircleCardEntitlementInput = {
  role?: Role | null;
  membershipTier?: MembershipTier | null;
  hasActiveSubscription?: boolean | null;
  suspended?: boolean | null;
  hasActiveCircleCardSubscription?: boolean | null;
  circleCardSubscriptionPlan?: PaidCircleCardPlanKey | null;
  circleCardAdminOverridePlan?: PaidCircleCardPlanKey | null;
  circleCardEarlyAccessPlan?: PaidCircleCardPlanKey | null;
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
  affectsBcnSubscription: false;
};

export const CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS: Record<
  CircleCardEntitlementSource,
  string
> = {
  FREE: "Circle Card Free",
  PRO_SUBSCRIPTION: "Paid Circle Card Pro",
  TEAMS_SUBSCRIPTION: "Paid Circle Card Teams",
  BCN_INCLUDED_PRO: "BCN Included Pro",
  ADMIN_OVERRIDE: "Admin Preview",
  EARLY_ACCESS: "Early Access"
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
