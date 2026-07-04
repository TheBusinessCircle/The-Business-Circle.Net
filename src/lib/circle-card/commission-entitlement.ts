import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import type { PaidCircleCardPlanKey } from "@/lib/circle-card/permissions";
import { resolveCircleCardEntitlement } from "@/lib/circle-card/permissions";
import { CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE } from "@/lib/circle-card/referral-rewards";
import { hasEntitledSubscription } from "@/lib/membership/access";

export type CircleCardCommissionEntitlementSource =
  | "FREE"
  | "BCN_INCLUDED_PRO"
  | "PRO_SUBSCRIPTION"
  | "TEAMS_SUBSCRIPTION"
  | "ADMIN_OVERRIDE"
  | "AMBASSADOR_FREE_PRO";

export function resolveCircleCardCommissionProEntitlement(input: {
  role: Role;
  membershipTier: MembershipTier;
  suspended: boolean;
  subscriptionStatus?: SubscriptionStatus | null;
  ambassadorFreeProGranted?: boolean | null;
  ambassadorActive?: boolean | null;
  /** Future Stripe webhook handoff: pass persisted Circle Card subscription state here. */
  hasActiveCircleCardSubscription?: boolean | null;
  circleCardSubscriptionPlan?: PaidCircleCardPlanKey | null;
}) {
  const hasAmbassadorOverride = Boolean(
    input.ambassadorFreeProGranted && input.ambassadorActive !== false
  );
  const entitlement = resolveCircleCardEntitlement({
    role: input.role,
    membershipTier: input.membershipTier,
    suspended: input.suspended,
    hasActiveSubscription: hasEntitledSubscription(input.subscriptionStatus),
    hasActiveCircleCardSubscription: input.hasActiveCircleCardSubscription,
    circleCardSubscriptionPlan: input.circleCardSubscriptionPlan,
    circleCardAdminOverridePlan: hasAmbassadorOverride ? "PRO" : null
  });
  const activePro = !input.suspended && entitlement.plan !== "FREE";
  const source: CircleCardCommissionEntitlementSource = !activePro
    ? "FREE"
    : hasAmbassadorOverride
      ? "AMBASSADOR_FREE_PRO"
      : entitlement.source === "BCN_INCLUDED_PRO" ||
          entitlement.source === "PRO_SUBSCRIPTION" ||
          entitlement.source === "TEAMS_SUBSCRIPTION"
        ? entitlement.source
        : "ADMIN_OVERRIDE";

  return {
    activePro,
    source,
    plan: entitlement.plan,
    notice: CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE,
    stripeIntegrationReady: true as const
  };
}
