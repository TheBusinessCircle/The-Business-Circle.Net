import {
  FoundingReservationSource,
  FoundingReservationStatus,
  MembershipTier,
  Prisma
} from "@prisma/client";
import {
  MEMBERSHIP_FOUNDING_CAPACITY,
  getMembershipBillingPlan,
  getMembershipPlan,
  isMembershipVariantStripeConfigured
} from "@/config/membership";
import { isEligibleForDiscountedPricing } from "@/lib/billing-eligibility";
import { db } from "@/lib/db";
import {
  isRecoverableDatabaseError,
  logRecoverableDatabaseFallback
} from "@/lib/db-errors";
import type { FoundingOfferSnapshot, FoundingOfferTierSnapshot, FoundingStatusModel } from "@/types";

const FOUNDING_SETTINGS_ID = "default";
const DEFAULT_RESERVATION_WINDOW_MINUTES = 30;
const SERIALIZABLE_RETRY_ATTEMPTS = 3;
const DEFAULT_FOUNDATION_LIMIT = MEMBERSHIP_FOUNDING_CAPACITY;
const DEFAULT_INNER_CIRCLE_LIMIT = MEMBERSHIP_FOUNDING_CAPACITY;
const DEFAULT_CORE_LIMIT = MEMBERSHIP_FOUNDING_CAPACITY;
const DEFAULT_FOUNDING_SETTINGS = {
  id: FOUNDING_SETTINGS_ID,
  enabled: true,
  foundationEnabled: true,
  innerCircleEnabled: true,
  coreEnabled: true,
  foundationLimit: DEFAULT_FOUNDATION_LIMIT,
  innerCircleLimit: DEFAULT_INNER_CIRCLE_LIMIT,
  coreLimit: DEFAULT_CORE_LIMIT,
  foundationClaimed: 0,
  innerCircleClaimed: 0,
  coreClaimed: 0,
  foundationFoundingPrice: getMembershipBillingPlan(
    MembershipTier.FOUNDATION,
    "founding",
    "monthly"
  ).checkoutPrice,
  innerCircleFoundingPrice: getMembershipBillingPlan(
    MembershipTier.INNER_CIRCLE,
    "founding",
    "monthly"
  ).checkoutPrice,
  coreFoundingPrice: getMembershipBillingPlan(
    MembershipTier.CORE,
    "founding",
    "monthly"
  ).checkoutPrice,
  updatedAt: new Date()
};

type FoundingClient = typeof db | Prisma.TransactionClient;

type ReserveFoundingSlotInput = {
  userId: string;
  tier: MembershipTier;
  source?: FoundingReservationSource;
  expiresInMinutes?: number;
};

type ClaimFoundingReservationInput =
  | {
      reservationId: string;
      checkoutSessionId?: never;
      subscriptionId?: string | null;
    }
  | {
      reservationId?: never;
      checkoutSessionId: string;
      subscriptionId?: string | null;
    };

type UpdateFoundingOfferSettingsInput = {
  enabled: boolean;
  foundationEnabled: boolean;
  innerCircleEnabled: boolean;
  coreEnabled: boolean;
  foundationLimit: number;
  innerCircleLimit: number;
  coreLimit: number;
};

type FoundingReservationResult = {
  id: string;
  tier: MembershipTier;
  foundingPrice: number;
  expiresAt: Date;
};

type FoundingSettingsSnapshot = {
  id: string;
  enabled: boolean;
  foundationEnabled: boolean;
  innerCircleEnabled: boolean;
  coreEnabled: boolean;
  foundationLimit: number;
  innerCircleLimit: number;
  coreLimit: number;
  foundationClaimed: number;
  innerCircleClaimed: number;
  coreClaimed: number;
  foundationFoundingPrice: number;
  innerCircleFoundingPrice: number;
  coreFoundingPrice: number;
  updatedAt: Date;
};

const FOUNDING_SETTINGS_LEGACY_SELECT = {
  id: true,
  enabled: true,
  foundationLimit: true,
  innerCircleLimit: true,
  coreLimit: true,
  foundationClaimed: true,
  innerCircleClaimed: true,
  coreClaimed: true,
  foundationFoundingPrice: true,
  innerCircleFoundingPrice: true,
  coreFoundingPrice: true,
  updatedAt: true
} satisfies Prisma.FoundingOfferSettingsSelect;

