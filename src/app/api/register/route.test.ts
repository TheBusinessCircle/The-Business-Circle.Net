import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TERMS_LABEL, TERMS_VERSION } from "@/config/legal";

const createPendingRegistrationMock = vi.hoisted(() => vi.fn());
const createCircleCardFreeRegistrationMock = vi.hoisted(() => vi.fn());
const createStripeCheckoutSessionForPendingRegistrationMock = vi.hoisted(() => vi.fn());
const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const rateLimitHeadersMock = vi.hoisted(() => vi.fn());
const isTrustedOriginMock = vi.hoisted(() => vi.fn());
const isBillingEnabledMock = vi.hoisted(() => vi.fn());
const getBillingConfigurationErrorMessageMock = vi.hoisted(() => vi.fn());
const attributeCircleCardReferralSignupMock = vi.hoisted(() => vi.fn());
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
  createCircleCardFreeRegistration: createCircleCardFreeRegistrationMock,
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
  getBillingConfigurationErrorMessage: getBillingConfigurationErrorMessageMock,
  isBillingEnabled: isBillingEnabledMock
}));

vi.mock("@/server/circle-card", () => ({
  attributeCircleCardReferralSignup: attributeCircleCardReferralSignupMock
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
    getBillingConfigurationErrorMessageMock.mockReturnValue(null);
    attributeCircleCardReferralSignupMock.mockResolvedValue({
      attributed: false,
      reason: "missing-referrer"
    });
  });

  it("returns a clear validation error when Terms are not accepted", async () => {
    createPendingRegistrationMock.mockRejectedValueOnce(
      new MockRegistrationServiceError(
        "INVALID_INPUT",
        `You must accept the ${TERMS_LABEL} to continue.`
      )
    );

    const response = await POST(
      new NextRequest("http://localhost/api/register", {
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
      new NextRequest("http://localhost/api/register", {
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
          acceptedTerms: true,
          minimumAgeConfirmed: true,
          inviteCode: "STALE-FOUNDER-CODE"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123"
    });
    const createPayload = createPendingRegistrationMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(createPayload).toHaveProperty("inviteCode", "STALE-FOUNDER-CODE");
    expect(createStripeCheckoutSessionForPendingRegistrationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingRegistrationId: "pending_123",
        inviteCode: "BC-TREV-1234",
        acceptedTermsVersion: TERMS_VERSION,
        acceptedRulesAt: null,
        acceptedRulesVersion: null,
        acceptedAt
      })
    );
  });

  it("does not create a pending registration when Stripe billing is unavailable", async () => {
    isBillingEnabledMock.mockReturnValueOnce(false);

    const response = await POST(
      new NextRequest("http://localhost/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Trevor Newton",
          email: "trev@example.com",
          password: "ValidPassword1!",
          tier: "FOUNDATION",
          billingInterval: "monthly",
          acceptedTerms: true,
          minimumAgeConfirmed: true
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      error: "Stripe billing is not configured."
    });
    expect(createPendingRegistrationMock).not.toHaveBeenCalled();
    expect(createStripeCheckoutSessionForPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it("routes Circle Card free registration without starting Stripe checkout", async () => {
    createCircleCardFreeRegistrationMock.mockResolvedValueOnce({
      user: {
        id: "user_circle_123",
        email: "card@example.com",
        name: "Card User"
      },
      redirectTo: "/dashboard/circle-card"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "circle-card",
          name: "Card User",
          email: "card@example.com",
          password: "ValidPassword1!",
          acceptedTerms: true,
          minimumAgeConfirmed: true,
          marketingEmailOptIn: false
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      redirectTo: "/dashboard/circle-card"
    });
    expect(createCircleCardFreeRegistrationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "circle-card",
        email: "card@example.com"
      }),
      "bcn"
    );
    expect(createPendingRegistrationMock).not.toHaveBeenCalled();
    expect(createStripeCheckoutSessionForPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it("uses a source-card fallback when the Spin cookie write has not completed", async () => {
    createCircleCardFreeRegistrationMock.mockResolvedValueOnce({
      user: { id: "new_user", email: "new@example.com", name: "New User" },
      redirectTo: "/card/origin-card?spin=return"
    });
    attributeCircleCardReferralSignupMock.mockResolvedValueOnce({
      attributed: true,
      referralId: "referral_1"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "circle-card",
          name: "New User",
          email: "new@example.com",
          password: "ValidPassword1!",
          acceptedTerms: true,
          minimumAgeConfirmed: true,
          returnTo: "/card/origin-card?spin=return",
          sourceCardSlug: "origin-card"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(attributeCircleCardReferralSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referredUserId: "new_user",
        referralCode: "origin-card",
        referralSource: "spin_to_connect",
        sourceType: "spin_to_connect",
        sourceCardSlug: "origin-card",
        sourceEvent: "SPIN_COMPLETED"
      })
    );
  });

  it("does not block registration when source-card attribution is invalid", async () => {
    createCircleCardFreeRegistrationMock.mockResolvedValueOnce({
      user: { id: "new_user", email: "new@example.com", name: "New User" },
      redirectTo: "/dashboard/circle-card/onboarding"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "circle-card",
          name: "New User",
          email: "new@example.com",
          password: "ValidPassword1!",
          acceptedTerms: true,
          minimumAgeConfirmed: true,
          sourceCardSlug: "not-a-real-card"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: "/dashboard/circle-card/onboarding"
    });
  });
});
