import {
  LaunchCodeRedemptionStatus,
  LaunchCodeStatus,
  MembershipTier,
  Prisma
} from "@prisma/client";
import type Stripe from "stripe";
import { formatMembershipPrice, getMembershipTierPricing } from "@/config/membership";
import { db } from "@/lib/db";

const RESERVATION_MINUTES = 30;
const SERIALIZABLE_RETRY_ATTEMPTS = 3;

const SUCCESSFUL_REDEMPTION_STATUSES = [
  LaunchCodeRedemptionStatus.CHECKOUT_COMPLETED,
  LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING,
  LaunchCodeRedemptionStatus.SUBSCRIPTION_ACTIVE
] as const;

const ACTIVE_RESERVATION_STATUSES = [
  LaunchCodeRedemptionStatus.CODE_ENTERED,
  LaunchCodeRedemptionStatus.CHECKOUT_STARTED
] as const;

export const DEFAULT_LAUNCH_CODES = [
  {
    name: "Facebook Founder Access",
    code: "FACEBOOK25",
    platform: "FACEBOOK",
    maxRedemptions: 25,
    trialDays: 90,
    status: LaunchCodeStatus.ACTIVE
  },
  {
    name: "TikTok Founder Access",
    code: "TIKTOK25",
    platform: "TIKTOK",
    maxRedemptions: 25,
    trialDays: 90,
    status: LaunchCodeStatus.ACTIVE
  },
  {
    name: "Instagram Founder Access",
    code: "INSTAGRAM25",
    platform: "INSTAGRAM",
    maxRedemptions: 25,
    trialDays: 90,
    status: LaunchCodeStatus.ACTIVE
  },
  {
    name: "LinkedIn Founder Access",
    code: "LINKEDIN25",
    platform: "LINKEDIN",
    maxRedemptions: 25,
    trialDays: 90,
    status: LaunchCodeStatus.ACTIVE
  }
] as const;

export type LaunchCodeValidationResult =
  | {
      valid: true;
      launchCode: {
        id: string;
        code: string;
        name: string;
        platform: string;
        trialDays: number;
        maxRedemptions: number;
        remainingUses: number;
      };
    }
  | {
      valid: false;
      reason:
        | "missing"
        | "invalid"
        | "paused"
        | "full"
        | "expired"
        | "archived"
        | "not-started"
        | "already-used";
    };

export type LaunchCodeReservation = {
  id: string;
  launchCodeId: string;
  code: string;
  platform: string;
  trialDays: number;
};

type ReserveLaunchCodeInput = {
  code?: string | null;
  selectedTier: MembershipTier;
  email?: string | null;
  userId?: string | null;
  stripeCustomerId?: string | null;
  sourcePath?: string | null;
  referrer?: string | null;
  visitorId?: string | null;
};

export type CreateLaunchCodeInput = {
  code: string;
  name: string;
  platform: string;
  maxRedemptions?: number;
  trialDays?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  description?: string | null;
  createdById?: string | null;
};

export type UpdateLaunchCodeInput = Partial<Omit<CreateLaunchCodeInput, "createdById">> & {
  status?: LaunchCodeStatus;
};

function isSerializableConflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function runSerializableLaunchCodeTransaction<T>(
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

  throw new Error("Unable to complete launch-code transaction.");
}

function normalizeLaunchCode(code?: string | null) {
  return code?.trim().toUpperCase() || null;
}

function toStripeObjectId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function statusFromStripeSubscription(status: Stripe.Subscription.Status) {
  if (status === "trialing") return LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING;
  if (status === "active") return LaunchCodeRedemptionStatus.SUBSCRIPTION_ACTIVE;
  if (status === "canceled") return LaunchCodeRedemptionStatus.SUBSCRIPTION_CANCELLED;
  return null;
}

