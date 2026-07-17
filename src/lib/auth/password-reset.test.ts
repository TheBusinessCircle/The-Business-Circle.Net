import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  hashPasswordResetTokenForBrand,
  requestPasswordReset
} from "@/lib/auth/password-reset";

describe("password reset", () => {
  let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = "60";
    process.env.APP_URL = "https://thebusinesscircle.net";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: "token-1" });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({ id: "user-1" });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
    sendTransactionalEmailMock.mockResolvedValue({ sent: true, skipped: false, id: "email-1" });
    hashPasswordMock.mockResolvedValue("hashed-password");
    consoleSpies = [
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined)
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates deterministic token hash and expiry window", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const tokenPair = createPasswordResetTokenPair("bcn", now);

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
      brand: "bcn",
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
    expect(new URL(resetLink as string).origin).toBe("https://thebusinesscircle.net");
    expect(outbound.subject).toBe("Reset your Business Circle password");
    const token = new URL(resetLink as string).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(hashPasswordResetToken(token as string)).toBe(storedTokenHash);
    expect(storedTokenHash).not.toBe(token);
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" }
    });
    expect(
      prismaMock.passwordResetToken.deleteMany.mock.invocationCallOrder[0]
    ).toBeLessThan(prismaMock.passwordResetToken.create.mock.invocationCallOrder[0]);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const logs = consoleSpies
      .flatMap((spy) => spy.mock.calls)
      .map((call) => JSON.stringify(call))
      .join("\n");
    expect(logs).not.toContain(token as string);
    expect(logs).not.toContain(resetLink as string);
    expect(logs).not.toContain("member@example.com");
  });

  it("creates a Circle Card reset link, wording, and brand-bound token hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member",
      suspended: false,
      passwordHash: "existing-hash"
    });

    let storedTokenHash = "";
    prismaMock.passwordResetToken.create.mockImplementation(
      async ({ data }: { data: { tokenHash: string } }) => {
        storedTokenHash = data.tokenHash;
        return { id: "token-1" };
      }
    );

    await requestPasswordReset({
      brand: "circle-card",
      email: "member@example.com"
    });

    const outbound = sendTransactionalEmailMock.mock.calls.at(-1)?.[0];
    const resetLink = outbound.text
      .split("\n")
      .map((line: string) => line.trim())
      .find((line: string) => line.startsWith("https://"));
    expect(resetLink).toBeTruthy();
    const rawToken = new URL(resetLink as string).searchParams.get("token");
    expect(rawToken).toBeTruthy();

    expect(new URL(resetLink).origin).toBe("https://circlecard.co.uk");
    expect(outbound.subject).toBe("Reset your Circle Card password");
    expect(outbound.text).toContain("Circle Card password");
    expect(outbound.text).not.toContain("sign back in to The Business Circle Network");
    expect(outbound.text).toContain("Circle Card is operated by THE BUSINESS CIRCLE NETWORK LTD");
    expect(storedTokenHash).toBe(
      hashPasswordResetTokenForBrand(rawToken as string, "circle-card")
    );
    expect(storedTokenHash).not.toBe(hashPasswordResetToken(rawToken as string));
  });

  it("prevents concurrent token replay with one atomic claim", async () => {
    const state = {
      used: false
    };

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member"
    });

    prismaMock.passwordResetToken.findFirst.mockResolvedValue({ id: "token-1" });

    prismaMock.passwordResetToken.updateMany.mockImplementation(async ({ where }) => {
      if (where.id) {
        if (state.used) return { count: 0 };
        state.used = true;
        return { count: 1 };
      }
      return { count: 1 };
    });

    const [first, second] = await Promise.all([
      confirmPasswordReset({
        brand: "bcn",
        email: "member@example.com",
        token: "synthetic-reset-token",
        password: "MyNewPassword!123"
      }),
      confirmPasswordReset({
        brand: "bcn",
        email: "member@example.com",
        token: "synthetic-reset-token",
        password: "MyNewPassword!123"
      })
    ]);

    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: expect.any(Date) }
    });
  });

  it("enforces expiry before and during token consumption", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member"
    });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue({ id: "token-1" });
    prismaMock.passwordResetToken.updateMany.mockImplementation(async ({ where }) => {
      if (where.id) {
        expect(where).toEqual({
          id: "token-1",
          userId: "user-1",
          tokenHash: hashPasswordResetToken("expired-synthetic-token"),
          usedAt: null,
          expiresAt: { gt: expect.any(Date) }
        });
        return { count: 0 };
      }
      return { count: 1 };
    });

    await expect(
      confirmPasswordReset({
        brand: "bcn",
        email: "member@example.com",
        token: "expired-synthetic-token",
        password: "MyNewPassword!123"
      })
    ).resolves.toEqual({
      ok: false,
      error: "Reset link is invalid or has expired."
    });
    expect(prismaMock.passwordResetToken.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        tokenHash: hashPasswordResetToken("expired-synthetic-token"),
        usedAt: null,
        expiresAt: { gt: expect.any(Date) }
      },
      select: { id: true }
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns the password-changed confirmation to the Circle Card login", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.com",
      name: "Member"
    });
    prismaMock.passwordResetToken.findFirst.mockResolvedValue({ id: "token-1" });

    await expect(
      confirmPasswordReset({
        brand: "circle-card",
        email: "member@example.com",
        token: "synthetic-reset-token",
        password: "MyNewPassword!123"
      })
    ).resolves.toEqual({ ok: true });

    const outbound = sendTransactionalEmailMock.mock.calls.at(-1)?.[0];
    expect(outbound.text).toContain("https://circlecard.co.uk/login");
    expect(outbound.text).toContain("sign back in to Circle Card");
    expect(outbound.text).not.toContain("sign back in to The Business Circle Network");
    expect(outbound.text).toContain("Circle Card is operated by THE BUSINESS CIRCLE NETWORK LTD");
  });
});
