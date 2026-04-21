import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyEmailTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/email-verification", () => ({
  verifyEmailToken: verifyEmailTokenMock
}));

import { GET } from "@/app/api/auth/verify-email/route";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("verify email route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setNodeEnv("production");
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.NEXTAUTH_URL = "https://thebusinesscircle.net";
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
    process.env.APP_URL = originalAppUrl;
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
  });

  it("redirects successful verification to the canonical live login url", async () => {
    verifyEmailTokenMock.mockResolvedValue(true);

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?uid=user_123&token=test_token")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://thebusinesscircle.net/login?verified=1"
    );
  });

  it("redirects invalid verification to the canonical live login url", async () => {
    verifyEmailTokenMock.mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost/api/auth/verify-email?uid=user_123&token=test_token")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://thebusinesscircle.net/login?error=invalid-verification"
    );
  });
});
