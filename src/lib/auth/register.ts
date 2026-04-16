import { createElement } from "react";
import {
  BusinessStage,
  BusinessStatus,
  FoundingReservationStatus,
  MembershipTier,
  PendingRegistrationBillingInterval,
  PendingRegistrationStatus,
  Prisma,
  Role,
  SubscriptionStatus
} from "@prisma/client";
import { WelcomeMemberEmail } from "@/emails";
import { getMembershipPlan, type MembershipBillingInterval } from "@/config/membership";
import { sendEmailVerificationForUser } from "@/lib/auth/email-verification";
import { hashPassword } from "@/lib/auth/password";
import {
  type MembershipBillingIntervalValue,
  type RegisterMemberInput,
  registerMemberSchema
} from "@/lib/auth/schemas";
import { normalizeEmail } from "@/lib/auth/utils";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";
import { logServerWarning } from "@/lib/security/logging";
import { recordInviteReferral } from "@/server/community-recognition";
import { requireStripeClient } from "@/server/stripe/client";

type RegistrationErrorCode =
  | "INVALID_INPUT"
  | "EMAIL_IN_USE"
  | "PAYMENT_IN_PROGRESS"
  | "CREATE_FAILED";

const DEFAULT_PENDING_REGISTRATION_TTL_HOURS = 24;
const MIN_PENDING_REGISTRATION_TTL_HOURS = 1;
const MAX_PENDING_REGISTRATION_TTL_HOURS = 72;
const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

export class RegistrationServiceError extends Error {
  code: RegistrationErrorCode;

