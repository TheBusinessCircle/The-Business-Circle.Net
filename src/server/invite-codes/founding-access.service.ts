import { InviteCodeStatus, MembershipTier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const SERIALIZABLE_RETRY_ATTEMPTS = 3;
const FOUNDING_ACCESS_DEFAULT_CODE = "FOUNDING25";

export type InviteCodeValidationResult =
  | {
      valid: true;
      inviteCode: {
        id: string;
        code: string;
        name: string | null;
        trialDays: number;
        discountPercent: number | null;
        discountDuration: string | null;
        stripePromotionCodeId: string | null;
        remainingUses: number | null;
      };
    }
  | {
      valid: false;
      reason:
        | "missing"
        | "inactive"
        | "expired"
        | "limit-reached"
        | "tier-ineligible";
    };

type ClaimInviteCodeInput = {
  code?: string | null;
  email: string;
  tier: MembershipTier;
  stripeSessionId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  userId?: string | null;
  pendingRegistrationId?: string | null;
  trialEndsAt?: Date | null;
};

function isSerializableConflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function runSerializableInviteTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (!isSerializableConflictError(error) || attempt === SERIALIZABLE_RETRY_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Unable to complete invite-code transaction.");
}

export function normalizeInviteCode(code?: string | null) {
  return code?.trim().toUpperCase() || null;
}

export async function validateInviteCodeForCheckout(input: {
  code?: string | null;
  tier: MembershipTier;
}): Promise<InviteCodeValidationResult> {
  const normalizedCode = normalizeInviteCode(input.code);
  if (!normalizedCode) {
    return { valid: false, reason: "missing" };
  }

  const inviteCode = await db.inviteCode.findUnique({
    where: {
      code: normalizedCode
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      maxRedemptions: true,
      successfulUses: true,
      trialDays: true,
      eligibleTiers: true,
      discountPercent: true,
      discountDuration: true,
      stripePromotionCodeId: true,
      expiresAt: true
    }
  });

  if (!inviteCode) {
    return { valid: false, reason: "missing" };
  }

  if (inviteCode.status !== InviteCodeStatus.ACTIVE) {
    return { valid: false, reason: "inactive" };
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  if (
    inviteCode.maxRedemptions !== null &&
    inviteCode.successfulUses >= inviteCode.maxRedemptions
  ) {
    return { valid: false, reason: "limit-reached" };
  }

  if (inviteCode.eligibleTiers.length && !inviteCode.eligibleTiers.includes(input.tier)) {
    return { valid: false, reason: "tier-ineligible" };
  }

  return {
    valid: true,
    inviteCode: {
      id: inviteCode.id,
      code: inviteCode.code,
      name: inviteCode.name,
      trialDays: inviteCode.trialDays,
      discountPercent: inviteCode.discountPercent,
      discountDuration: inviteCode.discountDuration,
      stripePromotionCodeId: inviteCode.stripePromotionCodeId,
      remainingUses:
        inviteCode.maxRedemptions === null
          ? null
          : Math.max(0, inviteCode.maxRedemptions - inviteCode.successfulUses)
    }
  };
}

export async function claimInviteCodeRedemption(input: ClaimInviteCodeInput) {
  const normalizedCode = normalizeInviteCode(input.code);
  if (!normalizedCode) {
    return null;
  }

  return runSerializableInviteTransaction(async (tx) => {
    const inviteCode = await tx.inviteCode.findUnique({
      where: {
        code: normalizedCode
      }
    });

    if (!inviteCode) {
      return null;
    }

    const existing = await tx.inviteCodeRedemption.findUnique({
      where: {
        stripeSessionId: input.stripeSessionId
      }
    });

    if (existing?.status === "COMPLETED") {
      return existing;
    }

    const validation = await validateInviteCodeForCheckout({
      code: normalizedCode,
      tier: input.tier
    });

    if (!validation.valid) {
      throw new Error(`invite-code-${validation.reason}`);
    }

    const limitFilter =
      inviteCode.maxRedemptions === null
        ? {}
        : {
            successfulUses: {
              lt: inviteCode.maxRedemptions
            }
          };

    const incremented = await tx.inviteCode.updateMany({
      where: {
        id: inviteCode.id,
        status: InviteCodeStatus.ACTIVE,
        ...limitFilter
      },
      data: {
        successfulUses: {
          increment: 1
        }
      }
    });

    if (incremented.count !== 1) {
      throw new Error("invite-code-limit-reached");
    }

    return tx.inviteCodeRedemption.upsert({
      where: {
        stripeSessionId: input.stripeSessionId
      },
      create: {
        inviteCodeId: inviteCode.id,
        userId: input.userId ?? null,
        pendingRegistrationId: input.pendingRegistrationId ?? null,
        email: input.email,
        tier: input.tier,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSessionId: input.stripeSessionId,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        status: "COMPLETED",
        trialEndsAt: input.trialEndsAt ?? null,
        completedAt: new Date()
      },
      update: {
        userId: input.userId ?? undefined,
        pendingRegistrationId: input.pendingRegistrationId ?? undefined,
        stripeCustomerId: input.stripeCustomerId ?? undefined,
        stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
        status: "COMPLETED",
        trialEndsAt: input.trialEndsAt ?? undefined,
        completedAt: new Date()
      }
    });
  });
}

export async function listInviteCodesForAdmin() {
  return db.inviteCode.findMany({
    include: {
      redemptions: {
        orderBy: {
          createdAt: "desc"
        },
        take: 25
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function upsertDefaultFoundingAccessCode(input?: {
  stripeCouponId?: string | null;
  stripePromotionCodeId?: string | null;
}) {
  return db.inviteCode.upsert({
    where: {
      code: FOUNDING_ACCESS_DEFAULT_CODE
    },
    update: {
      name: "Founding Access Pass",
      status: InviteCodeStatus.ACTIVE,
      maxRedemptions: 25,
      trialDays: 90,
      eligibleTiers: [
        MembershipTier.FOUNDATION,
        MembershipTier.INNER_CIRCLE,
        MembershipTier.CORE
      ],
      discountPercent: input?.stripePromotionCodeId ? 50 : null,
      discountDuration: input?.stripePromotionCodeId ? "forever" : null,
      stripeCouponId: input?.stripeCouponId ?? undefined,
      stripePromotionCodeId: input?.stripePromotionCodeId ?? undefined
    },
    create: {
      code: FOUNDING_ACCESS_DEFAULT_CODE,
      name: "Founding Access Pass",
      status: InviteCodeStatus.ACTIVE,
      maxRedemptions: 25,
      trialDays: 90,
      eligibleTiers: [
        MembershipTier.FOUNDATION,
        MembershipTier.INNER_CIRCLE,
        MembershipTier.CORE
      ],
      discountPercent: input?.stripePromotionCodeId ? 50 : null,
      discountDuration: input?.stripePromotionCodeId ? "forever" : null,
      stripeCouponId: input?.stripeCouponId ?? null,
      stripePromotionCodeId: input?.stripePromotionCodeId ?? null
    }
  });
}
