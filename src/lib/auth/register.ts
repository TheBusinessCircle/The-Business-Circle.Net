import {
  BusinessStage,
  BusinessStatus,
  MembershipTier,
  Prisma,
  Role,
  SubscriptionStatus
} from "@prisma/client";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { WelcomeMemberEmail } from "@/emails";
import { getMembershipPlan } from "@/config/membership";
import { hashPassword } from "@/lib/auth/password";
import { sendEmailVerificationForUser } from "@/lib/auth/email-verification";
import { type RegisterMemberInput, registerMemberSchema } from "@/lib/auth/schemas";
import { normalizeEmail } from "@/lib/auth/utils";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logServerWarning } from "@/lib/security/logging";
import { recordInviteReferral } from "@/server/community-recognition";

type RegistrationErrorCode = "INVALID_INPUT" | "EMAIL_IN_USE" | "CREATE_FAILED";

export class RegistrationServiceError extends Error {
  code: RegistrationErrorCode;

  constructor(code: RegistrationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type CreateMemberAccountOptions = {
  stripeEnabled: boolean;
};

export type CreateMemberAccountResult = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  selectedTier: MembershipTier;
  assignedTier: MembershipTier;
};

function roleForTier(tier: MembershipTier): Role {
  return tier === MembershipTier.FOUNDATION ? Role.MEMBER : Role.INNER_CIRCLE;
}

function isUniqueEmailError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function sendWelcomeMemberEmail(input: {
  email: string;
  firstName: string;
  tier: MembershipTier;
}) {
  const planName = getMembershipPlan(input.tier).name;

  const sendResult = await sendTransactionalEmail({
    to: input.email,
    subject: "Welcome to The Business Circle",
    text: [
      `Hi ${input.firstName},`,
      "",
      `Welcome to The Business Circle. You are in the right place.`,
      `Your membership tier is ${planName}.`,
      "You can now log in to access your dashboard, resources, and community discussions.",
      "Start with one clear move inside the platform and let the rest build from there."
    ].join("\n"),
    react: createElement(WelcomeMemberEmail, {
      firstName: input.firstName,
      tier: input.tier
    }),
    tags: [
      { name: "type", value: "welcome-member" },
      { name: "source", value: "auth" }
    ]
  });

  if (!sendResult.sent && !sendResult.skipped) {
    logServerWarning("welcome-email-delivery-failed");
  }
}

export async function createMemberAccount(
  rawInput: unknown,
  options: CreateMemberAccountOptions
): Promise<CreateMemberAccountResult> {
  const parsed = registerMemberSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new RegistrationServiceError("INVALID_INPUT", "Invalid registration payload.");
  }

  const input: RegisterMemberInput = parsed.data;
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existing) {
    throw new RegistrationServiceError("EMAIL_IN_USE", "An account already exists with this email.");
  }

  const selectedTier = input.tier;
  const assignedTier = options.stripeEnabled ? MembershipTier.FOUNDATION : selectedTier;
  const passwordHash = await hashPassword(input.password);
  const businessName = input.businessName?.trim() || null;
  const businessStatus =
    input.businessStatus && input.businessStatus.length
      ? (input.businessStatus as BusinessStatus)
      : null;
  const companyNumber = input.companyNumber?.trim() || null;
  const businessStage =
    input.businessStage && input.businessStage.length
      ? (input.businessStage as BusinessStage)
      : null;
  const shouldCreateBusiness =
    Boolean(businessName) || Boolean(businessStatus) || Boolean(companyNumber) || Boolean(businessStage);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        role: roleForTier(assignedTier),
        membershipTier: assignedTier,
        profile: {
          create: {
            collaborationTags: [],
            ...(shouldCreateBusiness
              ? {
                  business: {
                    create: {
                      companyName: businessName,
                      status: businessStatus,
                      companyNumber,
                      stage: businessStage
                    }
                  }
                }
              : {})
          }
        },
        subscription: {
          create: {
            tier: selectedTier,
            status: options.stripeEnabled ? SubscriptionStatus.INCOMPLETE : SubscriptionStatus.ACTIVE
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const firstName = user.name?.trim() || "Member";
    await Promise.allSettled([
      sendWelcomeMemberEmail({
        email: user.email,
        firstName,
        tier: selectedTier
      }),
      sendEmailVerificationForUser({
        userId: user.id,
        email: user.email,
        firstName
      })
    ]);

    await recordInviteReferral({
      inviteCode: input.inviteCode ?? null,
      referredUserId: user.id,
      subscriptionTier: selectedTier
    });

    return {
      user,
      selectedTier,
      assignedTier
    };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw new RegistrationServiceError("EMAIL_IN_USE", "An account already exists with this email.");
    }

    throw new RegistrationServiceError("CREATE_FAILED", "Unable to create account.");
  }
}

