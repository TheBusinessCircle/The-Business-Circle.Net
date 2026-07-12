import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: userFindUniqueMock }
  }
}));

import { loadCircleCardAccessForUser } from "@/server/circle-card/billing.service";

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
    lastInvoicePaidAt: now,
    ...overrides
  };
}

describe("authoritative Circle Card access loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockResolvedValue(persistedUser());
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
          currentPeriodEnd: past
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