function validateCodeWindow(launchCode: {
  status: LaunchCodeStatus;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const now = new Date();
  if (launchCode.status === LaunchCodeStatus.PAUSED) return "paused";
  if (launchCode.status === LaunchCodeStatus.FULL) return "full";
  if (launchCode.status === LaunchCodeStatus.EXPIRED) return "expired";
  if (launchCode.status === LaunchCodeStatus.ARCHIVED) return "archived";
  if (launchCode.startsAt && launchCode.startsAt > now) return "not-started";
  if (launchCode.endsAt && launchCode.endsAt <= now) return "expired";
  return null;
}

async function countSuccessfulRedemptions(
  client: Prisma.TransactionClient,
  launchCodeId: string
) {
  return client.launchCodeRedemption.count({
    where: {
      launchCodeId,
      status: {
        in: [...SUCCESSFUL_REDEMPTION_STATUSES]
      }
    }
  });
}

async function countActiveReservations(
  client: Prisma.TransactionClient,
  launchCodeId: string
) {
  return client.launchCodeRedemption.count({
    where: {
      launchCodeId,
      status: {
        in: [...ACTIVE_RESERVATION_STATUSES]
      },
      reservationExpiresAt: {
        gt: new Date()
      }
    }
  });
}

async function hasDuplicateSuccessfulRedemption(input: {
  client: Prisma.TransactionClient;
  launchCodeId: string;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
}) {
  const OR: Prisma.LaunchCodeRedemptionWhereInput[] = [];
  if (input.userId) OR.push({ userId: input.userId });
  if (input.email) OR.push({ email: input.email.trim().toLowerCase() });
  if (input.stripeCustomerId) OR.push({ stripeCustomerId: input.stripeCustomerId });

  if (!OR.length) {
    return false;
  }

  const existing = await input.client.launchCodeRedemption.findFirst({
    where: {
      launchCodeId: input.launchCodeId,
      status: {
        in: [...SUCCESSFUL_REDEMPTION_STATUSES]
      },
      OR
    },
    select: {
      id: true
    }
  });

  return Boolean(existing);
}

export async function expireOldLaunchCodeReservations() {
  await db.launchCodeRedemption.updateMany({
    where: {
      status: {
        in: [...ACTIVE_RESERVATION_STATUSES]
      },
      reservationExpiresAt: {
        lte: new Date()
      }
    },
    data: {
      status: LaunchCodeRedemptionStatus.EXPIRED
    }
  });
}

export async function validateLaunchCode(input: {
  code?: string | null;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
}): Promise<LaunchCodeValidationResult> {
  await expireOldLaunchCodeReservations();

  const code = normalizeLaunchCode(input.code);
  if (!code) {
    return { valid: false, reason: "missing" };
  }

  const launchCode = await db.launchCode.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      platform: true,
      status: true,
      maxRedemptions: true,
      trialDays: true,
      startsAt: true,
      endsAt: true
    }
  });

  if (!launchCode) {
    return { valid: false, reason: "invalid" };
  }

  const inactiveReason = validateCodeWindow(launchCode);
  if (inactiveReason) {
    return { valid: false, reason: inactiveReason };
  }

  const [successfulUses, duplicateUsed] = await db.$transaction(async (tx) => {
    const successful = await countSuccessfulRedemptions(tx, launchCode.id);
    const duplicate = await hasDuplicateSuccessfulRedemption({
      client: tx,
      launchCodeId: launchCode.id,
      userId: input.userId,
      email: input.email,
      stripeCustomerId: input.stripeCustomerId
    });
    return [successful, duplicate] as const;
  });

  if (duplicateUsed) {
    return { valid: false, reason: "already-used" };
  }

  if (successfulUses >= launchCode.maxRedemptions) {
    await db.launchCode.updateMany({
      where: { id: launchCode.id, status: LaunchCodeStatus.ACTIVE },
      data: { status: LaunchCodeStatus.FULL }
    });
    return { valid: false, reason: "full" };
  }

  return {
    valid: true,
    launchCode: {
      id: launchCode.id,
      code: launchCode.code,
      name: launchCode.name,
      platform: launchCode.platform,
      trialDays: launchCode.trialDays,
      maxRedemptions: launchCode.maxRedemptions,
      remainingUses: Math.max(0, launchCode.maxRedemptions - successfulUses)
    }
  };
}

