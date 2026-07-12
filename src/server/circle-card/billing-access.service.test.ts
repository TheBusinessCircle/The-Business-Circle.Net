import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.hoisted(() => vi.fn());
const userFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock, findMany: userFindManyMock }
  }
}));

import {
  loadCircleCardAccessForUser,
  loadCircleCardAccessForUsers
} from "@/server/circle-card/billing.service";

const now = new Date("2026-07-12T12:00:00.000Z");
const future = new Date("2026-08-12T12:00:00.000Z");
const past = new Date("2026-06-12T12:00:00.000Z");

function persistedUser(overrides: Record<string, unknown> = {}) {
  return {
    role: "MEMBER",
    membershipTier: "FOUNDATION",
    suspended: false,
    subscription: null,
    circleCardSubscription: null,
    circleCardAmbassadorProfile: null,
    circleCardAccessGrant: null,
    ...overrides
  };
}

function standaloneSubscription(overrides: Record<string, unknown> = {}) {
  return {
    plan: "PRO",
    status: "ACTIVE",
    currentPeriodStart: now,
    currentPeriodEnd: future,
    accessEndsAt: future,
    lastInvoicePaidAt: now,
    paymentFailedAt: null,
    recoveryGraceEndsAt: null,
    cancelAtPeriodEnd: false,
    cancellationEffectiveAt: null,
    latestCheckoutSessionId: null,
    checkoutSessionExpiresAt: null,
    stripeCustomerId: "cus_test",
    stripeSubscriptionId: "sub_test",
    ...overrides
  };
}

