import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import { getMembershipTierLabel } from "@/config/membership";

export const BCN_ENTITLED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "TRIALING"
];

export type AdminMemberCircleCardPlan = "FREE" | "INCLUDED" | "ADMIN";

export type AdminMemberAccessSummary = {
  circleCardPlan: AdminMemberCircleCardPlan;
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
}): AdminMemberAccessSummary {
  const isAdmin = input.role === "ADMIN";
  const hasBcnMembershipAccess = hasBcnMembershipEntitlement(input.subscriptionStatus);

  return {
    circleCardPlan: isAdmin ? "ADMIN" : hasBcnMembershipAccess ? "INCLUDED" : "FREE",
    bcnMembershipTier: hasBcnMembershipAccess
      ? input.subscriptionTier ?? input.membershipTier
      : null,
    hasBcnMembershipAccess,
    isAdmin
  };
}

export function getAdminCircleCardPlanLabel(plan: AdminMemberCircleCardPlan) {
  switch (plan) {
    case "ADMIN":
      return "Admin Access";
    case "INCLUDED":
      return "Included / Active";
    case "FREE":
    default:
      return "Free";
  }
}

export function getAdminBcnMembershipLabel(tier: MembershipTier | null) {
  return tier ? getMembershipTierLabel(tier) : "None";
}