export async function reserveLaunchCodePlace(
  input: ReserveLaunchCodeInput
): Promise<LaunchCodeReservation | null> {
  await expireOldLaunchCodeReservations();
  const normalizedCode = normalizeLaunchCode(input.code);
  if (!normalizedCode) {
    return null;
  }

  return runSerializableLaunchCodeTransaction(async (tx) => {
    const launchCode = await tx.launchCode.findUnique({
      where: { code: normalizedCode }
    });

    if (!launchCode) {
      throw new Error("launch-code-invalid");
    }

    const inactiveReason = validateCodeWindow(launchCode);
    if (inactiveReason) {
      throw new Error(`launch-code-${inactiveReason}`);
    }

    const duplicate = await hasDuplicateSuccessfulRedemption({
      client: tx,
      launchCodeId: launchCode.id,
      userId: input.userId,
      email: input.email,
      stripeCustomerId: input.stripeCustomerId
    });
    if (duplicate) {
      throw new Error("launch-code-already-used");
    }

    const [successfulUses, activeReservations] = await Promise.all([
      countSuccessfulRedemptions(tx, launchCode.id),
      countActiveReservations(tx, launchCode.id)
    ]);

    if (successfulUses >= launchCode.maxRedemptions) {
      await tx.launchCode.update({
        where: { id: launchCode.id },
        data: { status: LaunchCodeStatus.FULL }
      });
      throw new Error("launch-code-full");
    }

    if (successfulUses + activeReservations >= launchCode.maxRedemptions) {
      throw new Error("launch-code-full");
    }

    const reservedAt = new Date();
    const reservationExpiresAt = new Date(
      reservedAt.getTime() + RESERVATION_MINUTES * 60 * 1000
    );
    const redemption = await tx.launchCodeRedemption.create({
      data: {
        launchCodeId: launchCode.id,
        userId: input.userId ?? null,
        email: input.email?.trim().toLowerCase() ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
        tierSelected: input.selectedTier,
        status: LaunchCodeRedemptionStatus.CHECKOUT_STARTED,
        sourcePlatform: launchCode.platform,
        sourcePath: input.sourcePath ?? null,
        referrer: input.referrer ?? null,
        visitorId: input.visitorId ?? null,
        reservedAt,
        reservationExpiresAt
      }
    });

    await tx.siteEvent.create({
      data: {
        userId: input.userId ?? undefined,
        visitorId: input.visitorId ?? undefined,
        eventName: "launch_code_checkout_started",
        path: input.sourcePath ?? "/checkout",
        metadata: {
          code: launchCode.code,
          platform: launchCode.platform,
          selectedTier: input.selectedTier,
          launchCodeId: launchCode.id,
          trialDays: launchCode.trialDays
        }
      }
    }).catch(() => null);

    return {
      id: redemption.id,
      launchCodeId: launchCode.id,
      code: launchCode.code,
      platform: launchCode.platform,
      trialDays: launchCode.trialDays
    };
  });
}

export async function attachLaunchCodeReservationToCheckoutSession(input: {
  redemptionId: string;
  stripeCheckoutSessionId: string;
  stripeCustomerId?: string | null;
}) {
  await db.launchCodeRedemption.update({
    where: { id: input.redemptionId },
    data: {
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      status: LaunchCodeRedemptionStatus.CHECKOUT_STARTED
    }
  });
}

export async function failLaunchCodeReservation(redemptionId?: string | null) {
  if (!redemptionId) {
    return;
  }

  await db.launchCodeRedemption.updateMany({
    where: {
      id: redemptionId,
      status: {
        in: [...ACTIVE_RESERVATION_STATUSES]
      }
    },
    data: {
      status: LaunchCodeRedemptionStatus.FAILED
    }
  });
}

