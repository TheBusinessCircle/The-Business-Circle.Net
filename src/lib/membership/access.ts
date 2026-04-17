import { SubscriptionStatus } from "@prisma/client";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

export type MembershipAccessState =
  | "active"
  | "pending"
  | "past_due"
  | "cancelled"
  | "inactive";

export function hasEntitledSubscription(status: SubscriptionStatus | null | undefined) {
  if (!status) {
    return false;
  }

  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

export function resolveMembershipAccessState(
  status: SubscriptionStatus | null | undefined
): MembershipAccessState {
  if (hasEntitledSubscription(status)) {
    return "active";
  }

  switch (status) {
    case SubscriptionStatus.INCOMPLETE:
    case SubscriptionStatus.INCOMPLETE_EXPIRED:
    case SubscriptionStatus.PAUSED:
      return "pending";
    case SubscriptionStatus.PAST_DUE:
    case SubscriptionStatus.UNPAID:
      return "past_due";
    case SubscriptionStatus.CANCELED:
      return "cancelled";
    default:
      return "inactive";
  }
}

export function membershipAccessBillingQuery(
  status: SubscriptionStatus | null | undefined
) {
  switch (resolveMembershipAccessState(status)) {
    case "pending":
      return "pending";
    case "past_due":
      return "past-due";
    case "cancelled":
      return "cancelled-access";
    default:
      return "required";
  }
}
