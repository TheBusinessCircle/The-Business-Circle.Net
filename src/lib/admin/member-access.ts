import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import { getMembershipTierLabel } from "@/config/membership";
import {
  CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS,
  resolveCircleCardEntitlement,
  type CircleCardEntitlementSource,
  type PaidCircleCardPlanKey
} from "@/lib/circle-card/permissions";
import type { CircleCardPlanKey } from "@/lib/circle-card/plans";

export const BCN_ENTITLED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "TRIALING"
];

export type AdminMemberCircleCardPlan = CircleCardEntitlementSource;

export type AdminMemberAccessSummary = {
  circleCardPlan: AdminMemberCircleCardPlan;
  circleCardEntitlementPlan: CircleCardPlanKey;
  circleCardEntitlementSource: CircleCardEntitlementSource;
  bcnMembershipTier: MembershipTier | null;
  hasBcnMembershipAccess: boolean;
  isAdmin: boolean;
};

export function hasBcnMembershipEntitlement(
  subscriptionStatus: SubscriptionStatus | "NONE" | null | undefined
) {
  return (
    subscriptionStatus === "ACTIVE" ||
    subscriptionStatus === "TRIALING"
  );
}

export function resolveAdminMemberAccess(input: {
  role: Role;
  membershipTier: MembershipTier;
  subscriptionStatus: SubscriptionStatus | "NONE" | null | undefined;
  subscriptionTier?: MembershipTier | null;
  hasActiveCircleCardSubscription?: boolean | null;
  circleCardSubscriptionPlan?: PaidCircleCardPlanKey | null;
  circleCardAdminOverridePlan?: PaidCircleCardPlanKey | null;
  circleCardEarlyAccessPlan?: PaidCircleCardPlanKey | null;
}): AdminMemberAccessSummary {
  const isAdmin = input.role === "ADMIN";
  const hasBcnMembershipAccess = hasBcnMembershipEntitlement(input.subscriptionStatus);
  const circleCardEntitlement = resolveCircleCardEntitlement({
    role: input.role,
    membershipTier: input.membershipTier,
    hasActiveSubscription: hasBcnMembershipAccess,
    hasActiveCircleCardSubscription: input.hasActiveCircleCardSubscription,
    circleCardSubscriptionPlan: input.circleCardSubscriptionPlan,
    circleCardAdminOverridePlan: input.circleCardAdminOverridePlan,
    circleCardEarlyAccessPlan: input.circleCardEarlyAccessPlan
  });

  return {
    circleCardPlan: circleCardEntitlement.source,
    circleCardEntitlementPlan: circleCardEntitlement.plan,
    circleCardEntitlementSource: circleCardEntitlement.source,
    bcnMembershipTier: hasBcnMembershipAccess
      ? input.subscriptionTier ?? input.membershipTier
      : null,
    hasBcnMembershipAccess,
    isAdmin
  };
}

export function getAdminCircleCardPlanLabel(plan: AdminMemberCircleCardPlan) {
  return CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS[plan];
}

export function getAdminBcnMembershipLabel(tier: MembershipTier | null) {
  return tier ? getMembershipTierLabel(tier) : "None";
}
