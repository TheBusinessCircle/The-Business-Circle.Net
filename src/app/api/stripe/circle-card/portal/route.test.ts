import { beforeEach, describe, expect, it, vi } from "vitest";

const isTrustedOriginMock = vi.hoisted(() => vi.fn());
const requireApiUserMock = vi.hoisted(() => vi.fn());
const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const rateLimitHeadersMock = vi.hoisted(() => vi.fn());
const createPortalMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/origin", () => ({ isTrustedOrigin: isTrustedOriginMock }));
vi.mock("@/lib/auth/api", () => ({ requireApiUser: requireApiUserMock }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  rateLimitHeaders: rateLimitHeadersMock
}));
vi.mock("@/server/circle-card", () => ({
  createCircleCardBillingPortalSession: createPortalMock
}));
vi.mock("@/server/circle-card/performance", () => ({
  measureCircleCardAction: (_action: string, operation: (correlationId: string) => Promise<unknown>) => operation("test-request")
}));
vi.mock("@/lib/security/logging", () => ({ logServerError: vi.fn() }));

import { POST } from "@/app/api/stripe/circle-card/portal/route";

function request(body: unknown = {}) {
  return new Request("https://thebusinesscircle.net/api/stripe/circle-card/portal", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://thebusinesscircle.net" },
    body: JSON.stringify(body)
  });
}

describe("Circle Card billing portal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTrustedOriginMock.mockReturnValue(true);
    requireApiUserMock.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com", name: "Member" }
    });
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60
    });
    rateLimitHeadersMock.mockReturnValue({ "X-RateLimit-Limit": "10" });
    createPortalMock.mockResolvedValue({ url: "https://billing.stripe.test/session" });
  });

  it("rejects untrusted origins", async () => {
    isTrustedOriginMock.mockReturnValue(false);
    expect((await POST(request())).status).toBe(403);
  });

  it("requires authentication", async () => {
    requireApiUserMock.mockResolvedValue({
      response: Response.json({ error: "Authentication required." }, { status: 401 })
    });
    expect((await POST(request())).status).toBe(401);
  });

  it("rate limits portal creation", async () => {
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60
    });
    expect((await POST(request())).status).toBe(429);
  });

  it("stamps the trusted reconciliation state on every safe Portal return", async () => {
    const response = await POST(request({ returnPath: "/dashboard/circle-card?billing=recovery" }));
    expect(response.status).toBe(200);
    expect(createPortalMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "member@example.com",
      name: "Member",
      returnPath: "/dashboard/circle-card?billing=portal-return"
    });
  });

  it("selects the trusted clean portal return for the Circle Card runtime", async () => {
    process.env.APP_BRAND = "circle-card";
    try {
      const response = await POST(
        request({ returnPath: "/dashboard/circle-card?billing=portal-return" })
      );
      expect(response.status).toBe(200);
      expect(createPortalMock).toHaveBeenCalledWith(
        expect.objectContaining({ returnPath: "/app?billing=portal-return" })
      );
    } finally {
      delete process.env.APP_BRAND;
    }
  });

  it("rejects BCN and external portal return destinations on Circle Card", async () => {
    process.env.APP_BRAND = "circle-card";
    try {
      await POST(request({ returnPath: "/dashboard/membership" }));
      expect(createPortalMock).toHaveBeenCalledWith(
        expect.objectContaining({ returnPath: "/app?billing=portal-return" })
      );
    } finally {
      delete process.env.APP_BRAND;
    }
  });

  it("returns not found rather than creating a customer without a relationship", async () => {
    createPortalMock.mockRejectedValue(new Error("circle-card-billing-relationship-not-found"));
    expect((await POST(request())).status).toBe(404);
  });

  it("reports duplicate subscription conflicts", async () => {
    createPortalMock.mockRejectedValue(new Error("circle-card-reconciliation-conflict"));
    expect((await POST(request())).status).toBe(409);
  });

  it("returns a useful temporary error for Stripe network failures", async () => {
    createPortalMock.mockRejectedValue(new Error("connect ECONNRESET"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: "Stripe billing management is temporarily unavailable. Please try again shortly."
    });
  });
});
