import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  sendTransactionalEmailOrThrowMock,
  renderEmailHtmlMock
} = vi.hoisted(() => {
  const tx = {
    user: {
      update: vi.fn()
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn()
    }
  };

  return {
    prismaMock: {
      user: {
        findUnique: vi.fn(),
        update: tx.user.update
      },
      verificationToken: {
        deleteMany: tx.verificationToken.deleteMany,
        create: tx.verificationToken.create
      },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => unknown) => callback(tx)
      )
    },
    sendTransactionalEmailOrThrowMock: vi.fn(),
    renderEmailHtmlMock: vi.fn()
  };
});

vi.mock("@/lib/db", () => ({
  db: prismaMock
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmailOrThrow: sendTransactionalEmailOrThrowMock
}));

vi.mock("@/emails/render", () => ({
  renderEmailHtml: renderEmailHtmlMock
}));

vi.mock("@/emails", () => ({
  VerifyEmailAddressEmail: () => null
}));

import {
  hashEmailVerificationToken,
  sendEmailVerificationForUser,
  verifyEmailToken
} from "@/lib/auth/email-verification";

const SYNTHETIC_EMAIL = "verification-log-canary@example.invalid";
const USER_ID = "user-security-canary";
const IDENTIFIER = `verify-email:${USER_ID}`;

function consoleOutput(spies: Array<ReturnType<typeof vi.spyOn>>) {
  return spies
    .flatMap((spy) => spy.mock.calls)
    .map((call) => JSON.stringify(call))
    .join("\n");
}

function tokenFromVerificationEmail() {
  const outbound = sendTransactionalEmailOrThrowMock.mock.calls.at(-1)?.[0];
  const verificationUrl = outbound?.text
    ?.split("\n")
    .map((line: string) => line.trim())
    .find((line: string) => line.startsWith("https://"));

  expect(verificationUrl).toBeTruthy();
  const rawToken = new URL(verificationUrl as string).searchParams.get("token");
  expect(rawToken).toHaveLength(64);

  return {
    rawToken: rawToken as string,
    verificationUrl: verificationUrl as string
  };
}