const FOUNDING_SETTINGS_SELECT = {
  ...FOUNDING_SETTINGS_LEGACY_SELECT,
  foundationEnabled: true,
  innerCircleEnabled: true,
  coreEnabled: true
} satisfies Prisma.FoundingOfferSettingsSelect;

type LegacyFoundingSettingsRow = Prisma.FoundingOfferSettingsGetPayload<{
  select: typeof FOUNDING_SETTINGS_LEGACY_SELECT;
}>;

type FoundingSettingsRow = Prisma.FoundingOfferSettingsGetPayload<{
  select: typeof FOUNDING_SETTINGS_SELECT;
}>;

const FOUNDING_ENABLED_COLUMN_NAMES = [
  "foundationEnabled",
  "innerCircleEnabled",
  "coreEnabled"
] as const;

let foundingEnabledColumnsPromise: Promise<boolean> | null = null;

function isSerializableConflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function normalizeFoundingSettings(
  settings: FoundingSettingsRow | LegacyFoundingSettingsRow
): FoundingSettingsSnapshot {
  return {
    id: settings.id,
    enabled: settings.enabled,
    foundationEnabled:
      "foundationEnabled" in settings ? Boolean(settings.foundationEnabled) : true,
    innerCircleEnabled:
      "innerCircleEnabled" in settings ? Boolean(settings.innerCircleEnabled) : true,
    coreEnabled: "coreEnabled" in settings ? Boolean(settings.coreEnabled) : true,
    foundationLimit: settings.foundationLimit,
    innerCircleLimit: settings.innerCircleLimit,
    coreLimit: settings.coreLimit,
    foundationClaimed: settings.foundationClaimed,
    innerCircleClaimed: settings.innerCircleClaimed,
    coreClaimed: settings.coreClaimed,
    foundationFoundingPrice: settings.foundationFoundingPrice,
    innerCircleFoundingPrice: settings.innerCircleFoundingPrice,
    coreFoundingPrice: settings.coreFoundingPrice,
    updatedAt: settings.updatedAt
  };
}

