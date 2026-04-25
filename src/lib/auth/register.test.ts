import { Role, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { RegistrationServiceError, createPendingRegistration } from "@/lib/auth/register";
import { BCN_RULES_VERSION, TERMS_VERSION } from "@/config/legal";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  pendingRegistrationFindFirst: vi.fn(),
  pendingRegistrationFindMany: vi.fn(),
  pendingRegistrationCreate: vi.fn(),
  pendingRegistrationUpdateMany: vi.fn(),
  foundingReservationUpdateMany: vi.fn(),
  hashPassword: vi.fn(),
  requireStripeClient: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique
    },
    pendingRegistration: {
      findFirst: mocks.pendingRegistrationFindFirst,
      findMany: mocks.pendingRegistrationFindMany,
      create: mocks.pendingRegistrationCreate,
      updateMany: mocks.pendingRegistrationUpdateMany
    },
    foundingOfferReservation: {
      updateMany: mocks.foundingReservationUpdateMany
    },
    $transaction: mocks.transaction
  }
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword
}));

vi.mock("@/server/stripe/client", () => ({
  requireStripeClient: mocks.requireStripeClient
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: vi.fn()
}));

vi.mock("@/lib/auth/email-verification", () => ({
  sendEmailVerificationForUser: vi.fn()
}));

vi.mock("@/server/community-recognition", () => ({
  recordInviteReferral: vi.fn()
}));

