import { beforeEach, describe, expect, it, vi } from "vitest";
import { TERMS_LABEL, TERMS_VERSION } from "@/config/legal";

const createPendingRegistrationMock = vi.hoisted(() => vi.fn());
const createStripeCheckoutSessionForPendingRegistrationMock = vi.hoisted(() => vi.fn());
const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const rateLimitHeadersMock = vi.hoisted(() => vi.fn());
const isTrustedOriginMock = vi.hoisted(() => vi.fn());
const isBillingEnabledMock = vi.hoisted(() => vi.fn());
const MockRegistrationServiceError = vi.hoisted(
  () =>
    class MockRegistrationServiceError extends Error {
      code: string;

      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    }
);

vi.mock("@/lib/auth/register", () => ({
  createPendingRegistration: createPendingRegistrationMock,
  RegistrationServiceError: MockRegistrationServiceError
}));

vi.mock("@/lib/security/rate-limit", () => ({
  clientIpFromHeaders: vi.fn(() => "127.0.0.1"),
  consumeRateLimit: consumeRateLimitMock,
  rateLimitHeaders: rateLimitHeadersMock
}));

vi.mock("@/lib/security/origin", () => ({
  isTrustedOrigin: isTrustedOriginMock
}));

vi.mock("@/lib/security/logging", () => ({
  logServerError: vi.fn()
}));

vi.mock("@/server/subscriptions", () => ({
  createStripeCheckoutSessionForPendingRegistration:
    createStripeCheckoutSessionForPendingRegistrationMock,
  isBillingEnabled: isBillingEnabledMock
}));

import { POST } from "@/app/api/register/route";

describe("register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTrustedOriginMock.mockReturnValue(true);
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60
    });
    rateLimitHeadersMock.mockReturnValue({});
    isBillingEnabledMock.mockReturnValue(true);
  });

  it("returns a clear validation error when Terms are not accepted", async () => {
    createPendingRegistrationMock.mockRejectedValueOnce(
      new MockRegistrationServiceError(
        "INVALID_INPUT",
        `You must accept the ${TERMS_LABEL} to continue.`
      )
    );

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: `You must accept the ${TERMS_LABEL} to continue.`
    });
    expect(createStripeCheckoutSessionForPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it("starts checkout when Terms are accepted without requiring BCN Rules", async () => {
    const acceptedAt = new Date("2026-04-25T10:15:00.000Z");

    createPendingRegistrationMock.mockResolvedValueOnce({
      pendingRegistration: {
        id: "pending_123",
        email: "trev@example.com",
        fullName: "Trevor Newton",
        selectedTier: "INNER_CIRCLE",
        billingInterval: "annual",
        coreAccessConfirmed: false,
        inviteCode: "BC-TREV-1234",
        acceptedTermsAt: acceptedAt,
        acceptedRulesAt: null,
        acceptedTermsVersion: TERMS_VERSION,
        acceptedRulesVersion: null
      }
    });
    createStripeCheckoutSessionForPendingRegistrationMock.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/c/pay/cs_test_123"
    });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Trevor Newton",
          email: "trev@example.com",
          password: "ValidPassword1!",
          tier: "INNER_CIRCLE",
          billingInterval: "annual",
          acceptedTerms: true
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123"
    });
    expect(createStripeCheckoutSessionForPendingRegistrationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingRegistrationId: "pending_123",
        acceptedTermsVersion: TERMS_VERSION,
        acceptedRulesAt: null,
        acceptedRulesVersion: null,
        acceptedAt
      })
    );
  });
});
