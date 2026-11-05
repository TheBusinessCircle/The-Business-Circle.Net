import type { CircleCardAccessSnapshot } from "@/lib/circle-card/permissions";

export const CUSTOM_BUILD_AMOUNT_PENCE = 4999;
export const CUSTOM_BUILD_CURRENCY = "gbp";
export const CUSTOM_BUILD_PRODUCT = "circle_card_custom_build";
export const CUSTOM_BUILD_TERMS_VERSION = "2026-11-05";
export const CUSTOM_BUILD_PATH = "/app/upgrades/custom-build";

/** Purchase requires money-backed Pro, not a trial, grant, URL or grace period. */
export function hasPaidProForCustomBuild(
  access: Pick<CircleCardAccessSnapshot, "hasProAccess" | "entitlement" | "accessEndsAt" | "isInRecoveryGrace">,
  now = new Date()
) {
  return access.hasProAccess && access.entitlement.hasPaidCircleCardSubscription &&
    !access.isInRecoveryGrace && Boolean(access.accessEndsAt && access.accessEndsAt > now);
}

export function canShowPurchasedCustomDesign(
  order: { paymentStatus: string; buildStatus: string } | null,
  access: Parameters<typeof hasPaidProForCustomBuild>[0],
  now = new Date()
) {
  // Starting an order must not disable the member's existing self-service Studio.
  return !order || order.buildStatus !== "COMPLETE" ||
    (order.paymentStatus === "PAID" && hasPaidProForCustomBuild(access, now));
}

export type CustomBuildOrder = {
  id: string; userId: string; cardId: string; customerId: string;
  amountPence: number; currency: string;
  checkoutSessionId: string | null; checkoutAttempt: number;
  paymentIntentId: string | null;
  paymentStatus: "PENDING" | "PROCESSING" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED" | "DISPUTED";
  buildStatus: "AWAITING_PAYMENT" | "QUEUED" | "IN_PROGRESS" | "COMPLETE";
  brief: string; termsVersion: string; termsAcceptedAt: Date;
  paidAt: Date | null; createdAt: Date; updatedAt: Date;
};
