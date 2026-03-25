import { FoundingReservationSource, SubscriptionStatus } from "@prisma/client";

const NON_MEMBER_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.INCOMPLETE,
  SubscriptionStatus.INCOMPLETE_EXPIRED
]);

type MembershipHistorySnapshot = {
  foundingMember?: boolean | null;
  subscription?: {
    status?: SubscriptionStatus | null;
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: Date | null;
    canceledAt?: Date | null;
  } | null;
};

export function hasMembershipHistory(input: MembershipHistorySnapshot): boolean {
  if (input.foundingMember) {
    return true;
  }

  const subscription = input.subscription;
  if (!subscription) {
    return false;
  }

  if (
    subscription.stripeSubscriptionId ||
    subscription.currentPeriodStart ||
    subscription.canceledAt
  ) {
    return true;
  }

  if (!subscription.status) {
    return false;
  }

  return !NON_MEMBER_STATUSES.has(subscription.status);
}

export function isEligibleForDiscountedPricing(input: MembershipHistorySnapshot & {
  source?: FoundingReservationSource;
}): boolean {
  if (input.source === FoundingReservationSource.UPGRADE) {
    return false;
  }

  return !hasMembershipHistory(input);
}
