import { describe, expect, it, beforeEach, vi } from "vitest";
import { RegistrationServiceError, createPendingRegistration } from "@/lib/auth/register";

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

  it("rejects when the email already belongs to a real user", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user_123" });

    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly"
      })
    ).rejects.toMatchObject<Partial<RegistrationServiceError>>({
      code: "EMAIL_IN_USE"
    });
  });

  it("rejects when payment is already being confirmed for the same email", async () => {
    mocks.pendingRegistrationFindFirst.mockResolvedValueOnce({ id: "pending_123" });

    await expect(
      createPendingRegistration({
        name: "Trevor Newton",
        email: "trev@example.com",
        password: "ValidPassword1!",
        tier: "FOUNDATION",
        billingInterval: "monthly"
      })
    ).rejects.toMatchObject<Partial<RegistrationServiceError>>({
      code: "PAYMENT_IN_PROGRESS"
    });
  });

  it("stores a normalized pending registration instead of creating a real user", async () => {
    mocks.pendingRegistrationCreate.mockResolvedValueOnce({
      id: "pending_123",
      email: "trev@example.com",
      fullName: "Trevor Newton",
      selectedTier: "INNER_CIRCLE",
      billingInterval: "ANNUAL",
      coreAccessConfirmed: false,
      inviteCode: "BC-TREV-1234"
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
      inviteCode: "bc-trev-1234"
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
          inviteCode: "BC-TREV-1234"
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
      inviteCode: "BC-TREV-1234"
    });
  });
});