  constructor(code: RegistrationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type CreatePendingRegistrationResult = {
  pendingRegistration: {
    id: string;
    email: string;
    fullName: string;
    selectedTier: MembershipTier;
    billingInterval: MembershipBillingInterval;
    coreAccessConfirmed: boolean;
    inviteCode: string | null;
  };
};

export type ProvisionPendingRegistrationResult = {
  pendingRegistrationId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  fullName: string;
  selectedTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  inviteCode: string | null;
};

export type PendingRegistrationPublicStatus = {
  status: PendingRegistrationStatus;
  email: string;
  fullName: string;
  selectedTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
};

function roleForTier(tier: MembershipTier): Role {
  return tier === MembershipTier.FOUNDATION ? Role.MEMBER : Role.INNER_CIRCLE;
}

function isUniqueEmailError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function resolvePendingRegistrationTtlHours() {
  const configured = Number(
    process.env.PENDING_REGISTRATION_TTL_HOURS ?? DEFAULT_PENDING_REGISTRATION_TTL_HOURS
  );

  if (!Number.isFinite(configured)) {
    return DEFAULT_PENDING_REGISTRATION_TTL_HOURS;
  }

  return Math.max(
    MIN_PENDING_REGISTRATION_TTL_HOURS,
    Math.min(MAX_PENDING_REGISTRATION_TTL_HOURS, Math.floor(configured))
  );
}

function normalizeBusinessStatus(value: RegisterMemberInput["businessStatus"]) {
  return value && value.length ? (value as BusinessStatus) : null;
}

function normalizeBusinessStage(value: RegisterMemberInput["businessStage"]) {
  return value && value.length ? (value as BusinessStage) : null;
}

function hasEntitledSubscription(status: SubscriptionStatus | null | undefined) {
  if (!status) {
    return false;
  }

  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

function buildBusinessUpdateData(input: {
  businessName: string | null;
  businessStatus: BusinessStatus | null;
  companyNumber: string | null;
  businessStage: BusinessStage | null;
}) {
  const data: {
    companyName?: string;
    status?: BusinessStatus;
    companyNumber?: string;
    stage?: BusinessStage;
  } = {};

  if (input.businessName) {
    data.companyName = input.businessName;
  }

  if (input.businessStatus) {
    data.status = input.businessStatus;
  }

  if (input.companyNumber) {
    data.companyNumber = input.companyNumber;
  }

  if (input.businessStage) {
    data.stage = input.businessStage;
  }

  return data;
}

function buildProfileCreateData(input: {
  businessName: string | null;
  businessStatus: BusinessStatus | null;
  companyNumber: string | null;
  businessStage: BusinessStage | null;
}) {
  const shouldCreateBusiness =
    Boolean(input.businessName) ||
    Boolean(input.businessStatus) ||
    Boolean(input.companyNumber) ||
    Boolean(input.businessStage);

  return {
    collaborationTags: [],
    ...(shouldCreateBusiness
      ? {
          business: {
            create: {
              companyName: input.businessName,
              status: input.businessStatus,
              companyNumber: input.companyNumber,
              stage: input.businessStage
            }
          }
        }
      : {})
  };
}

function buildExistingUserUpdateData(input: {
  fullName: string;
  passwordHash: string;
  selectedTier: MembershipTier;
  businessName: string | null;
  businessStatus: BusinessStatus | null;
  companyNumber: string | null;
  businessStage: BusinessStage | null;
}) {
  const businessData = buildBusinessUpdateData({
    businessName: input.businessName,
    businessStatus: input.businessStatus,
    companyNumber: input.companyNumber,
    businessStage: input.businessStage
  });
  const shouldUpdateBusiness = Object.keys(businessData).length > 0;

  return {
    name: input.fullName,
    passwordHash: input.passwordHash,
    role: roleForTier(input.selectedTier),
    membershipTier: input.selectedTier,
    ...(shouldUpdateBusiness
      ? {
          profile: {
            upsert: {
              create: buildProfileCreateData({
                businessName: input.businessName,
                businessStatus: input.businessStatus,
                companyNumber: input.companyNumber,
                businessStage: input.businessStage
              }),
              update: {
                business: {
                  upsert: {
                    create: businessData,
                    update: businessData
                  }
                }
              }
            }
          }
        }
      : {})
  };
}

function toPendingRegistrationRecord(
  input: RegisterMemberInput,
  email: string,
  passwordHash: string
) {
  return {
    email,
    fullName: input.name,
    passwordHash,
    selectedTier: input.tier,
    billingInterval: toPendingRegistrationBillingInterval(input.billingInterval),
    businessName: input.businessName?.trim() || null,
    businessStatus: normalizeBusinessStatus(input.businessStatus),
    businessStage: normalizeBusinessStage(input.businessStage),
    companyNumber: input.companyNumber?.trim() || null,
    coreAccessConfirmed: Boolean(input.coreAccessConfirmed),
    inviteCode: input.inviteCode?.trim().toUpperCase() || null
  };
}

function buildPendingRegistrationUpdate(input: {
  stripeCheckoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  completedUserId?: string | null;
  status?: PendingRegistrationStatus;
}) {
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(typeof input.completedUserId === "string"
      ? {
          completedUserId: input.completedUserId
        }
      : {}),
    ...(typeof input.stripeCheckoutSessionId === "string"
      ? {
          stripeCheckoutSessionId: input.stripeCheckoutSessionId
        }
      : {}),
    ...(typeof input.stripeCustomerId === "string"
      ? {
          stripeCustomerId: input.stripeCustomerId
        }
      : {}),
    ...(typeof input.stripeSubscriptionId === "string"
      ? {
          stripeSubscriptionId: input.stripeSubscriptionId
        }
      : {})
  };
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
      "Welcome to The Business Circle. You are in the right place.",
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

async function cleanupExpiredPendingRegistrations() {
  await prisma.pendingRegistration.updateMany({
    where: {
      status: PendingRegistrationStatus.PENDING,
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: PendingRegistrationStatus.EXPIRED
    }
  });
}

async function cancelSupersededPendingRegistrations(email: string) {
  const registrations = await prisma.pendingRegistration.findMany({
    where: {
      email,
      status: PendingRegistrationStatus.PENDING
    },
    select: {
      id: true,
      stripeCheckoutSessionId: true
    }
  });

  if (!registrations.length) {
    return;
  }

  const stripe =
    process.env.STRIPE_SECRET_KEY && registrations.some((item) => item.stripeCheckoutSessionId)
      ? requireStripeClient()
      : null;

  if (stripe) {
    await Promise.allSettled(
      registrations.map(async (registration) => {
        if (!registration.stripeCheckoutSessionId) {
          return;
        }

        await stripe.checkout.sessions.expire(registration.stripeCheckoutSessionId);
      })
    );
  }

  const registrationIds = registrations.map((item) => item.id);
  const releasedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.pendingRegistration.updateMany({
      where: {
        id: {
          in: registrationIds
        }
      },
      data: {
        status: PendingRegistrationStatus.CANCELLED
      }
    });

    await tx.foundingOfferReservation.updateMany({
      where: {
        pendingRegistrationId: {
          in: registrationIds
        },
        status: FoundingReservationStatus.ACTIVE
      },
      data: {
        status: FoundingReservationStatus.RELEASED,
        releasedAt
      }
    });
  });
}

export function toPendingRegistrationBillingInterval(
  interval: MembershipBillingIntervalValue
): PendingRegistrationBillingInterval {
  return interval === "annual"
    ? PendingRegistrationBillingInterval.ANNUAL
    : PendingRegistrationBillingInterval.MONTHLY;
}

export function fromPendingRegistrationBillingInterval(
  interval: PendingRegistrationBillingInterval
): MembershipBillingInterval {
  return interval === PendingRegistrationBillingInterval.ANNUAL ? "annual" : "monthly";
}

export async function createPendingRegistration(
  rawInput: unknown
): Promise<CreatePendingRegistrationResult> {
  await cleanupExpiredPendingRegistrations();

  const parsed = registerMemberSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new RegistrationServiceError("INVALID_INPUT", "Invalid registration payload.");
  }

