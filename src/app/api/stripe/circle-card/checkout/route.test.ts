import { beforeEach, describe, expect, it, vi } from "vitest";

const isTrustedOriginMock = vi.hoisted(() => vi.fn());
const requireApiUserMock = vi.hoisted(() => vi.fn());
const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const rateLimitHeadersMock = vi.hoisted(() => vi.fn());
const readinessMock = vi.hoisted(() => vi.fn());
const configurationErrorMock = vi.hoisted(() => vi.fn());
const canStartCheckoutMock = vi.hoisted(() => vi.fn());
const createCheckoutMock = vi.hoisted(() => vi.fn());
const findOwnedCardMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/origin", () => ({ isTrustedOrigin: isTrustedOriginMock }));
vi.mock("@/lib/auth/api", () => ({ requireApiUser: requireApiUserMock }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  rateLimitHeaders: rateLimitHeadersMock
}));
vi.mock("@/lib/circle-card/pricing", () => ({
  getCircleCardBillingReadiness: readinessMock,
  getCircleCardProBillingConfigurationErrorMessage: configurationErrorMock,
  canUserStartCircleCardCheckout: canStartCheckoutMock
}));
vi.mock("@/server/circle-card", () => ({
  createCircleCardProCheckoutSession: createCheckoutMock
}));
vi.mock("@/server/circle-card/performance", () => ({
  measureCircleCardAction: (_action: string, operation: (correlationId: string) => Promise<unknown>) => operation("test-request")
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { circleCard: { findFirst: findOwnedCardMock } }
}));
vi.mock("@/lib/security/logging", () => ({ logServerError: vi.fn() }));

import { POST } from "@/app/api/stripe/circle-card/checkout/route";

function request(body: unknown = {}) {
  return new Request("https://thebusinesscircle.net/api/stripe/circle-card/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://thebusinesscircle.net" },
    body: JSON.stringify(body)
  });
}

describe("Circle Card Checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTrustedOriginMock.mockReturnValue(true);
    requireApiUserMock.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com", name: "Member" }
    });
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60
    });
    rateLimitHeadersMock.mockReturnValue({ "X-RateLimit-Limit": "5" });
    readinessMock.mockReturnValue({ billingEnabled: true });
    configurationErrorMock.mockReturnValue(null);
    canStartCheckoutMock.mockReturnValue(true);
    findOwnedCardMock.mockResolvedValue({ id: "card-owned-1" });
    createCheckoutMock.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.test/session",
      reused: false
    });
  });

  it("rejects an untrusted origin before authentication", async () => {
    isTrustedOriginMock.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(requireApiUserMock).not.toHaveBeenCalled();
  });

  it("returns the authentication response for an unauthenticated caller", async () => {
    requireApiUserMock.mockResolvedValue({
      response: Response.json({ error: "Authentication required." }, { status: 401 })
    });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("requires a freshly verified authenticated user", async () => {
    requireApiUserMock.mockResolvedValue({
      response: Response.json({ error: "Verify your email before starting Checkout." }, { status: 403 })
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(requireApiUserMock).toHaveBeenCalledWith({
      allowUnentitled: true,
      requireVerifiedEmail: true
    });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("keeps billing disabled without creating a Stripe session", async () => {
    readinessMock.mockReturnValue({ billingEnabled: false });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ billingEnabled: false, checkoutReady: false });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("blocks non-operator users while controlled billing mode is enabled", async () => {
    canStartCheckoutMock.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ billingEnabled: true, checkoutReady: false });
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rejects client-supplied plan, period, price, or source values", async () => {
    const response = await POST(
      request({ plan: "pro", period: "annual", priceId: "price_attacker", source: "client" })
    );
    expect(response.status).toBe(400);
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it("rate limits repeated attempts", async () => {
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("reports a reused unexpired server-side Checkout session", async () => {
    createCheckoutMock.mockResolvedValue({
      id: "cs_test_reused",
      url: "https://checkout.stripe.test/reused",
      reused: true
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      checkoutSessionCreated: false,
      checkoutSessionReused: true
    });
    expect(createCheckoutMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "member@example.com",
      name: "Member",
      intent: {
        source: "pro_page",
        capability: "explore_pro",
        returnPath: "/dashboard/circle-card"
      }
    });
  });

  it("rejects a card context that is not owned by the authenticated user", async () => {
    findOwnedCardMock.mockResolvedValue(null);
    const response = await POST(request({
      intent: {
        source: "studio",
        capability: "apply_studio_design",
        returnPath: "/dashboard/circle-card/studio",
        cardId: "card-not-owned-1"
      }
    }));
    expect(response.status).toBe(400);
    expect(createCheckoutMock).not.toHaveBeenCalled();
  });

  it.each([
    "circle-card-pro-already-active",
    "circle-card-pro-already-included",
    "circle-card-pro-existing-subscription",
    "circle-card-checkout-in-progress",
    "circle-card-checkout-persistence-conflict",
    "circle-card-reconciliation-conflict"
  ])("returns conflict for %s", async (code) => {
    createCheckoutMock.mockRejectedValue(new Error(code));
    const response = await POST(request());
    expect(response.status).toBe(409);
  });

  it("returns a useful temporary error for Stripe network failures", async () => {
    createCheckoutMock.mockRejectedValue(new Error("connect ECONNRESET"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: "Stripe Checkout is temporarily unavailable. Please try again shortly."
    });
  });
});
