import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  consumeRateLimit: vi.fn()
}));

vi.mock("@/lib/auth/password-reset", () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  confirmPasswordReset: mocks.confirmPasswordReset
}));

vi.mock("@/lib/security/origin", () => ({
  isTrustedOrigin: () => true
}));

vi.mock("@/lib/security/rate-limit", () => ({
  clientIpFromHeaders: () => "127.0.0.1",
  consumeRateLimit: mocks.consumeRateLimit,
  rateLimitHeaders: () => ({})
}));

vi.mock("@/lib/security/logging", () => ({
  logServerError: vi.fn()
}));

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";

const originalAppBrand = process.env.APP_BRAND;

describe("password routes use validated runtime brand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BRAND = "circle-card";
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true });
    mocks.requestPasswordReset.mockResolvedValue({
      ok: true,
      message: "If an account exists with that email, a password reset link has been sent."
    });
    mocks.confirmPasswordReset.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (originalAppBrand === undefined) {
      delete process.env.APP_BRAND;
    } else {
      process.env.APP_BRAND = originalAppBrand;
    }
  });

  it("ignores a browser brand field on forgot-password requests", async () => {
    const response = await forgotPassword(
      new Request("https://circlecard.co.uk/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          brand: "bcn"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
      brand: "circle-card",
      email: "member@example.com",
      requestedIp: "127.0.0.1"
    });
  });

  it("ignores a browser brand field on reset confirmation", async () => {
    const response = await resetPassword(
      new Request("https://circlecard.co.uk/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          token: "a".repeat(64),
          password: "ValidPassword1!",
          confirmPassword: "ValidPassword1!",
          brand: "bcn"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.confirmPasswordReset).toHaveBeenCalledWith({
      brand: "circle-card",
      email: "member@example.com",
      token: "a".repeat(64),
      password: "ValidPassword1!"
    });
  });
});