  const input = parsed.data;
  const email = normalizeEmail(input.email);

  const [existingUser, paymentInProgress] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        suspended: true,
        subscription: {
          select: {
            status: true
          }
        }
      }
    }),
    prisma.pendingRegistration.findFirst({
      where: {
        email,
        status: PendingRegistrationStatus.PAID
      },
      select: {
        id: true
      }
    })
  ]);

  if (
    existingUser &&
    (existingUser.suspended ||
      Boolean(existingUser.passwordHash) ||
      existingUser.role === Role.ADMIN ||
      hasEntitledSubscription(existingUser.subscription?.status))
  ) {
    throw new RegistrationServiceError(
      "EMAIL_IN_USE",
      "An account already exists with this email. Sign in or reset your password to continue."
    );
  }

  if (paymentInProgress) {
    throw new RegistrationServiceError(
      "PAYMENT_IN_PROGRESS",
      "Payment is already being confirmed for this email. Return to the confirmation page or wait a moment and try signing in."
    );
  }

  const passwordHash = await hashPassword(input.password);
  const normalizedRecord = toPendingRegistrationRecord(input, email, passwordHash);
  const expiresAt = new Date(
    Date.now() + resolvePendingRegistrationTtlHours() * 60 * 60 * 1000
  );

  try {
    await cancelSupersededPendingRegistrations(email);

    const pendingRegistration = await prisma.pendingRegistration.create({
      data: {
        ...normalizedRecord,
        expiresAt
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        selectedTier: true,
        billingInterval: true,
        coreAccessConfirmed: true,
        inviteCode: true
      }
    });

    return {
      pendingRegistration: {
        id: pendingRegistration.id,
        email: pendingRegistration.email,
        fullName: pendingRegistration.fullName,
        selectedTier: pendingRegistration.selectedTier,
        billingInterval: fromPendingRegistrationBillingInterval(
          pendingRegistration.billingInterval
        ),
        coreAccessConfirmed: pendingRegistration.coreAccessConfirmed,
        inviteCode: pendingRegistration.inviteCode
      }
    };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw new RegistrationServiceError(
        "EMAIL_IN_USE",
        "An account already exists with this email. Sign in or reset your password to continue."
      );
    }

    throw new RegistrationServiceError(
      "CREATE_FAILED",
      "Unable to start registration."
    );
  }
}

