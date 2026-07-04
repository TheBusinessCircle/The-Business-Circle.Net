import "server-only";

import {
  CircleCardAmbassadorType,
  CircleCardCommissionStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { isCircleCardPlatformOwner } from "@/lib/circle-card/platform-owner-control";
import { resolveCircleCardCommissionProEntitlement } from "@/lib/circle-card/commission-entitlement";
import {
  calculateCircleCardMonthlyCommissions,
  CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE,
  getCircleCardCommissionPeriodMonth,
  type ActiveProReferralForCommission
} from "@/lib/circle-card/referral-rewards";
import { requireAdmin } from "@/lib/session";

function conversionDate(input: {
  convertedToProAt: Date | null;
  userCreatedAt: Date;
  subscription: { currentPeriodStart: Date | null; createdAt: Date } | null;
  ambassadorProfile: { createdAt: Date; updatedAt: Date; freeProGranted: boolean } | null;
}) {
  if (input.convertedToProAt) return input.convertedToProAt;
  if (input.subscription) return input.subscription.createdAt;
  if (input.ambassadorProfile?.freeProGranted) return input.ambassadorProfile.createdAt;
  return input.userCreatedAt;
}

const commissionReferralInclude = {
  referrerUser: {
    select: {
      id: true,
      suspended: true,
      circleCardAmbassadorProfile: true
    }
  },
  referredUser: {
    select: {
      id: true,
      role: true,
      membershipTier: true,
      suspended: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodStart: true,
          createdAt: true
        }
      },
      circleCardAmbassadorProfile: true
    }
  }
} as const;

async function loadActiveProReferrals(referrerUserId?: string) {
  const referrals = await db.circleCardGrowthReferral.findMany({
    where: {
      ...(referrerUserId ? { referrerUserId } : {}),
      referredUserId: { not: null },
      signedUpAt: { not: null }
    },
    include: commissionReferralInclude,
    orderBy: [{ convertedToProAt: "asc" }, { signedUpAt: "asc" }, { createdAt: "asc" }]
  });

  return referrals.flatMap((referral) => {
    const referredUser = referral.referredUser;
    if (!referredUser || referral.referrerUser.suspended) return [];
    if (referral.referrerUser.circleCardAmbassadorProfile?.active === false) return [];

    const entitlement = resolveCircleCardCommissionProEntitlement({
      role: referredUser.role,
      membershipTier: referredUser.membershipTier,
      suspended: referredUser.suspended,
      subscriptionStatus: referredUser.subscription?.status,
      ambassadorFreeProGranted: referredUser.circleCardAmbassadorProfile?.freeProGranted,
      ambassadorActive: referredUser.circleCardAmbassadorProfile?.active
    });

    if (!entitlement.activePro) return [];

    return [{
      referral,
      convertedToProAt: conversionDate({
        convertedToProAt: referral.convertedToProAt,
        userCreatedAt: referredUser.createdAt,
        subscription: referredUser.subscription,
        ambassadorProfile: referredUser.circleCardAmbassadorProfile
      }),
      entitlementSource: entitlement.source
    }];
  });
}