describe("email verification token security", () => {
  let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS = "48";

    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: SYNTHETIC_EMAIL,
      emailVerified: null
    });
    prismaMock.user.update.mockResolvedValue({ id: USER_ID });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({
      identifier: IDENTIFIER
    });
    sendTransactionalEmailOrThrowMock.mockResolvedValue({ id: "message-canary" });
    renderEmailHtmlMock.mockResolvedValue("<html>synthetic email</html>");

    consoleSpies = [
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined)
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores only a hash, invalidates older tokens, and never logs the secret, URL, or email", async () => {
    let storedTokenHash = "";
    prismaMock.verificationToken.create.mockImplementation(
      async ({ data }: { data: { token: string } }) => {
        storedTokenHash = data.token;
        return { identifier: IDENTIFIER };
      }
    );

    await sendEmailVerificationForUser({
      brand: "bcn",
      userId: USER_ID,
      email: SYNTHETIC_EMAIL,
      firstName: "Security"
    });

    const { rawToken, verificationUrl } = tokenFromVerificationEmail();
    const outbound = sendTransactionalEmailOrThrowMock.mock.calls.at(-1)?.[0];
    expect(new URL(verificationUrl).origin).toBe("https://thebusinesscircle.net");
    expect(outbound.subject).toBe("Verify your Business Circle email");
    expect(outbound.text).toContain("The Business Circle Network");
    expect(storedTokenHash).toBe(hashEmailVerificationToken(rawToken));
    expect(storedTokenHash).not.toBe(rawToken);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: IDENTIFIER }
    });
    expect(
      prismaMock.verificationToken.deleteMany.mock.invocationCallOrder[0]
    ).toBeLessThan(prismaMock.verificationToken.create.mock.invocationCallOrder[0]);
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const logs = consoleOutput(consoleSpies);
    expect(logs).not.toContain(rawToken);
    expect(logs).not.toContain(verificationUrl);
    expect(logs).not.toContain(SYNTHETIC_EMAIL);
  });

  it("creates a Circle Card verification URL and brand-scoped token identifier", async () => {
    const circleIdentifier = `verify-email:circle-card:${USER_ID}`;
    prismaMock.verificationToken.create.mockResolvedValue({
      identifier: circleIdentifier
    });

    await sendEmailVerificationForUser({
      brand: "circle-card",
      userId: USER_ID,
      email: SYNTHETIC_EMAIL,
      firstName: "Security"
    });

    const { verificationUrl } = tokenFromVerificationEmail();
    const outbound = sendTransactionalEmailOrThrowMock.mock.calls.at(-1)?.[0];
    expect(new URL(verificationUrl).origin).toBe("https://circlecard.co.uk");
    expect(outbound.subject).toBe("Verify your Circle Card email");
    expect(outbound.text).toContain("completing your Circle Card account");
    expect(outbound.text).not.toContain("The Business Circle Network");
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: circleIdentifier }
    });
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ identifier: circleIdentifier })
    });
  });

  it("makes a newly generated token replace every prior unused token", async () => {
    const storedHashes = new Set<string>();
    prismaMock.verificationToken.deleteMany.mockImplementation(
      async ({ where }: { where: { identifier: string } }) => {
        expect(where.identifier).toBe(IDENTIFIER);
        const count = storedHashes.size;
        storedHashes.clear();
        return { count };
      }
    );
    prismaMock.verificationToken.create.mockImplementation(
      async ({ data }: { data: { token: string } }) => {
        storedHashes.add(data.token);
        return { identifier: IDENTIFIER };
      }
    );

    await sendEmailVerificationForUser({
      brand: "bcn",
      userId: USER_ID,
      email: SYNTHETIC_EMAIL
    });
    const firstToken = tokenFromVerificationEmail().rawToken;

    await sendEmailVerificationForUser({
      brand: "bcn",
      userId: USER_ID,
      email: SYNTHETIC_EMAIL
    });
    const secondToken = tokenFromVerificationEmail().rawToken;

    expect(firstToken).not.toBe(secondToken);
    expect(storedHashes).toEqual(
      new Set([hashEmailVerificationToken(secondToken)])
    );
    expect(storedHashes.has(hashEmailVerificationToken(firstToken))).toBe(false);
  });

  it("atomically consumes a valid token once and invalidates every remaining token", async () => {
    let available = true;
    prismaMock.verificationToken.deleteMany.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => {
        if ("token" in where) {
          const count = available ? 1 : 0;
          available = false;
          return { count };
        }
        return { count: 2 };
      }
    );

    const [first, second] = await Promise.all([
      verifyEmailToken({ brand: "bcn", userId: USER_ID, token: "synthetic-token" }),
      verifyEmailToken({ brand: "bcn", userId: USER_ID, token: "synthetic-token" })
    ]);

    expect([first, second].sort()).toEqual([false, true]);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: IDENTIFIER }
    });
  });

  it("enforces expiry in the atomic consume operation", async () => {
    prismaMock.verificationToken.deleteMany.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) => {
        if ("token" in where) {
          expect(where).toEqual({
            identifier: IDENTIFIER,
            token: hashEmailVerificationToken("expired-synthetic-token"),
            expires: { gt: expect.any(Date) }
          });
        }
        return { count: 0 };
      }
    );

    await expect(
      verifyEmailToken({
        brand: "bcn",
        userId: USER_ID,
        token: "expired-synthetic-token"
      })
    ).resolves.toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects arbitrary tokens for an already verified user and clears stale tokens", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: SYNTHETIC_EMAIL,
      emailVerified: new Date("2026-01-01T00:00:00.000Z")
    });

    await expect(
      verifyEmailToken({
        brand: "bcn",
        userId: USER_ID,
        token: "arbitrary-synthetic-token"
      })
    ).resolves.toBe(false);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: IDENTIFIER }
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
