import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resendVerificationEmail: vi.fn(),
  requireApiUser: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("@/lib/auth/email-verification", () => ({
  resendVerificationEmail: mocks.resendVerificationEmail
}));

vi.mock("@/lib/auth/api", () => ({
  requireApiUser: mocks.requireApiUser
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique }
  }
}));

vi.mock("@/lib/security/origin", () => ({
  isTrustedOrigin: (request: Request) =>
    request.headers.get("origin") === "https://circlecard.co.uk" ||
    request.headers.get("origin") === "https://thebusinesscircle.net"
}));

vi.mock("@/lib/security/logging", () => ({
  logServerError: vi.fn(),
  logServerInfo: vi.fn(),
  logServerWarning: vi.fn()
}));

import { POST } from "@/app/api/admin/members/[id]/resend-verification/route";

const originalAppBrand = process.env.APP_BRAND;

describe("admin verification resend brand boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BRAND = "circle-card";
    mocks.requireApiUser.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.userFindUnique.mockResolvedValue({ registrationSource: "circle-card" });
    mocks.resendVerificationEmail.mockResolvedValue({ sent: true });
  });

  afterEach(() => {
    if (originalAppBrand === undefined) {
      delete process.env.APP_BRAND;
    } else {
      process.env.APP_BRAND = originalAppBrand;
    }
  });

  function request(origin: string) {
    return new Request(
      "https://circlecard.co.uk/api/admin/members/member-1/resend-verification",
      { method: "POST", headers: { origin } }
    );
  }

  it("uses stored Circle Card context rather than the admin runtime", async () => {
    process.env.APP_BRAND = "bcn";
    const response = await POST(
      request("https://thebusinesscircle.net"),
      { params: Promise.resolve({ id: "member-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.resendVerificationEmail).toHaveBeenCalledWith(
      "member-1",
      "circle-card"
    );
  });

  it("uses stored BCN context even on the Circle Card runtime", async () => {
    mocks.userFindUnique.mockResolvedValue({ registrationSource: "bcn-join" });

    const response = await POST(
      request("https://circlecard.co.uk"),
      { params: Promise.resolve({ id: "member-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.resendVerificationEmail).toHaveBeenCalledWith(
      "member-1",
      "bcn"
    );
  });

  it("rejects a cross-brand origin before admin authentication", async () => {
    const response = await POST(
      request("https://attacker.example"),
      { params: Promise.resolve({ id: "member-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.requireApiUser).not.toHaveBeenCalled();
    expect(mocks.resendVerificationEmail).not.toHaveBeenCalled();
  });
});
