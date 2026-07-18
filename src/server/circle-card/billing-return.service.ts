import "server-only";

import { logServerWarning } from "@/lib/security/logging";
import { reconcileCircleCardSubscriptionForUser } from "@/server/circle-card/billing.service";

export const CIRCLE_CARD_BILLING_RETURN_STATES = ["success", "portal-return"] as const;

export type CircleCardBillingReturnState =
  (typeof CIRCLE_CARD_BILLING_RETURN_STATES)[number];

export function resolveCircleCardBillingReturnState(
  value: string | string[] | undefined
): CircleCardBillingReturnState | null {
  if (Array.isArray(value)) return null;
  const candidate = value;

  return CIRCLE_CARD_BILLING_RETURN_STATES.includes(
    candidate as CircleCardBillingReturnState
  )
    ? (candidate as CircleCardBillingReturnState)
    : null;
}

export async function reconcileCircleCardBillingReturn(input: {
  userId: string;
  billing: string | string[] | undefined;
}) {
  const returnState = resolveCircleCardBillingReturnState(input.billing);
  if (!returnState) {
    return { triggered: false, outcome: null } as const;
  }

  try {
    const result = await reconcileCircleCardSubscriptionForUser(input.userId);
    return { triggered: true, outcome: result.outcome } as const;
  } catch (error) {
    logServerWarning("circle-card-billing-return-reconciliation-failed", {
      userId: input.userId,
      returnState,
      reason: error instanceof Error ? error.name : "unknown"
    });
    return { triggered: true, outcome: "failed" } as const;
  }
}