describe("authoritative Circle Card access loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue(persistedUser());
  });

  it("loads access for any number of owners with one database query", async () => {
    const owners = Array.from({ length: 50 }, (_, index) => `owner-${index + 1}`);
    userFindManyMock.mockResolvedValue(
      owners.map((id) => ({ id, ...persistedUser() }))
    );

    const accessByOwner = await loadCircleCardAccessForUsers(owners, now);

    expect(accessByOwner).toHaveLength(50);
    expect(accessByOwner.get("owner-1")).toMatchObject({
      plan: "FREE",
      limits: { circleCards: 1 }
    });
    expect(userFindManyMock).toHaveBeenCalledTimes(1);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns useful Free access and launch limits", async () => {
    const access = await loadCircleCardAccessForUser("free-user", now);

    expect(access).toMatchObject({
      plan: "FREE",
      source: "free",
      hasProAccess: false,
      limits: { circleCards: 1, activeLinks: 5 },
      capabilities: {
        coreProfile: true,
        qr: true,
        share: true,
        vCard: true,
        wallet: true,
        spin: true,
        referrals: true,
        basicAnalytics: true,
        baseLayouts: true,
        circleStudio: false,
        uploadedPrivateFileLinks: false
      }
    });
  });

  it("grants standalone active Pro with the paid-through date", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({ circleCardSubscription: standaloneSubscription() })
    );

    const access = await loadCircleCardAccessForUser("pro-user", now);

    expect(access).toMatchObject({
      plan: "PRO",
      source: "standalone_subscription",
      hasProAccess: true,
      lifecycleStatus: "active",
      accessEndsAt: future,
      subscriptionStatus: "ACTIVE",
      limits: { circleCards: 2, activeLinks: 25 },
      capabilities: {
        circleStudio: true,
        businessBuilder: true,
        creatorMediaKit: true,
        creatorAudienceSnapshot: true,
        expandedCreatorLimits: true,
        uploadedPrivateFileLinks: false
      }
    });
  });

  it("preserves the future Teams plan in the authoritative snapshot", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({ plan: "TEAMS" })
      })
    );

    await expect(loadCircleCardAccessForUser("teams-user", now)).resolves.toMatchObject({
      plan: "TEAMS",
      source: "teams",
      hasProAccess: true,
      limits: { circleCards: 2, activeLinks: 25 }
    });
  });

  it("grants BCN-included Pro", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({ subscription: { status: "ACTIVE" } })
    );

    await expect(loadCircleCardAccessForUser("bcn-user", now)).resolves.toMatchObject({
      plan: "PRO",
      source: "bcn_membership",
      hasProAccess: true
    });
  });

  it("grants admin access from the persisted role", async () => {
    userFindUniqueMock.mockResolvedValue(persistedUser({ role: "ADMIN" }));

    await expect(loadCircleCardAccessForUser("admin-user", now)).resolves.toMatchObject({
      plan: "PRO",
      source: "admin",
      hasProAccess: true
    });
  });

  it("grants active founding ambassador free-Pro access", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardAmbassadorProfile: { freeProGranted: true, active: true }
      })
    );

    await expect(loadCircleCardAccessForUser("ambassador-user", now)).resolves.toMatchObject({
      plan: "PRO",
      source: "ambassador",
      hasProAccess: true
    });
  });

  it("grants an active persisted grandfathered entitlement", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardAccessGrant: {
          plan: "PRO",
          source: "GRANDFATHERED",
          active: true,
          startsAt: past,
          endsAt: future
        }
      })
    );

    await expect(loadCircleCardAccessForUser("grandfathered-user", now)).resolves.toMatchObject({
      plan: "PRO",
      source: "grandfathered",
      hasProAccess: true,
      accessEndsAt: future
    });
  });

  it("does not grant an inactive standalone subscription", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({ status: "UNPAID" })
      })
    );

    await expect(loadCircleCardAccessForUser("inactive-user", now)).resolves.toMatchObject({
      plan: "FREE",
      source: "free",
      hasProAccess: false,
      subscriptionStatus: "UNPAID"
    });
  });

  it("does not grant ACTIVE when confirmed accessEndsAt is missing", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({ accessEndsAt: null })
      })
    );

    await expect(loadCircleCardAccessForUser("unconfirmed-active-user", now)).resolves.toMatchObject({
      plan: "FREE",
      hasProAccess: false,
      lifecycleStatus: "expired",
      accessEndsAt: null
    });
  });

  it("grants exactly the fixed recovery grace after confirmed paid access", async () => {
    const failedAt = new Date("2026-07-12T10:00:00.000Z");
    const graceEndsAt = new Date("2026-07-19T10:00:00.000Z");
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({
          status: "PAST_DUE",
          accessEndsAt: past,
          paymentFailedAt: failedAt,
          recoveryGraceEndsAt: graceEndsAt
        })
      })
    );

    await expect(loadCircleCardAccessForUser("grace-user", now)).resolves.toMatchObject({
      plan: "PRO",
      hasProAccess: true,
      lifecycleStatus: "past_due_grace",
      accessEndsAt: past,
      effectiveAccessEndsAt: graceEndsAt,
      isInRecoveryGrace: true
    });
  });

  it("removes PAST_DUE access after grace without deleting billing state", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({
          status: "PAST_DUE",
          accessEndsAt: past,
          paymentFailedAt: past,
          recoveryGraceEndsAt: past
        })
      })
    );

    await expect(loadCircleCardAccessForUser("expired-grace-user", now)).resolves.toMatchObject({
      plan: "FREE",
      hasProAccess: false,
      lifecycleStatus: "payment_failed",
      isInRecoveryGrace: false,
      hasBillingRelationship: true
    });
  });

  it.each(["UNPAID", "PAUSED", "INCOMPLETE", "INCOMPLETE_EXPIRED", "TRIALING"] as const)(
    "fails closed for %s",
    async (status) => {
      userFindUniqueMock.mockResolvedValue(
        persistedUser({ circleCardSubscription: standaloneSubscription({ status }) })
      );

      const access = await loadCircleCardAccessForUser(`status-${status}`, now);
      expect(access.hasProAccess).toBe(false);
      expect(access.plan).toBe("FREE");
    }
  );

  it("keeps cancelled access through the recorded paid-through date", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({ status: "CANCELED" })
      })
    );

    await expect(loadCircleCardAccessForUser("cancelled-user", now)).resolves.toMatchObject({
      plan: "PRO",
      source: "standalone_subscription",
      hasProAccess: true,
      accessEndsAt: future,
      subscriptionStatus: "CANCELED"
    });
  });

  it("removes standalone access after paid-through expiry without deleting state", async () => {
    userFindUniqueMock.mockResolvedValue(
      persistedUser({
        circleCardSubscription: standaloneSubscription({
          status: "CANCELED",
          currentPeriodEnd: past,
          accessEndsAt: past
        })
      })
    );

    await expect(loadCircleCardAccessForUser("expired-user", now)).resolves.toMatchObject({
      plan: "FREE",
      source: "free",
      hasProAccess: false,
      subscriptionStatus: "CANCELED"
    });
  });
});
