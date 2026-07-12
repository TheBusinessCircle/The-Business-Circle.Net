import type { CircleCardSubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const CIRCLE_CARD_RECOVERY_GRACE_DAYS = 7;
export const CIRCLE_CARD_RECOVERY_GRACE_MS =
  CIRCLE_CARD_RECOVERY_GRACE_DAYS * 24 * 60 * 60 * 1000;

export const CIRCLE_CARD_CUSTOMER_LIFECYCLE_STATUSES = [
  "free",
  "checkout_pending",
  "active",
  "cancelling",
  "past_due_grace",
  "payment_failed",
  "expired",
  "paused",
  "incomplete",
  "grandfathered",
  "ambassador",
  "membership_included",
  "admin"
] as const;

export type CircleCardCustomerLifecycleStatus =
  (typeof CIRCLE_CARD_CUSTOMER_LIFECYCLE_STATUSES)[number];

export type CircleCardPaidLifecycleInput = {
  plan: CircleCardSubscriptionPlan;
  status: SubscriptionStatus;
  accessEndsAt: Date | null;
  paymentFailedAt?: Date | null;
  recoveryGraceEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancellationEffectiveAt?: Date | null;
  latestCheckoutSessionId?: string | null;
  checkoutSessionExpiresAt?: Date | null;
};

function isPaidPlan(plan: CircleCardSubscriptionPlan) {
  return plan === "PRO" || plan === "TEAMS";
}

function isAfter(value: Date | null | undefined, now: Date) {
  return Boolean(value && value.getTime() > now.getTime());
}

export function latestDate(
  left: Date | null | undefined,
  right: Date | null | undefined
) {
  if (!left) return right ?? null;
  if (!right) return left;
  return left.getTime() >= right.getTime() ? left : right;
}

export function circleCardEffectiveAccessEndsAt(
  subscription: CircleCardPaidLifecycleInput | null | undefined
) {
  if (!subscription) return null;

  if (
    (subscription.status === "PAST_DUE" || subscription.status === "ACTIVE") &&
    subscription.paymentFailedAt &&
    subscription.accessEndsAt &&
    subscription.recoveryGraceEndsAt
  ) {
    return latestDate(subscription.accessEndsAt, subscription.recoveryGraceEndsAt);
  }

  return subscription.accessEndsAt;
}

export function isCircleCardPaidAccessActive(
  subscription: CircleCardPaidLifecycleInput | null | undefined,
  now = new Date()
) {
  if (!subscription || !isPaidPlan(subscription.plan) || !subscription.accessEndsAt) {
    return false;
  }

  if (subscription.status === "ACTIVE") {
    return isAfter(circleCardEffectiveAccessEndsAt(subscription), now);
  }

  if (subscription.status === "CANCELED") {
    return isAfter(subscription.accessEndsAt, now);
  }

  if (subscription.status === "PAST_DUE") {
    return isAfter(circleCardEffectiveAccessEndsAt(subscription), now);
  }

  // Trials are not a Circle Card launch product. All non-paid/non-recoverable
  // Stripe states fail closed even if stale paid-through data remains stored.
  return false;
}

export function deriveCircleCardPaidLifecycleStatus(
  subscription: CircleCardPaidLifecycleInput | null | undefined,
  now = new Date()
): CircleCardCustomerLifecycleStatus {
  if (!subscription) return "free";

  const hasPaidAccess = isCircleCardPaidAccessActive(subscription, now);
  const checkoutPending = Boolean(
    subscription.latestCheckoutSessionId &&
      isAfter(subscription.checkoutSessionExpiresAt, now)
  );

  if (checkoutPending && !hasPaidAccess) return "checkout_pending";

  if (hasPaidAccess) {
    if (
      (subscription.status === "PAST_DUE" || subscription.status === "ACTIVE") &&
      subscription.paymentFailedAt &&
      isAfter(subscription.recoveryGraceEndsAt, now)
    ) {
      return "past_due_grace";
    }
    if (subscription.cancelAtPeriodEnd || subscription.status === "CANCELED") {
      return "cancelling";
    }
    return "active";
  }

  if (subscription.paymentFailedAt) {
    return "payment_failed";
  }

  switch (subscription.status) {
    case "PAST_DUE":
    case "UNPAID":
      return "payment_failed";
    case "PAUSED":
      return "paused";
    case "INCOMPLETE":
    case "INCOMPLETE_EXPIRED":
    case "TRIALING":
      return "incomplete";
    case "CANCELED":
    case "ACTIVE":
    default:
      return "expired";
  }
}

export function circleCardRecoveryGraceEndsAt(failedAt: Date) {
  return new Date(failedAt.getTime() + CIRCLE_CARD_RECOVERY_GRACE_MS);
}

export function isStripeEventNewer(input: {
  incomingCreatedAt: Date;
  incomingEventId: string;
  storedCreatedAt?: Date | null;
  storedEventId?: string | null;
}) {
  if (!input.storedCreatedAt) return true;

  const difference = input.incomingCreatedAt.getTime() - input.storedCreatedAt.getTime();
  if (difference !== 0) return difference > 0;

  if (!input.storedEventId) return true;
  if (input.incomingEventId === input.storedEventId) return false;

  // Stripe event IDs are not chronological, but this gives equal-second events
  // a stable, replay-safe tie break instead of allowing arrival order to win.
  return input.incomingEventId.localeCompare(input.storedEventId) > 0;
}
