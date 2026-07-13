import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: userFindUniqueMock } }
}));

import { requireApiUser } from "@/lib/auth/api";

function sessionUser(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      email: "stale-session@example.invalid",
      name: "Stale Session Name",
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      foundingMember: false,
      hasCircleCard: false,
      hasActiveSubscription: false,
      suspended: false,
      emailVerified: null,
      ...overrides
    },
    expires: "2099-01-01T00:00:00.000Z"
  };
}

function freshUser(overrides: Record<string, unknown> = {}) {
  return {
    email: "fresh-database@example.invalid",
    name: "Fresh Database Name",
    role: "MEMBER",
    membershipTier: "FOUNDATION",
    registrationSource: null,
    emailVerified: new Date("2026-07-13T12:00:00.000Z"),
    suspended: false,
    _count: { circleCards: 0 },
    subscription: null,
    ...overrides
  };
}

describe("API authentication freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(sessionUser());
    userFindUniqueMock.mockResolvedValue(freshUser());
  });

  it("uses the current database email and verification state for protected billing routes", async () => {
    const result = await requireApiUser({
      allowUnentitled: true,
      requireVerifiedEmail: true
    });

    expect(result).toMatchObject({
      user: {
        id: "user-1",
        email: "fresh-database@example.invalid",
        name: "Fresh Database Name",
        emailVerified: new Date("2026-07-13T12:00:00.000Z")
      }
    });
  });

  it("rejects Checkout authentication when the database says the email is unverified", async () => {
    authMock.mockResolvedValue(sessionUser({ emailVerified: new Date("2025-01-01T00:00:00.000Z") }));
    userFindUniqueMock.mockResolvedValue(freshUser({ emailVerified: null }));

    const result = await requireApiUser({
      allowUnentitled: true,
      requireVerifiedEmail: true
    });

    expect(result).toHaveProperty("response");
    if (!("response" in result)) throw new Error("Expected a forbidden response.");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({ error: "Verified email required" });
  });
});