export async function completeLaunchCodeRedemptionFromStripe(
  session: Stripe.Checkout.Session
) {
  const launchCodeId = session.metadata?.launchCodeId ?? null;
  const launchCodeValue = session.metadata?.launchCode ?? null;
  if (!launchCodeId && !launchCodeValue) {
    return null;
  }

  const subscriptionId = toStripeObjectId(
    session.subscription as string | { id?: string } | null
  );
  const customerId = toStripeObjectId(session.customer as string | { id?: string } | null);
  const pendingRegistrationId = session.metadata?.pendingRegistrationId ?? null;
  const pendingRegistration = pendingRegistrationId
    ? await db.pendingRegistration.findUnique({
        where: { id: pendingRegistrationId },
        select: { completedUserId: true }
      })
    : null;
  const userId = session.metadata?.userId ?? pendingRegistration?.completedUserId ?? null;
  const email =
    session.customer_details?.email?.trim().toLowerCase() ??
    session.customer_email?.trim().toLowerCase() ??
    null;
  const selectedTier =
    session.metadata?.selectedTier === MembershipTier.INNER_CIRCLE ||
    session.metadata?.selectedTier === MembershipTier.CORE ||
    session.metadata?.selectedTier === MembershipTier.FOUNDATION
      ? session.metadata.selectedTier
      : undefined;

  const redemption = await db.launchCodeRedemption.upsert({
    where: {
      stripeCheckoutSessionId: session.id
    },
    create: {
      launchCodeId:
        launchCodeId ??
        (
          await db.launchCode.findUniqueOrThrow({
            where: { code: normalizeLaunchCode(launchCodeValue) ?? "" },
            select: { id: true }
          })
        ).id,
      userId,
      email,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
      tierSelected: selectedTier,
      status: LaunchCodeRedemptionStatus.CHECKOUT_COMPLETED,
      sourcePlatform: session.metadata?.sourcePlatform ?? null,
      completedAt: new Date()
    },
    update: {
      userId: userId ?? undefined,
      email: email ?? undefined,
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      tierSelected: selectedTier,
      status: LaunchCodeRedemptionStatus.CHECKOUT_COMPLETED,
      completedAt: new Date()
    },
    select: {
      id: true,
      launchCodeId: true
    }
  });

  await markLaunchCodeFullIfNeeded(redemption.launchCodeId);
  await db.siteEvent.create({
    data: {
      userId: userId ?? undefined,
      eventName: "launch_code_checkout_completed",
      path: "/checkout",
      metadata: {
        code: launchCodeValue,
        platform: session.metadata?.sourcePlatform ?? null,
        selectedTier: selectedTier ?? null,
        launchCodeId: redemption.launchCodeId,
        trialDays: session.metadata?.trialDays ?? null
      }
    }
  }).catch(() => null);

  return redemption;
}

