import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyEmailTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/email-verification", () => ({
  verifyEmailToken: verifyEmailTokenMock
}));

import { GET } from "@/app/api/auth/verify-email/route";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;
const originalAppBrand = process.env.APP_BRAND;

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("verify email route", () => {
  let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    setNodeEnv("production");
    process.env.APP_URL = "https://thebusinesscircle.net";
    process.env.NEXTAUTH_URL = "https://thebusinesscircle.net";
    delete process.env.APP_BRAND;
    consoleSpies = [
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined)
    ];
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
    process.env.APP_URL = originalAppUrl;
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
    if (originalAppBrand === undefined) {
      delete process.env.APP_BRAND;
    } else {
      process.env.APP_BRAND = originalAppBrand;
    }
    vi.restoreAllMocks();
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
    expect(verifyEmailTokenMock).toHaveBeenCalledWith({
      brand: "bcn",
      userId: "user_123",
      token: "test_token"
    });
  });

  it("binds Circle Card verification and its result to the Circle Card origin", async () => {
    process.env.APP_BRAND = "circle-card";
    process.env.APP_URL = "https://circlecard.co.uk";
    process.env.NEXTAUTH_URL = "https://circlecard.co.uk";
    verifyEmailTokenMock.mockResolvedValue(true);

    const response = await GET(
      new Request("https://circlecard.co.uk/api/auth/verify-email?uid=user_123&token=test_token")
    );

    expect(response.headers.get("location")).toBe(
      "https://circlecard.co.uk/login?verified=1"
    );
    expect(verifyEmailTokenMock).toHaveBeenCalledWith({
      brand: "circle-card",
      userId: "user_123",
      token: "test_token"
    });
  });

  it("returns Circle Card verification failures to the Circle Card login", async () => {
    process.env.APP_BRAND = "circle-card";
    verifyEmailTokenMock.mockResolvedValue(false);

    const response = await GET(
      new Request("https://circlecard.co.uk/api/auth/verify-email?uid=user_123&token=test_token")
    );

    expect(response.headers.get("location")).toBe(
      "https://circlecard.co.uk/login?error=invalid-verification"
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

  it("never logs a raw verification token, complete URL, or email on failure", async () => {
    const token = "a".repeat(64);
    const email = "route-log-canary@example.invalid";
    const requestUrl =
      `http://localhost/api/auth/verify-email?uid=user_123&token=${token}` +
      `&email=${encodeURIComponent(email)}`;
    verifyEmailTokenMock.mockRejectedValue(
      new Error(`Verification failed for ${requestUrl} and ${email}`)
    );

    const response = await GET(new Request(requestUrl));

    expect(response.status).toBe(307);
    const logs = consoleSpies
      .flatMap((spy) => spy.mock.calls)
      .map((call) => JSON.stringify(call))
      .join("\n");
    expect(logs).not.toContain(token);
    expect(logs).not.toContain(requestUrl);
    expect(logs).not.toContain(email);
  });
});