export async function generateCurrentMonthCircleCardCommissionLedger(now = new Date()) {
  const periodMonth = getCircleCardCommissionPeriodMonth(now);
  const activeReferrals = await loadActiveProReferrals();
  const byReferrer = new Map<string, typeof activeReferrals>();

  for (const item of activeReferrals) {
    const list = byReferrer.get(item.referral.referrerUserId) ?? [];
    list.push(item);
    byReferrer.set(item.referral.referrerUserId, list);
  }

  const rows = Array.from(byReferrer.entries()).flatMap(([, items]) => {
    const profile = items[0]?.referral.referrerUser.circleCardAmbassadorProfile;
    const referrerType = profile?.type ?? CircleCardAmbassadorType.STANDARD;
    const allocations = calculateCircleCardMonthlyCommissions({
      referrerType,
      currentMonth: periodMonth,
      activeProReferrals: items.map<ActiveProReferralForCommission>((item) => ({
        referralId: item.referral.id,
        referredUserId: item.referral.referredUserId!,
        convertedToProAt: item.convertedToProAt,
        entitlementSource: item.entitlementSource
      }))
    });

    return allocations.map((allocation) => ({
      referrerUserId: items[0]!.referral.referrerUserId,
      referredUserId: allocation.referredUserId,
      referralId: allocation.referralId,
      periodMonth,
      amountPence: allocation.amountPence,
      currency: allocation.currency,
      tierApplied: allocation.tierApplied,
      status: CircleCardCommissionStatus.PENDING,
      reason: "Active referred Circle Card Pro entitlement",
      source: allocation.entitlementSource
    }));
  });

  const missingConversionDates = activeReferrals.filter(
    (item) => !item.referral.convertedToProAt
  );

  const result = await db.$transaction(async (tx) => {
    for (const item of missingConversionDates) {
      await tx.circleCardGrowthReferral.updateMany({
        where: { id: item.referral.id, convertedToProAt: null },
        data: { convertedToProAt: item.convertedToProAt }
      });
    }

    const created = rows.length
      ? await tx.circleCardCommissionLedger.createMany({ data: rows, skipDuplicates: true })
      : { count: 0 };

    return created.count;
  });

  return {
    periodMonth,
    eligibleRows: rows.length,
    createdRows: result,
    duplicateRowsSkipped: rows.length - result,
    amountPence: rows.reduce((total, row) => total + row.amountPence, 0),
    notice: CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE
  };
}

export async function getCircleCardCommissionEarningsForUser(userId: string) {
  const [user, totalReferredUsers, activeReferrals, ledger] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        circleCardReferralCode: true,
        circleCardAmbassadorProfile: true
      }
    }),
    db.circleCardGrowthReferral.count({
      where: { referrerUserId: userId, signedUpAt: { not: null } }
    }),
    loadActiveProReferrals(userId),
    db.circleCardCommissionLedger.groupBy({
      by: ["status"],
      where: { referrerUserId: userId },
      _sum: { amountPence: true }
    })
  ]);

  if (!user) return null;

  const type = user.circleCardAmbassadorProfile?.type ?? CircleCardAmbassadorType.STANDARD;
  const estimatedAllocations = calculateCircleCardMonthlyCommissions({
    referrerType: type,
    activeProReferrals: activeReferrals.map((item) => ({
      referralId: item.referral.id,
      referredUserId: item.referral.referredUserId!,
      convertedToProAt: item.convertedToProAt,
      entitlementSource: item.entitlementSource
    }))
  });
  const totalFor = (...statuses: CircleCardCommissionStatus[]) =>
    ledger
      .filter((row) => statuses.includes(row.status))
      .reduce((total, row) => total + (row._sum.amountPence ?? 0), 0);

  return {
    referralCode: user.circleCardReferralCode,
    type,
    isFoundingAmbassador: type === CircleCardAmbassadorType.FOUNDING_AMBASSADOR,
    active: user.circleCardAmbassadorProfile?.active !== false,
    totalReferredUsers,
    activeProReferrals: activeReferrals.length,
    estimatedMonthlyPence: estimatedAllocations.reduce(
      (total, row) => total + row.amountPence,
      0
    ),
    pendingPence: totalFor(
      CircleCardCommissionStatus.PENDING,
      CircleCardCommissionStatus.APPROVED
    ),
    paidPence: totalFor(CircleCardCommissionStatus.PAID),
    notice: CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE
  };
}

export async function requireCircleCardCommissionOwner() {
  const session = await requireAdmin();
  if (!isCircleCardPlatformOwner({
    role: session.user.role,
    email: session.user.email,
    hasAdminAccess: true
  })) {
    throw new Error("Platform owner access required.");
  }
  return session;
}

