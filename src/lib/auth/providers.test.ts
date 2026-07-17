import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  verifyPassword: vi.fn(),
  consumeRateLimit: vi.fn()
}));

vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {}
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique }
  }
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPasswordWithTimingSafeFallback: mocks.verifyPassword
}));

vi.mock("@/lib/security/rate-limit", () => ({
  clientIpFromHeaders: () => "127.0.0.1",
  consumeRateLimit: mocks.consumeRateLimit
}));

vi.mock("@/lib/security/logging", () => ({
  logServerError: vi.fn()
}));

vi.mock("@/lib/db-errors", () => ({
  isRecoverableDatabaseError: () => false
}));

import { credentialsProvider } from "@/lib/auth/providers";

describe("shared credential account authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true });
    mocks.verifyPassword.mockResolvedValue(true);
  });

  it("signs an existing BCN-created user into Circle Card without creating a user", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "shared-user-1",
      email: "member@example.com",
      name: "Shared Member",
      image: null,
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      foundingMember: false,
      foundingTier: null,
      foundingPrice: null,
      foundingClaimedAt: null,
      registrationSource: "bcn-join",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      suspended: false,
      _count: { circleCards: 1 },
      subscription: { status: "ACTIVE" },
      passwordHash: "stored-password-hash"
    });

    const provider = credentialsProvider();
    const user = await provider.authorize(
      {
        email: " MEMBER@EXAMPLE.COM ",
        password: "ValidPassword1!"
      },
      new Request("https://circlecard.co.uk/api/auth/callback/credentials")
    );

    expect(mocks.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "member@example.com" } })
    );
    expect(user).toMatchObject({
      id: "shared-user-1",
      email: "member@example.com",
      registrationSource: "bcn-join",
      hasCircleCard: true
    });
  });
});
