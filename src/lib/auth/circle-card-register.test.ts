import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCircleCardFreeRegistration, RegistrationServiceError } from "@/lib/auth/register";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  circleCardFindUnique: vi.fn(),
  circleCardCreate: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn(),
  sendEmailVerification: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction
  }
}));

vi.mock("@/lib/auth/password", () => ({ hashPassword: mocks.hashPassword }));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ sent: false, skipped: true }))
}));

vi.mock("@/lib/auth/email-verification", () => ({
  sendEmailVerificationForUser: mocks.sendEmailVerification
}));

vi.mock("@/server/lead-generation", () => ({
  recordCircleCardSignupLead: vi.fn(async () => ({ id: "lead_1" })),
  markLeadEmailed: vi.fn(),
  recordBcnJoinLead: vi.fn(),
  markLatestBcnJoinLeadEmailed: vi.fn()
}));

vi.mock("@/server/community-recognition", () => ({ recordInviteReferral: vi.fn() }));
vi.mock("@/server/invite-codes", () => ({
  validateInviteCodeForCheckout: vi.fn(async () => ({ valid: false, reason: "missing" }))
}));
vi.mock("@/server/admin/launch-codes.service", () => ({ validateLaunchCode: vi.fn() }));
vi.mock("@/server/stripe/client", () => ({ requireStripeClient: vi.fn() }));

describe("Circle Card free registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.sendEmailVerification.mockResolvedValue({ sent: false, skipped: true });
    mocks.userCreate.mockResolvedValue({
      id: "user_1",
      email: "new@example.com",
      name: "New Person"
    });
    mocks.circleCardFindUnique.mockResolvedValue(null);
    mocks.circleCardCreate.mockResolvedValue({ id: "card_1" });
    mocks.activityCreate.mockResolvedValue({ id: "activity_1" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { create: mocks.userCreate },
        circleCard: {
          findUnique: mocks.circleCardFindUnique,
          create: mocks.circleCardCreate
        },
        circleCardActivity: { create: mocks.activityCreate }
      })
    );
  });

  it("creates a normalized free account and sends normal registration to onboarding", async () => {
    const result = await createCircleCardFreeRegistration({
      source: "circle-card",
      name: "New Person",
      email: " NEW@EXAMPLE.COM ",
      password: "ValidPassword1!",
      acceptedTerms: true,
      minimumAgeConfirmed: true
    }, "bcn");

    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@example.com",
          registrationSource: "circle-card"
        })
      })
    );
    expect(mocks.circleCardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: false, userId: "user_1" })
      })
    );
    expect(result.redirectTo).toBe("/dashboard/circle-card/onboarding");
  });

  it("returns a clear duplicate-email error", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "existing", suspended: false });

    await expect(
      createCircleCardFreeRegistration({
        source: "circle-card",
        name: "New Person",
        email: "new@example.com",
        password: "ValidPassword1!",
        acceptedTerms: true,
        minimumAgeConfirmed: true
      }, "bcn")
    ).rejects.toMatchObject({ code: "EMAIL_IN_USE" } satisfies Partial<RegistrationServiceError>);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("maps a concurrent database email collision without creating a second card", async () => {
    mocks.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test"
      })
    );

    await expect(
      createCircleCardFreeRegistration({
        source: "circle-card",
        name: "New Person",
        email: "new@example.com",
        password: "ValidPassword1!",
        acceptedTerms: true,
        minimumAgeConfirmed: true
      }, "circle-card")
    ).rejects.toMatchObject({ code: "EMAIL_IN_USE" } satisfies Partial<RegistrationServiceError>);
    expect(mocks.circleCardCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("uses the standalone paths and verification brand for Circle Card runtime", async () => {
    const result = await createCircleCardFreeRegistration(
      {
        source: "circle-card",
        name: "New Person",
        email: "new@example.com",
        password: "ValidPassword1!",
        acceptedTerms: true,
        minimumAgeConfirmed: true,
        returnTo: "/dashboard/circle-card/onboarding"
      },
      "circle-card"
    );

    expect(result.redirectTo).toBe("/app/onboarding");
    expect(mocks.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "circle-card",
        userId: "user_1",
        email: "new@example.com"
      })
    );
  });

  it("rejects invalid input before touching the database", async () => {
    await expect(
      createCircleCardFreeRegistration({
        source: "circle-card",
        name: "N",
        email: "not-an-email",
        password: "weak"
      }, "bcn")
    ).rejects.toMatchObject({ code: "INVALID_INPUT" } satisfies Partial<RegistrationServiceError>);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("creates one unpublished starter card for Spin and does not duplicate it on repeat", async () => {
    const payload = {
      source: "circle-card",
      name: "New Person",
      email: "new@example.com",
      password: "ValidPassword1!",
      acceptedTerms: true,
      minimumAgeConfirmed: true,
      returnTo: "/card/origin-card?spin=return",
      sourceCardSlug: "origin-card"
    } as const;

    const result = await createCircleCardFreeRegistration(payload, "bcn");

    expect(mocks.circleCardCreate).toHaveBeenCalledTimes(1);
    expect(mocks.circleCardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          isPublished: false,
          isPrimary: true,
          isDefaultCard: true
        })
      })
    );
    expect(result.redirectTo).toBe("/dashboard/circle-card/onboarding");

    mocks.userFindUnique.mockResolvedValueOnce({ id: "user_1", suspended: false });
    await expect(createCircleCardFreeRegistration(payload, "bcn")).rejects.toMatchObject({
      code: "EMAIL_IN_USE"
    });
    expect(mocks.circleCardCreate).toHaveBeenCalledTimes(1);
  });
});