export async function getCircleCardCommissionMonitorForCurrentAdmin() {
  const session = await requireAdmin();
  const ownerAccess = isCircleCardPlatformOwner({
    role: session.user.role,
    email: session.user.email,
    hasAdminAccess: true
  });
  if (!ownerAccess) return null;

  const periodMonth = getCircleCardCommissionPeriodMonth();
  const [ambassadors, standardProfiles, activeReferrals, totals, currentRows, rows] =
    await Promise.all([
      db.circleCardAmbassadorProfile.count({
        where: { type: CircleCardAmbassadorType.FOUNDING_AMBASSADOR, active: true }
      }),
      db.circleCardAmbassadorProfile.findMany({
        where: { type: CircleCardAmbassadorType.STANDARD, active: true },
        select: { userId: true }
      }),
      loadActiveProReferrals(),
      db.circleCardCommissionLedger.groupBy({
        by: ["status"],
        _sum: { amountPence: true }
      }),
      db.circleCardCommissionLedger.count({ where: { periodMonth } }),
      db.circleCardCommissionLedger.findMany({
        orderBy: [{ periodMonth: "desc" }, { createdAt: "desc" }],
        take: 40,
        include: {
          referrerUser: { select: { name: true, email: true } },
          referredUser: { select: { name: true, email: true } }
        }
      })
    ]);
  const totalFor = (...statuses: CircleCardCommissionStatus[]) =>
    totals
      .filter((row) => statuses.includes(row.status))
      .reduce((total, row) => total + (row._sum.amountPence ?? 0), 0);
  const standardReferrerIds = new Set([
    ...standardProfiles.map((profile) => profile.userId),
    ...activeReferrals
      .filter(
        (item) =>
          item.referral.referrerUser.circleCardAmbassadorProfile?.type !==
          CircleCardAmbassadorType.FOUNDING_AMBASSADOR
      )
      .map((item) => item.referral.referrerUserId)
  ]);

  return {
    periodMonth,
    totalAmbassadors: ambassadors,
    standardReferrers: standardReferrerIds.size,
    activeProReferrals: activeReferrals.length,
    pendingPence: totalFor(
      CircleCardCommissionStatus.PENDING,
      CircleCardCommissionStatus.APPROVED
    ),
    paidPence: totalFor(CircleCardCommissionStatus.PAID),
    currentMonthRows: currentRows,
    rows,
    notice: CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE
  };
}

export async function updateCircleCardAmbassadorProfile(input: {
  userId: string;
  type: CircleCardAmbassadorType;
  freeProGranted: boolean;
  active: boolean;
}) {
  if (input.type === CircleCardAmbassadorType.FOUNDING_AMBASSADOR) {
    const existing = await db.circleCardAmbassadorProfile.findUnique({
      where: { userId: input.userId },
      select: { type: true }
    });
    if (existing?.type !== CircleCardAmbassadorType.FOUNDING_AMBASSADOR) {
      const founderCount = await db.circleCardAmbassadorProfile.count({
        where: { type: CircleCardAmbassadorType.FOUNDING_AMBASSADOR }
      });
      if (founderCount >= 50) throw new Error("The 50 Founding Ambassador places are full.");
    }
  }

  const freeProGranted =
    input.type === CircleCardAmbassadorType.FOUNDING_AMBASSADOR || input.freeProGranted;

  return db.circleCardAmbassadorProfile.upsert({
    where: { userId: input.userId },
    create: { ...input, freeProGranted },
    update: {
      type: input.type,
      freeProGranted,
      active: input.active
    }
  });
}

export async function updateCircleCardCommissionStatus(input: {
  ledgerId: string;
  status: "PAID" | "VOID";
  reviewedById: string;
  reason?: string | null;
}) {
  const now = new Date();
  return db.circleCardCommissionLedger.update({
    where: { id: input.ledgerId },
    data: {
      status: input.status,
      reviewedById: input.reviewedById,
      statusReason: input.reason?.trim().slice(0, 240) || null,
      paidAt: input.status === "PAID" ? now : null,
      voidedAt: input.status === "VOID" ? now : null
    }
  });
}