export async function updateLaunchCodeSubscriptionFromStripe(
  subscription: Stripe.Subscription
) {
  const launchCodeId = subscription.metadata?.launchCodeId ?? null;
  const launchCodeValue = subscription.metadata?.launchCode ?? null;
  if (!launchCodeId && !launchCodeValue) {
    return null;
  }

  const nextStatus = statusFromStripeSubscription(subscription.status);
  if (!nextStatus) {
    return null;
  }

  const customerId = toStripeObjectId(subscription.customer as string | { id?: string } | null);
  const code = normalizeLaunchCode(launchCodeValue);
  const launchCode = launchCodeId
    ? { id: launchCodeId }
    : code
      ? await db.launchCode.findUnique({ where: { code }, select: { id: true } })
      : null;

  if (!launchCode) {
    return null;
  }

  const redemption = await db.launchCodeRedemption.findFirst({
    where: {
      launchCodeId: launchCode.id,
      OR: [
        { stripeSubscriptionId: subscription.id },
        ...(customerId ? [{ stripeCustomerId: customerId }] : [])
      ]
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (!redemption) {
    return null;
  }

  const updated = await db.launchCodeRedemption.update({
    where: { id: redemption.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId ?? undefined,
      status: nextStatus,
      completedAt:
        nextStatus === LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING ||
        nextStatus === LaunchCodeRedemptionStatus.SUBSCRIPTION_ACTIVE
          ? new Date()
          : undefined
    }
  });

  await markLaunchCodeFullIfNeeded(launchCode.id);

  if (
    nextStatus === LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING ||
    nextStatus === LaunchCodeRedemptionStatus.SUBSCRIPTION_ACTIVE
  ) {
    await db.siteEvent.create({
      data: {
        eventName:
          nextStatus === LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING
            ? "launch_code_subscription_trialing"
            : "launch_code_subscription_active",
        path: "/checkout",
        metadata: {
          code,
          platform: subscription.metadata?.sourcePlatform ?? null,
          selectedTier: subscription.metadata?.selectedTier ?? null,
          launchCodeId: launchCode.id,
          trialDays: subscription.metadata?.trialDays ?? null
        }
      }
    }).catch(() => null);
  }

  return updated;
}

async function markLaunchCodeFullIfNeeded(launchCodeId: string) {
  const launchCode = await db.launchCode.findUnique({
    where: { id: launchCodeId },
    select: { maxRedemptions: true, status: true }
  });

  if (!launchCode || launchCode.status !== LaunchCodeStatus.ACTIVE) {
    return;
  }

  const completed = await db.launchCodeRedemption.count({
    where: {
      launchCodeId,
      status: {
        in: [...SUCCESSFUL_REDEMPTION_STATUSES]
      }
    }
  });

  if (completed >= launchCode.maxRedemptions) {
    await db.launchCode.update({
      where: { id: launchCodeId },
      data: { status: LaunchCodeStatus.FULL }
    });
  }
}

export async function seedDefaultLaunchCodes() {
  return Promise.all(
    DEFAULT_LAUNCH_CODES.map((launchCode) =>
      db.launchCode.upsert({
        where: { code: launchCode.code },
        update: {
          name: launchCode.name,
          platform: launchCode.platform,
          maxRedemptions: launchCode.maxRedemptions,
          trialDays: launchCode.trialDays
        },
        create: launchCode
      })
    )
  );
}

export async function getLaunchCodeByCode(code: string) {
  return db.launchCode.findUnique({
    where: { code: normalizeLaunchCode(code) ?? "" },
    include: { redemptions: true }
  });
}

export async function getLaunchCodes() {
  await expireOldLaunchCodeReservations();
  return db.launchCode.findMany({
    include: {
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }]
  });
}

export async function createLaunchCode(input: CreateLaunchCodeInput) {
  return db.launchCode.create({
    data: {
      code: normalizeLaunchCode(input.code) ?? "",
      name: input.name.trim(),
      platform: input.platform.trim().toUpperCase(),
      maxRedemptions: input.maxRedemptions ?? 25,
      trialDays: input.trialDays ?? 90,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      description: input.description?.trim() || null,
      createdById: input.createdById ?? null
    }
  });
}

export async function updateLaunchCode(id: string, input: UpdateLaunchCodeInput) {
  const existingRedemptions = await db.launchCodeRedemption.count({ where: { launchCodeId: id } });
  return db.launchCode.update({
    where: { id },
    data: {
      ...(input.code && existingRedemptions === 0
        ? { code: normalizeLaunchCode(input.code) ?? undefined }
        : {}),
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.platform ? { platform: input.platform.trim().toUpperCase() } : {}),
      ...(typeof input.maxRedemptions === "number" ? { maxRedemptions: input.maxRedemptions } : {}),
      ...(typeof input.trialDays === "number" ? { trialDays: input.trialDays } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.status ? { status: input.status } : {})
    }
  });
}

export async function pauseLaunchCode(id: string) {
  return updateLaunchCode(id, { status: LaunchCodeStatus.PAUSED });
}

export async function activateLaunchCode(id: string) {
  return updateLaunchCode(id, { status: LaunchCodeStatus.ACTIVE });
}

export async function archiveLaunchCode(id: string) {
  return updateLaunchCode(id, { status: LaunchCodeStatus.ARCHIVED });
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function estimateRevenue(redemptions: Array<{ tierSelected: MembershipTier | null }>) {
  return redemptions.reduce(
    (totals, redemption) => {
      if (!redemption.tierSelected) {
        return totals;
      }
      const pricing = getMembershipTierPricing(redemption.tierSelected);
      totals.monthly += pricing.standardMonthlyPrice;
      totals.annual += pricing.standardAnnualPrice;
      return totals;
    },
    { monthly: 0, annual: 0 }
  );
}

export async function getLaunchCodeStats() {
  const codes = await getLaunchCodes();
  const allRedemptions = codes.flatMap((code) => code.redemptions);
  const successful = allRedemptions.filter((redemption) =>
    SUCCESSFUL_REDEMPTION_STATUSES.includes(redemption.status as (typeof SUCCESSFUL_REDEMPTION_STATUSES)[number])
  );
  const checkoutStarts = allRedemptions.filter(
    (redemption) => redemption.status !== LaunchCodeRedemptionStatus.CODE_ENTERED
  ).length;
  const revenue = estimateRevenue(successful);
  const byPlatform = new Map<string, number>();
  const byTier = new Map<string, number>();

  for (const redemption of successful) {
    byPlatform.set(redemption.sourcePlatform ?? "Unknown", (byPlatform.get(redemption.sourcePlatform ?? "Unknown") ?? 0) + 1);
    if (redemption.tierSelected) {
      byTier.set(redemption.tierSelected, (byTier.get(redemption.tierSelected) ?? 0) + 1);
    }
  }

  return {
    totalCodes: codes.length,
    activeCodes: codes.filter((code) => code.status === LaunchCodeStatus.ACTIVE).length,
    totalPlacesAvailable: codes.reduce((total, code) => total + code.maxRedemptions, 0),
    totalPlacesUsed: successful.length,
    totalPlacesRemaining: Math.max(
      0,
      codes.reduce((total, code) => total + code.maxRedemptions, 0) - successful.length
    ),
    totalCheckoutStarts: checkoutStarts,
    totalCompletedJoins: successful.length,
    bestPerformingPlatform:
      Array.from(byPlatform.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not enough data",
    mostSelectedTier:
      Array.from(byTier.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not enough data",
    estimatedMonthlyRevenueAfterTrials: formatMembershipPrice(revenue.monthly),
    estimatedAnnualRevenueAfterTrials: formatMembershipPrice(revenue.annual)
  };
}

export async function getLaunchCodesDashboard() {
  const [codes, stats] = await Promise.all([getLaunchCodes(), getLaunchCodeStats()]);
  const codeSummaries = codes.map((code) => {
    const successful = code.redemptions.filter((redemption) =>
      SUCCESSFUL_REDEMPTION_STATUSES.includes(redemption.status as (typeof SUCCESSFUL_REDEMPTION_STATUSES)[number])
    );
    const checkoutStarts = code.redemptions.filter(
      (redemption) => redemption.status !== LaunchCodeRedemptionStatus.CODE_ENTERED
    ).length;

    return {
      ...code,
      placesUsed: successful.length,
      placesRemaining: Math.max(0, code.maxRedemptions - successful.length),
      checkoutStarts,
      completedJoins: successful.length,
      conversionRate: percent(successful.length, checkoutStarts),
      foundationJoins: successful.filter((item) => item.tierSelected === MembershipTier.FOUNDATION).length,
      innerCircleJoins: successful.filter((item) => item.tierSelected === MembershipTier.INNER_CIRCLE).length,
      coreJoins: successful.filter((item) => item.tierSelected === MembershipTier.CORE).length,
      lastUsed: successful[0]?.createdAt ?? null
    };
  });

  return {
    stats,
    codes: codeSummaries,
    recentRedemptions: codes
      .flatMap((code) =>
        code.redemptions.map((redemption) => ({
          ...redemption,
          code: code.code,
          platform: code.platform
        }))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 25)
  };
}
