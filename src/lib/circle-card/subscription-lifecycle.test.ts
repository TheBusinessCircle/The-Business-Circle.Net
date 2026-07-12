import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_RECOVERY_GRACE_MS,
  circleCardEffectiveAccessEndsAt,
  circleCardRecoveryGraceEndsAt,
  deriveCircleCardPaidLifecycleStatus,
  isCircleCardPaidAccessActive,
  isStripeEventNewer
} from "@/lib/circle-card/subscription-lifecycle";

const now = new Date("2026-07-12T12:00:00.000Z");
const future = new Date("2026-08-12T12:00:00.000Z");
const past = new Date("2026-06-12T12:00:00.000Z");

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    plan: "PRO" as const,
    status: "ACTIVE" as const,
    accessEndsAt: future,
    paymentFailedAt: null,
    recoveryGraceEndsAt: null,
    cancelAtPeriodEnd: false,
    cancellationEffectiveAt: null,
    latestCheckoutSessionId: null,
    checkoutSessionExpiresAt: null,
    ...overrides
  };
}

describe("Circle Card paid-through lifecycle", () => {
  it("does not grant ACTIVE without confirmed paid-through evidence", () => {
    expect(isCircleCardPaidAccessActive(subscription({ accessEndsAt: null }), now)).toBe(false);
    expect(deriveCircleCardPaidLifecycleStatus(subscription({ accessEndsAt: null }), now)).toBe(
      "expired"
    );
  });

  it("grants active and cancelling subscriptions only through confirmed access end", () => {
    expect(isCircleCardPaidAccessActive(subscription(), now)).toBe(true);
    expect(deriveCircleCardPaidLifecycleStatus(subscription(), now)).toBe("active");
    expect(
      deriveCircleCardPaidLifecycleStatus(subscription({ cancelAtPeriodEnd: true }), now)
    ).toBe("cancelling");
    expect(
      deriveCircleCardPaidLifecycleStatus(
        subscription({ status: "CANCELED", cancelAtPeriodEnd: true }),
        now
      )
    ).toBe("cancelling");
    expect(isCircleCardPaidAccessActive(subscription({ accessEndsAt: past }), now)).toBe(false);
  });

  it("provides one fixed seven-day PAST_DUE recovery window after paid access", () => {
    const failedAt = new Date("2026-07-12T10:00:00.000Z");
    const graceEndsAt = circleCardRecoveryGraceEndsAt(failedAt);
    const input = subscription({
      status: "PAST_DUE",
      accessEndsAt: new Date("2026-07-12T09:00:00.000Z"),
      paymentFailedAt: failedAt,
      recoveryGraceEndsAt: graceEndsAt
    });

    expect(graceEndsAt.getTime() - failedAt.getTime()).toBe(CIRCLE_CARD_RECOVERY_GRACE_MS);
    expect(circleCardEffectiveAccessEndsAt(input)).toEqual(graceEndsAt);
    expect(isCircleCardPaidAccessActive(input, now)).toBe(true);
    expect(deriveCircleCardPaidLifecycleStatus(input, now)).toBe("past_due_grace");
    expect(isCircleCardPaidAccessActive(input, new Date(graceEndsAt.getTime() + 1))).toBe(false);
  });

  it("does not invent grace for an initial failed payment with no paid evidence", () => {
    const failedAt = now;
    const input = subscription({
      status: "PAST_DUE",
      accessEndsAt: null,
      paymentFailedAt: failedAt,
      recoveryGraceEndsAt: circleCardRecoveryGraceEndsAt(failedAt)
    });

    expect(isCircleCardPaidAccessActive(input, now)).toBe(false);
    expect(deriveCircleCardPaidLifecycleStatus(input, now)).toBe("payment_failed");
  });

  it.each(["UNPAID", "PAUSED", "INCOMPLETE", "INCOMPLETE_EXPIRED", "TRIALING"] as const)(
    "fails closed for %s even when stale access data exists",
    (status) => {
      expect(isCircleCardPaidAccessActive(subscription({ status }), now)).toBe(false);
    }
  );

  it("reports reusable Checkout as pending without granting access", () => {
    expect(
      deriveCircleCardPaidLifecycleStatus(
        subscription({
          status: "INCOMPLETE",
          accessEndsAt: null,
          latestCheckoutSessionId: "cs_test_pending",
          checkoutSessionExpiresAt: future
        }),
        now
      )
    ).toBe("checkout_pending");
  });

  it("reports an ACTIVE payment failure as failed after its fixed grace expires", () => {
    expect(
      deriveCircleCardPaidLifecycleStatus(
        subscription({
          status: "ACTIVE",
          paymentFailedAt: new Date("2026-07-01T00:00:00.000Z"),
          recoveryGraceEndsAt: new Date("2026-07-08T00:00:00.000Z"),
          accessEndsAt: new Date("2026-07-01T00:00:00.000Z")
        }),
        now
      )
    ).toBe("payment_failed");
  });

  it("orders status events by Stripe creation time with a stable equal-time tie break", () => {
    expect(
      isStripeEventNewer({
        incomingCreatedAt: now,
        incomingEventId: "evt_b",
        storedCreatedAt: past,
        storedEventId: "evt_z"
      })
    ).toBe(true);
    expect(
      isStripeEventNewer({
        incomingCreatedAt: past,
        incomingEventId: "evt_z",
        storedCreatedAt: now,
        storedEventId: "evt_a"
      })
    ).toBe(false);
    expect(
      isStripeEventNewer({
        incomingCreatedAt: now,
        incomingEventId: "evt_b",
        storedCreatedAt: now,
        storedEventId: "evt_a"
      })
    ).toBe(true);
  });
});