async function loadFoundingEnabledColumnsSupport(client: FoundingClient) {
  const rows = await client.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'FoundingOfferSettings'
      AND column_name IN (${Prisma.join(FOUNDING_ENABLED_COLUMN_NAMES)})
  `);

  return FOUNDING_ENABLED_COLUMN_NAMES.every((columnName) =>
    rows.some((row) => row.column_name === columnName)
  );
}

async function supportsPerTierFoundingEnabledColumns(client: FoundingClient) {
  if (client === db) {
    foundingEnabledColumnsPromise ??= loadFoundingEnabledColumnsSupport(client).catch((error) => {
      foundingEnabledColumnsPromise = null;
      throw error;
    });

    return foundingEnabledColumnsPromise;
  }

  return loadFoundingEnabledColumnsSupport(client);
}

async function runSerializableFoundingTransaction<T>(
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

  throw new Error("Unable to complete founding transaction.");
}

function getClaimedCount(settings: FoundingSettingsSnapshot, tier: MembershipTier) {
  switch (tier) {
    case MembershipTier.CORE:
      return settings.coreClaimed;
    case MembershipTier.INNER_CIRCLE:
      return settings.innerCircleClaimed;
    default:
      return settings.foundationClaimed;
  }
}

function getLimitCount(settings: FoundingSettingsSnapshot, tier: MembershipTier) {
  switch (tier) {
    case MembershipTier.CORE:
      return settings.coreLimit;
    case MembershipTier.INNER_CIRCLE:
      return settings.innerCircleLimit;
    default:
      return settings.foundationLimit;
  }
}

function getFoundingPrice(tier: MembershipTier) {
  return getMembershipBillingPlan(tier, "founding", "monthly").checkoutPrice;
}

function isTierEnabled(settings: FoundingSettingsSnapshot, tier: MembershipTier) {
  switch (tier) {
    case MembershipTier.CORE:
      return settings.coreEnabled;
    case MembershipTier.INNER_CIRCLE:
      return settings.innerCircleEnabled;
    default:
      return settings.foundationEnabled;
  }
}

function getFoundingLabels(tier: MembershipTier) {
  if (tier === MembershipTier.CORE) {
    return {
      badgeLabel: "Founding Core",
      offerLabel: "Founding Core Offer"
    };
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return {
      badgeLabel: "Founding Inner Circle",
      offerLabel: "Founding Inner Circle Offer"
    };
  }

  return {
    badgeLabel: "Founding Foundation",
    offerLabel: "Founding Foundation Offer"
  };
}

function buildTierSnapshot(input: {
  tier: MembershipTier;
  settings: FoundingSettingsSnapshot;
  reservedCount: number;
}): FoundingOfferTierSnapshot {
  const { badgeLabel, offerLabel } = getFoundingLabels(input.tier);
  const standardPrice = getMembershipPlan(input.tier).monthlyPrice;
  const standardAnnualPrice = getMembershipBillingPlan(input.tier, "standard", "annual").checkoutPrice;
  const foundingPrice = getFoundingPrice(input.tier);
  const foundingAnnualPrice = getMembershipBillingPlan(input.tier, "founding", "annual").checkoutPrice;
  const claimed = getClaimedCount(input.settings, input.tier);
  const limit = getLimitCount(input.settings, input.tier);
  const remaining = Math.max(0, limit - claimed - input.reservedCount);
  const foundingOfferActive =
    input.settings.enabled &&
    isTierEnabled(input.settings, input.tier) &&
    isMembershipVariantStripeConfigured(input.tier, "founding", "monthly") &&
    isMembershipVariantStripeConfigured(input.tier, "founding", "annual");
  const available = foundingOfferActive && remaining > 0;
  const statusLabel = available ? "Available" : foundingOfferActive ? "Sold out" : "Inactive";
  const launchClosedLabel = foundingOfferActive
    ? "Founding Member spots have now been filled"
    : "Founding Member rate is not currently active";

  return {
    tier: input.tier,
    badgeLabel,
    offerLabel,
    foundingPrice,
    foundingAnnualPrice,
    standardPrice,
    standardAnnualPrice,
    limit,
    claimed,
    remaining,
    available,
    statusLabel,
    launchClosedLabel
  };
}

function incrementClaimCount(
  counts: Pick<
    FoundingSettingsSnapshot,
    "foundationClaimed" | "innerCircleClaimed" | "coreClaimed"
  >,
  tier: MembershipTier
) {
  if (tier === MembershipTier.CORE) {
    counts.coreClaimed += 1;
    return;
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    counts.innerCircleClaimed += 1;
    return;
  }

  counts.foundationClaimed += 1;
}

function decrementClaimCount(
  counts: Pick<
    FoundingSettingsSnapshot,
    "foundationClaimed" | "innerCircleClaimed" | "coreClaimed"
  >,
  tier: MembershipTier
) {
  if (tier === MembershipTier.CORE) {
    counts.coreClaimed = Math.max(0, counts.coreClaimed - 1);
    return;
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    counts.innerCircleClaimed = Math.max(0, counts.innerCircleClaimed - 1);
    return;
  }

  counts.foundationClaimed = Math.max(0, counts.foundationClaimed - 1);
}

export function getFoundingBadgeLabel(
  status: Pick<FoundingStatusModel, "foundingMember" | "foundingTier">
) {
  if (!status.foundingMember || !status.foundingTier) {
    return null;
  }

  return getFoundingLabels(status.foundingTier).badgeLabel;
}

export async function getOrCreateFoundingOfferSettings(client: FoundingClient = db) {
  const supportsPerTierColumns = await supportsPerTierFoundingEnabledColumns(client);
  const baseInput = {
    where: {
      id: FOUNDING_SETTINGS_ID
    },
    update: {},
    create: {
      id: FOUNDING_SETTINGS_ID
    }
  } as const;

  if (supportsPerTierColumns) {
    const settings = await client.foundingOfferSettings.upsert({
      ...baseInput,
      select: FOUNDING_SETTINGS_SELECT
    });

    return normalizeFoundingSettings(settings);
  }

  const settings = await client.foundingOfferSettings.upsert({
    ...baseInput,
    select: FOUNDING_SETTINGS_LEGACY_SELECT
  });

  return normalizeFoundingSettings(settings);
}

export async function cleanupExpiredFoundingReservations(client: FoundingClient = db) {
  const now = new Date();

  await client.foundingOfferReservation.updateMany({
    where: {
      status: FoundingReservationStatus.ACTIVE,
      expiresAt: {
        lt: now
      }
    },
    data: {
      status: FoundingReservationStatus.EXPIRED,
      releasedAt: now
    }
  });
}

async function countActiveReservations(
  client: FoundingClient,
  tier: MembershipTier,
  excludeUserId?: string
) {
  return client.foundingOfferReservation.count({
    where: {
      tier,
      status: FoundingReservationStatus.ACTIVE,
      expiresAt: {
        gt: new Date()
      },
      ...(excludeUserId
        ? {
            userId: {
              not: excludeUserId
            }
          }
        : {})
    }
  });
}

export async function getFoundingOfferSnapshot(): Promise<FoundingOfferSnapshot> {
  try {
    await cleanupExpiredFoundingReservations();

    const [settings, foundationReserved, innerReserved, coreReserved] = await Promise.all([
      getOrCreateFoundingOfferSettings(),
      countActiveReservations(db, MembershipTier.FOUNDATION),
      countActiveReservations(db, MembershipTier.INNER_CIRCLE),
      countActiveReservations(db, MembershipTier.CORE)
    ]);

    return {
      enabled: settings.enabled,
      foundation: buildTierSnapshot({
        tier: MembershipTier.FOUNDATION,
        settings,
        reservedCount: foundationReserved
      }),
      innerCircle: buildTierSnapshot({
        tier: MembershipTier.INNER_CIRCLE,
        settings,
        reservedCount: innerReserved
      }),
      core: buildTierSnapshot({
        tier: MembershipTier.CORE,
        settings,
        reservedCount: coreReserved
      }),
      updatedAt: settings.updatedAt
    };
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    logRecoverableDatabaseFallback("founding-offer", error);

    return {
      enabled: DEFAULT_FOUNDING_SETTINGS.enabled,
      foundation: buildTierSnapshot({
        tier: MembershipTier.FOUNDATION,
        settings: DEFAULT_FOUNDING_SETTINGS,
        reservedCount: 0
      }),
      innerCircle: buildTierSnapshot({
        tier: MembershipTier.INNER_CIRCLE,
        settings: DEFAULT_FOUNDING_SETTINGS,
        reservedCount: 0
      }),
      core: buildTierSnapshot({
        tier: MembershipTier.CORE,
        settings: DEFAULT_FOUNDING_SETTINGS,
        reservedCount: 0
      }),
      updatedAt: DEFAULT_FOUNDING_SETTINGS.updatedAt
    };
  }
}

export async function reserveFoundingSlot(
  input: ReserveFoundingSlotInput
): Promise<FoundingReservationResult | null> {
  return runSerializableFoundingTransaction(async (tx) => {
    await cleanupExpiredFoundingReservations(tx);

    const settings = await getOrCreateFoundingOfferSettings(tx);
    const foundingMonthlyPlan = getMembershipBillingPlan(input.tier, "founding", "monthly");
    if (
      !settings.enabled ||
      !isTierEnabled(settings, input.tier) ||
      !isMembershipVariantStripeConfigured(input.tier, "founding", "monthly") ||
      !isMembershipVariantStripeConfigured(input.tier, "founding", "annual")
    ) {
      return null;
    }

    const user = await tx.user.findUnique({
      where: {
        id: input.userId
      },
      select: {
        foundingMember: true,
        subscription: {
          select: {
            status: true,
            stripeSubscriptionId: true,
            currentPeriodStart: true,
            canceledAt: true
          }
        }
      }
    });

    if (
      !user ||
      !isEligibleForDiscountedPricing({
        source: input.source,
        foundingMember: user.foundingMember,
        subscription: user.subscription
      })
    ) {
      return null;
    }

    const now = new Date();
    const existingReservation = await tx.foundingOfferReservation.findFirst({
      where: {
        userId: input.userId,
        tier: input.tier,
        status: FoundingReservationStatus.ACTIVE,
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (existingReservation) {
      return {
        id: existingReservation.id,
        tier: existingReservation.tier,
        foundingPrice: existingReservation.foundingPrice,
        expiresAt: existingReservation.expiresAt
      };
    }

    await tx.foundingOfferReservation.updateMany({
      where: {
        userId: input.userId,
        status: FoundingReservationStatus.ACTIVE
      },
      data: {
        status: FoundingReservationStatus.RELEASED,
        releasedAt: now
      }
    });

    const reservedCount = await countActiveReservations(tx, input.tier, input.userId);
    const claimedCount = getClaimedCount(settings, input.tier);
    const limitCount = getLimitCount(settings, input.tier);

    if (claimedCount + reservedCount >= limitCount) {
      return null;
    }

    const reservation = await tx.foundingOfferReservation.create({
      data: {
        userId: input.userId,
        tier: input.tier,
        foundingPrice: foundingMonthlyPlan.checkoutPrice,
        source: input.source ?? FoundingReservationSource.CHECKOUT,
        status: FoundingReservationStatus.ACTIVE,
        expiresAt: new Date(
          now.getTime() + (input.expiresInMinutes ?? DEFAULT_RESERVATION_WINDOW_MINUTES) * 60_000
        )
      }
    });

    return {
      id: reservation.id,
      tier: reservation.tier,
      foundingPrice: reservation.foundingPrice,
      expiresAt: reservation.expiresAt
    };
  });
}

export async function attachFoundingReservationToCheckoutSession(
  reservationId: string,
  checkoutSessionId: string
) {
  await db.foundingOfferReservation.update({
    where: {
      id: reservationId
    },
    data: {
      checkoutSessionId
    }
  });
}

export async function releaseFoundingReservation(input: {
  reservationId?: string | null;
  checkoutSessionId?: string | null;
}) {
  const now = new Date();

  await db.foundingOfferReservation.updateMany({
    where: {
      status: FoundingReservationStatus.ACTIVE,
      ...(input.reservationId
        ? {
            id: input.reservationId
          }
        : {}),
      ...(input.checkoutSessionId
        ? {
            checkoutSessionId: input.checkoutSessionId
          }
        : {})
    },
    data: {
      status: FoundingReservationStatus.RELEASED,
      releasedAt: now
    }
  });
}

export async function claimFoundingReservation(input: ClaimFoundingReservationInput) {
  return runSerializableFoundingTransaction(async (tx) => {
    await cleanupExpiredFoundingReservations(tx);

    const reservation = await tx.foundingOfferReservation.findFirst({
      where: {
        status: FoundingReservationStatus.ACTIVE,
        ...(input.reservationId
          ? {
              id: input.reservationId
            }
          : {
              checkoutSessionId: input.checkoutSessionId
            })
      }
    });

    if (!reservation) {
      return null;
    }

    const settings = await getOrCreateFoundingOfferSettings(tx);
    const existingMembership = await tx.foundingMember.findUnique({
      where: {
        userId: reservation.userId
      }
    });
    const counts = {
      foundationClaimed: settings.foundationClaimed,
      innerCircleClaimed: settings.innerCircleClaimed,
      coreClaimed: settings.coreClaimed
    };
    const now = new Date();

    let nextClaimedAt = now;
    let nextPrice = reservation.foundingPrice;

    if (!existingMembership) {
      incrementClaimCount(counts, reservation.tier);

      await tx.foundingMember.create({
        data: {
          userId: reservation.userId,
          tier: reservation.tier,
          foundingPrice: reservation.foundingPrice,
          claimedAt: now,
          subscriptionId: input.subscriptionId ?? null
        }
      });
    } else if (existingMembership.tier !== reservation.tier) {
      nextClaimedAt = now;
      nextPrice = reservation.foundingPrice;

      decrementClaimCount(counts, existingMembership.tier);
      incrementClaimCount(counts, reservation.tier);

      await tx.foundingMember.update({
        where: {
          userId: reservation.userId
        },
        data: {
          tier: reservation.tier,
          foundingPrice: reservation.foundingPrice,
          claimedAt: now,
          subscriptionId: input.subscriptionId ?? null
        }
      });
    } else {
      nextClaimedAt = existingMembership.claimedAt;
      nextPrice = existingMembership.foundingPrice;

      await tx.foundingMember.update({
        where: {
          userId: reservation.userId
        },
        data: {
          subscriptionId: input.subscriptionId ?? null
        }
      });
    }

    await tx.foundingOfferSettings.update({
      where: {
        id: settings.id
      },
      data: {
        foundationClaimed: counts.foundationClaimed,
        innerCircleClaimed: counts.innerCircleClaimed,
        coreClaimed: counts.coreClaimed
      },
      select: {
        id: true
      }
    });

    await tx.user.update({
      where: {
        id: reservation.userId
      },
      data: {
        foundingMember: true,
        foundingTier: reservation.tier,
        foundingPrice: nextPrice,
        foundingClaimedAt: nextClaimedAt
      }
    });

    await tx.foundingOfferReservation.update({
      where: {
        id: reservation.id
      },
      data: {
        status: FoundingReservationStatus.CLAIMED,
        claimedAt: now,
        subscriptionId: input.subscriptionId ?? null
      }
    });

    return {
      userId: reservation.userId,
      tier: reservation.tier,
      foundingPrice: nextPrice,
      claimedAt: nextClaimedAt
    };
  });
}

export async function getFoundingStatusForUser(
  userId: string
): Promise<FoundingStatusModel | null> {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      foundingMember: true,
      foundingTier: true,
      foundingPrice: true,
      foundingClaimedAt: true
    }
  });

  if (!user) {
    return null;
  }

  return {
    foundingMember: user.foundingMember,
    foundingTier: user.foundingTier,
    foundingPrice: user.foundingPrice,
    foundingClaimedAt: user.foundingClaimedAt,
    badgeLabel: getFoundingBadgeLabel(user)
  };
}

export async function updateFoundingOfferSettings(input: UpdateFoundingOfferSettingsInput) {
  const foundationLimit = Math.max(input.foundationLimit, 0);
  const innerCircleLimit = Math.max(input.innerCircleLimit, 0);
  const coreLimit = Math.max(input.coreLimit, 0);

  return runSerializableFoundingTransaction(async (tx) => {
    const supportsPerTierColumns = await supportsPerTierFoundingEnabledColumns(tx);
    const existing = await getOrCreateFoundingOfferSettings(tx);

    if (
      existing.foundationClaimed > foundationLimit ||
      existing.innerCircleClaimed > innerCircleLimit ||
      existing.coreClaimed > coreLimit
    ) {
      throw new Error("founding-limit-below-claimed");
    }

    if (supportsPerTierColumns) {
      const updated = await tx.foundingOfferSettings.update({
        where: {
          id: existing.id
        },
        data: {
          enabled: input.enabled,
          foundationEnabled: input.foundationEnabled,
          innerCircleEnabled: input.innerCircleEnabled,
          coreEnabled: input.coreEnabled,
          foundationLimit,
          innerCircleLimit,
          coreLimit
        },
        select: FOUNDING_SETTINGS_SELECT
      });

      return normalizeFoundingSettings(updated);
    }

    const updated = await tx.foundingOfferSettings.update({
      where: {
        id: existing.id
      },
      data: {
        enabled: input.enabled,
        foundationLimit,
        innerCircleLimit,
        coreLimit
      },
      select: FOUNDING_SETTINGS_LEGACY_SELECT
    });

    return normalizeFoundingSettings(updated);
  });
}

export async function listFoundingMembers() {
  const settings = await getOrCreateFoundingOfferSettings();
  const members = await db.foundingMember.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true,
          createdAt: true
        }
      }
    },
    orderBy: [
      {
        claimedAt: "asc"
      }
    ]
  });

  return {
    settings,
    members
  };
}