export async function provisionUserFromPendingRegistration(input: {
  pendingRegistrationId: string;
  stripeCheckoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<ProvisionPendingRegistrationResult | null> {
  await cleanupExpiredPendingRegistrations();

  return prisma.$transaction(async (tx) => {
    const pendingRegistration = await tx.pendingRegistration.findUnique({
      where: {
        id: input.pendingRegistrationId
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        selectedTier: true,
        billingInterval: true,
        businessName: true,
        businessStatus: true,
        businessStage: true,
        companyNumber: true,
        coreAccessConfirmed: true,
        inviteCode: true,
        status: true,
        completedUserId: true
      }
    });

    if (!pendingRegistration) {
      return null;
    }

    if (
      pendingRegistration.status === PendingRegistrationStatus.CANCELLED ||
      pendingRegistration.status === PendingRegistrationStatus.EXPIRED
    ) {
      return null;
    }

    const existingUser =
      pendingRegistration.completedUserId
        ? await tx.user.findUnique({
            where: {
              id: pendingRegistration.completedUserId
            },
            select: {
              id: true,
              email: true,
              name: true
            }
          })
        : await tx.user.findUnique({
            where: {
              email: pendingRegistration.email
            },
            select: {
              id: true,
              email: true,
              name: true
            }
          });

    const user =
      existingUser
        ? await tx.user.update({
            where: {
              id: existingUser.id
            },
            data: buildExistingUserUpdateData({
              fullName: pendingRegistration.fullName,
              passwordHash: pendingRegistration.passwordHash,
              selectedTier: pendingRegistration.selectedTier,
              businessName: pendingRegistration.businessName,
              businessStatus: pendingRegistration.businessStatus,
              companyNumber: pendingRegistration.companyNumber,
              businessStage: pendingRegistration.businessStage
            }),
            select: {
              id: true,
              email: true,
              name: true
            }
          })
        : await tx.user.create({
            data: {
              name: pendingRegistration.fullName,
              email: pendingRegistration.email,
              passwordHash: pendingRegistration.passwordHash,
              role: roleForTier(pendingRegistration.selectedTier),
              membershipTier: pendingRegistration.selectedTier,
              profile: {
                create: buildProfileCreateData({
                  businessName: pendingRegistration.businessName,
                  businessStatus: pendingRegistration.businessStatus,
                  companyNumber: pendingRegistration.companyNumber,
                  businessStage: pendingRegistration.businessStage
                })
              }
            },
            select: {
              id: true,
              email: true,
              name: true
            }
          });

    if (
      pendingRegistration.status === PendingRegistrationStatus.COMPLETED &&
      existingUser
    ) {
      return {
        pendingRegistrationId: pendingRegistration.id,
        user,
        fullName: pendingRegistration.fullName,
        selectedTier: pendingRegistration.selectedTier,
        billingInterval: fromPendingRegistrationBillingInterval(
          pendingRegistration.billingInterval
        ),
        inviteCode: pendingRegistration.inviteCode
      };
    }

    await tx.pendingRegistration.update({
      where: {
        id: pendingRegistration.id
      },
      data: buildPendingRegistrationUpdate({
        status: PendingRegistrationStatus.PAID,
        completedUserId: user.id,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId
      })
    });

    return {
      pendingRegistrationId: pendingRegistration.id,
      user,
      fullName: pendingRegistration.fullName,
      selectedTier: pendingRegistration.selectedTier,
      billingInterval: fromPendingRegistrationBillingInterval(
        pendingRegistration.billingInterval
      ),
      inviteCode: pendingRegistration.inviteCode
    };
  });
}

export async function markPendingRegistrationCompleted(input: {
  pendingRegistrationId: string;
  userId: string;
  stripeCheckoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const result = await prisma.pendingRegistration.updateMany({
    where: {
      id: input.pendingRegistrationId,
      status: {
        in: [PendingRegistrationStatus.PENDING, PendingRegistrationStatus.PAID]
      }
    },
    data: buildPendingRegistrationUpdate({
      status: PendingRegistrationStatus.COMPLETED,
      completedUserId: input.userId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId
    })
  });

  return result.count > 0;
}

export async function finalizePendingRegistrationAccess(input: {
  pendingRegistrationId: string;
  userId: string;
  email: string;
  fullName: string;
  selectedTier: MembershipTier;
  inviteCode?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  await recordInviteReferral({
    inviteCode: input.inviteCode ?? null,
    referredUserId: input.userId,
    subscriptionTier: input.selectedTier
  });

  const completed = await markPendingRegistrationCompleted({
    pendingRegistrationId: input.pendingRegistrationId,
    userId: input.userId,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId
  });

  if (!completed) {
    return false;
  }

  const firstName = input.fullName.trim().split(/\s+/)[0] || "Member";
  await Promise.allSettled([
    sendWelcomeMemberEmail({
      email: input.email,
      firstName,
      tier: input.selectedTier
    }),
    sendEmailVerificationForUser({
      userId: input.userId,
      email: input.email,
      firstName
    })
  ]);

  return true;
}

export async function getPendingRegistrationStatusByCheckoutSessionId(
  checkoutSessionId: string
): Promise<PendingRegistrationPublicStatus | null> {
  await cleanupExpiredPendingRegistrations();

  const pendingRegistration = await prisma.pendingRegistration.findUnique({
    where: {
      stripeCheckoutSessionId: checkoutSessionId
    },
    select: {
      status: true,
      email: true,
      fullName: true,
      selectedTier: true,
      billingInterval: true
    }
  });

  if (!pendingRegistration) {
    return null;
  }

  return {
    status: pendingRegistration.status,
    email: pendingRegistration.email,
    fullName: pendingRegistration.fullName,
    selectedTier: pendingRegistration.selectedTier,
    billingInterval: fromPendingRegistrationBillingInterval(
      pendingRegistration.billingInterval
    )
  };
}
