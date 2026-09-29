import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn()
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({ name: "synthetic-prisma-adapter" })
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique }
  }
}));

vi.mock("@/lib/auth/providers", () => ({
  buildAuthProviders: () => []
}));

vi.mock("@/lib/auth/logger", () => ({
  safeAuthLogger: {}
}));

vi.mock("@/lib/membership/access", () => ({
  hasEntitledSubscription: (status: string | null | undefined) => status === "ACTIVE"
}));

import { authConfig } from "@/lib/auth/config";

describe("Auth.js shared identity callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({
      role: "MEMBER",
      membershipTier: "CORE",
      foundingMember: true,
      foundingTier: "CORE",
      foundingPrice: 30,
      foundingClaimedAt: new Date("2026-01-02T03:04:05.000Z"),
      registrationSource: "bcn-join",
      emailVerified: new Date("2026-01-03T03:04:05.000Z"),
      suspended: false,
      _count: { circleCards: 1 },
      subscription: { status: "ACTIVE" }
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("wires Auth.js redirects to the server-owned Circle origin", () => {
    vi.stubEnv("APP_BRAND", "circle-card");

    expect(
      authConfig.callbacks.redirect({
        url: "https://thebusinesscircle.net/dashboard",
        baseUrl: "https://thebusinesscircle.net"
      })
    ).toBe("https://circlecard.co.uk/");
  });

  it("refreshes the shared User identity into a Circle-capable JWT and session", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    const sessionCallback = authConfig.callbacks?.session;

    expect(jwtCallback).toBeTypeOf("function");
    expect(sessionCallback).toBeTypeOf("function");

    const token = await jwtCallback!({
      token: { sub: "shared-user-1" }
    } as never);

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: "shared-user-1" },
      select: expect.objectContaining({
        registrationSource: true,
        emailVerified: true,
        subscription: { select: { status: true } }
      })
    });
    expect(token).toMatchObject({
      id: "shared-user-1",
      sub: "shared-user-1",
      role: "MEMBER",
      membershipTier: "CORE",
      foundingMember: true,
      foundingTier: "CORE",
      foundingPrice: 30,
      foundingClaimedAt: "2026-01-02T03:04:05.000Z",
      registrationSource: "bcn-join",
      hasCircleCard: true,
      subscriptionStatus: "ACTIVE",
      hasActiveSubscription: true,
      suspended: false,
      emailVerified: "2026-01-03T03:04:05.000Z"
    });

    const session = await sessionCallback!({
      session: {
        user: {
          name: "Existing Circle User",
          email: "member@example.com",
          image: null
        },
        expires: "2026-10-01T00:00:00.000Z"
      },
      token
    } as never);

    expect(session.user).toMatchObject({
      id: "shared-user-1",
      email: "member@example.com",
      registrationSource: "bcn-join",
      hasCircleCard: true,
      hasActiveSubscription: true,
      suspended: false
    });
    expect(session.user.foundingClaimedAt).toEqual(
      new Date("2026-01-02T03:04:05.000Z")
    );
    expect(session.user.emailVerified).toEqual(
      new Date("2026-01-03T03:04:05.000Z")
    );
  });

  it("rejects a suspended existing identity during sign-in", async () => {
    const signInCallback = authConfig.callbacks?.signIn;
    expect(signInCallback).toBeTypeOf("function");

    mocks.userFindUnique.mockResolvedValueOnce({ suspended: true });
    await expect(
      signInCallback!({
        user: { id: "shared-user-1", email: "member@example.com" },
        account: { provider: "credentials" }
      } as never)
    ).resolves.toBe(false);
  });
});
