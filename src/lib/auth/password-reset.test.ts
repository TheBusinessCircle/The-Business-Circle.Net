import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, sendTransactionalEmailMock, hashPasswordMock } = vi.hoisted(() => ({
  prismaMock: (() => {
    const tx = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      passwordResetToken: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn()
      },
      session: {
        deleteMany: vi.fn()
      }
    };

    return {
      ...tx,
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx))
    };
  })(),
  sendTransactionalEmailMock: vi.fn(),
  hashPasswordMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: prismaMock
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: sendTransactionalEmailMock
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock
}));

import {
  confirmPasswordReset,
  createPasswordResetTokenPair,
  hashPasswordResetToken,
  requestPasswordReset
} from "@/lib/auth/password-reset";

describe("password reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = "60";
    process.env.APP_URL = "https://thebcnet.co.uk";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: "token-1" });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({ id: "user-1" });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
    sendTransactionalEmailMock.mockResolvedValue({ sent: true, skipped: false, id: "email-1" });
    hashPasswordMock.mockResolvedValue("hashed-password");
  });

  it("creates deterministic token hash and expiry window", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const tokenPair = createPasswordResetTokenPair(now);

    expect(tokenPair.token).toHaveLength(64);
    expect(hashPasswordResetToken(tokenPair.token)).toBe(tokenPair.tokenHash);
    expect(tokenPair.ttlMinutes).toBe(60);
    expect(tokenPair.expiresAt.toISOString()).toBe("2026-03-11T01:00:00.000Z");
  });

  it("stores only a hashed token when requesting password reset", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member",
      suspended: false,
      passwordHash: "existing-hash"
    });

    let storedTokenHash = "";
    prismaMock.passwordResetToken.create.mockImplementation(async ({ data }: { data: { tokenHash: string } }) => {
      storedTokenHash = data.tokenHash;
      return { id: "token-1" };
    });

    await requestPasswordReset({
      email: "Member@Example.com",
      requestedIp: "127.0.0.1"
    });

    expect(storedTokenHash).toHaveLength(64);
    const outbound = sendTransactionalEmailMock.mock.calls[0]?.[0];
    const resetLink = outbound?.text
      ?.split("\n")
      .map((line: string) => line.trim())
      .find((line: string) => line.startsWith("https://"));

    expect(resetLink).toBeTruthy();
    const token = new URL(resetLink as string).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(hashPasswordResetToken(token as string)).toBe(storedTokenHash);
  });

  it("prevents token replay after first successful reset", async () => {
    const state = {
      used: false
    };

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member"
    });

    prismaMock.passwordResetToken.findFirst.mockImplementation(async () => {
      return state.used ? null : { id: "token-1" };
    });

    prismaMock.passwordResetToken.updateMany.mockImplementation(async () => {
      state.used = true;
      return { count: 1 };
    });

    const first = await confirmPasswordReset({
      email: "member@example.com",
      token: "raw-token",
      password: "MyNewPassword!123"
    });
    const second = await confirmPasswordReset({
      email: "member@example.com",
      token: "raw-token",
      password: "MyNewPassword!123"
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual({
      ok: false,
      error: "Reset link is invalid or has expired."
    });
  });
});