describe("createPendingRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.pendingRegistrationUpdateMany.mockResolvedValue({ count: 0 });
    mocks.pendingRegistrationFindMany.mockResolvedValue([]);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.pendingRegistrationFindFirst.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        pendingRegistration: {
          updateMany: mocks.pendingRegistrationUpdateMany
        },
        foundingOfferReservation: {
          updateMany: mocks.foundingReservationUpdateMany
        }
      })
    );
    mocks.requireStripeClient.mockReturnValue({
      checkout: {
        sessions: {
          expire: vi.fn()
        }
      }
    });
  });

  it("rejects when the email already belongs to an entitled member", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user_123",
      role: Role.MEMBER,
      suspended: false,
      subscription: {
        status: SubscriptionStatus.ACTIVE
      }
    });

    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly",
        acceptedTerms: true,
        acceptedRules: true
      })
    ).rejects.toMatchObject({
      code: "EMAIL_IN_USE"
    } satisfies Partial<RegistrationServiceError>);
  });

  it("allows a dormant account email to restart through paid activation", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user_123",
      passwordHash: null,
      role: Role.MEMBER,
      suspended: false,
      subscription: {
        status: SubscriptionStatus.CANCELED
      }
    });
    mocks.pendingRegistrationCreate.mockResolvedValueOnce({
      id: "pending_456",
      email: "trev@example.com",
      fullName: "Trevor Newton",
      selectedTier: "FOUNDATION",
      billingInterval: "MONTHLY",
      coreAccessConfirmed: false,
      inviteCode: null,
      acceptedTermsAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedRulesAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedTermsVersion: TERMS_VERSION,
      acceptedRulesVersion: BCN_RULES_VERSION
    });

    const result = await createPendingRegistration({
      name: "Trevor Newton",
      email: "trev@example.com",
      password: "ValidPassword1!",
      tier: "FOUNDATION",
      billingInterval: "monthly",
      acceptedTerms: true,
      acceptedRules: true
    });

    expect(result.pendingRegistration.id).toBe("pending_456");
    expect(mocks.pendingRegistrationCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects an existing account email when the user already has a password", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      id: "user_123",
      passwordHash: "hashed-existing-password",
      role: Role.MEMBER,
      suspended: false,
      subscription: {
        status: SubscriptionStatus.CANCELED
      }
    });

    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly",
        acceptedTerms: true,
        acceptedRules: true
      })
    ).rejects.toMatchObject({
      code: "EMAIL_IN_USE"
    } satisfies Partial<RegistrationServiceError>);
  });

  it("rejects when payment is already being confirmed for the same email", async () => {
    mocks.pendingRegistrationFindFirst.mockResolvedValueOnce({ id: "pending_123" });

    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly",
        acceptedTerms: true,
        acceptedRules: true
      })
    ).rejects.toMatchObject({
      code: "PAYMENT_IN_PROGRESS"
    } satisfies Partial<RegistrationServiceError>);
  });

  it("rejects when the terms are not accepted", async () => {
    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly",
        acceptedRules: true
      })
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "You must accept the Terms & Conditions to continue."
    } satisfies Partial<RegistrationServiceError>);
  });

  it("does not require BCN Rules acceptance during signup", async () => {
    mocks.pendingRegistrationCreate.mockResolvedValueOnce({
      id: "pending_terms_only",
      email: "trev@example.com",
      fullName: "Trevor Newton",
      selectedTier: "FOUNDATION",
      billingInterval: "MONTHLY",
      coreAccessConfirmed: false,
      inviteCode: null,
      acceptedTermsAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedRulesAt: null,
      acceptedTermsVersion: TERMS_VERSION,
      acceptedRulesVersion: null
    });

    const result = await createPendingRegistration({
      name: "Trevor Newton",
      email: "trev@example.com",
      password: "ValidPassword1!",
      tier: "FOUNDATION",
      billingInterval: "monthly",
      acceptedTerms: true
    });

    expect(mocks.pendingRegistrationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acceptedTermsAt: expect.any(Date),
          acceptedRulesAt: null,
          acceptedTermsVersion: TERMS_VERSION,
          acceptedRulesVersion: null
        })
      })
    );
    expect(result.pendingRegistration.acceptedRulesAt).toBeNull();
    expect(result.pendingRegistration.acceptedRulesVersion).toBeNull();
  });

  it("stores a normalized pending registration instead of creating a real user", async () => {
    mocks.pendingRegistrationCreate.mockResolvedValueOnce({
      id: "pending_123",
      email: "trev@example.com",
      fullName: "Trevor Newton",
      selectedTier: "INNER_CIRCLE",
      billingInterval: "ANNUAL",
      coreAccessConfirmed: false,
      inviteCode: "BC-TREV-1234",
      acceptedTermsAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedRulesAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedTermsVersion: TERMS_VERSION,
      acceptedRulesVersion: BCN_RULES_VERSION
    });

    const result = await createPendingRegistration({
      name: "Trevor Newton",
      email: "TREV@EXAMPLE.COM",
      password: "ValidPassword1!",
      tier: "INNER_CIRCLE",
      billingInterval: "annual",
      businessName: " This One ",
      businessStatus: "REGISTERED_BUSINESS",
      businessStage: "GROWTH",
      companyNumber: " 12345678 ",
      inviteCode: "bc-trev-1234",
      acceptedTerms: true,
      acceptedRules: true
    });

    expect(mocks.pendingRegistrationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "trev@example.com",
          fullName: "Trevor Newton",
          passwordHash: "hashed-password",
          selectedTier: "INNER_CIRCLE",
          billingInterval: "ANNUAL",
          businessName: "This One",
          businessStatus: "REGISTERED_BUSINESS",
          businessStage: "GROWTH",
          companyNumber: "12345678",
          inviteCode: "BC-TREV-1234",
          acceptedTermsAt: expect.any(Date),
          acceptedRulesAt: expect.any(Date),
          acceptedTermsVersion: TERMS_VERSION,
          acceptedRulesVersion: BCN_RULES_VERSION
        })
      })
    );
    expect(result.pendingRegistration).toEqual({
      id: "pending_123",
      email: "trev@example.com",
      fullName: "Trevor Newton",
      selectedTier: "INNER_CIRCLE",
      billingInterval: "annual",
      coreAccessConfirmed: false,
      inviteCode: "BC-TREV-1234",
      acceptedTermsAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedRulesAt: new Date("2026-04-25T09:15:00.000Z"),
      acceptedTermsVersion: TERMS_VERSION,
      acceptedRulesVersion: BCN_RULES_VERSION
    });
  });
});
