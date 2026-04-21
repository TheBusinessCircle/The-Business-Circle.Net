import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

const requireUserMock = vi.hoisted(() => vi.fn());
const resendVerificationEmailMock = vi.hoisted(() => vi.fn());
const logServerWarningMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  }
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

vi.mock("@/lib/session", () => ({
  requireUser: requireUserMock
}));

vi.mock("@/lib/auth/email-verification", () => ({
  resendVerificationEmail: resendVerificationEmailMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/security/logging", () => ({
  logServerWarning: logServerWarningMock
}));

import { resendEmailVerificationAction } from "@/actions/member/email-verification.actions";

describe("resendEmailVerificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      user: {
        id: "user_123"
      }
    });
  });

  it("sends a verification email and redirects with a success notice", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "member@example.com",
      name: "Asha Founder",
      emailVerified: null,
      role: "MEMBER"
    });
    resendVerificationEmailMock.mockResolvedValue({
      sent: true,
      skipped: false
    });

    const formData = new FormData();
    formData.set("returnPath", "/dashboard");

    await expect(resendEmailVerificationAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard?notice=verification-email-sent"
    );
    expect(resendVerificationEmailMock).toHaveBeenCalledWith("user_123");
  });

  it("does not resend for an already verified member", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "member@example.com",
      name: "Asha Founder",
      emailVerified: new Date("2026-04-18T11:00:00.000Z"),
      role: "MEMBER"
    });

    const formData = new FormData();
    formData.set("returnPath", "/dashboard");

    await expect(resendEmailVerificationAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard?notice=verification-already-complete"
    );
    expect(resendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("redirects with an error and logs when delivery is unavailable", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "member@example.com",
      name: "Asha Founder",
      emailVerified: null,
      role: "MEMBER"
    });
    resendVerificationEmailMock.mockResolvedValue({
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured."
    });

    const formData = new FormData();
    formData.set("returnPath", "/dashboard");

    await expect(resendEmailVerificationAction(formData)).rejects.toThrow(
      "REDIRECT:/dashboard?error=verification-email-unavailable"
    );
    expect(logServerWarningMock).toHaveBeenCalledWith(
      "verification-email-resend-failed",
      expect.objectContaining({
        userId: "user_123",
        skipped: true
      })
    );
  });
});
