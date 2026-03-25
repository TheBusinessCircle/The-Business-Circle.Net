import { randomInt } from "node:crypto";
import {
  MembershipTier,
  ReputationEventType,
  Role,
  type Prisma
} from "@prisma/client";
import {
  COMMUNITY_BADGE_DEFINITIONS,
  INVITE_BADGE_THRESHOLDS,
  REPUTATION_EVENT_POINTS,
  STATUS_LEVEL_SCORE_THRESHOLDS
} from "@/config/community-recognition";
import { db } from "@/lib/db";
import type {
  CommunityBadgeModel,
  CommunityRecognitionSummary,
  CommunityStatusLevel,
  InviteDashboardModel
} from "@/types";

type RecognitionClient = typeof db | Prisma.TransactionClient;

type UserRecognitionBase = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
};

const BADGE_DEFINITION_BY_SLUG = new Map(
  COMMUNITY_BADGE_DEFINITIONS.map((badge) => [badge.slug, badge])
);

function communityBaseUrl() {
  return (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function buildInviteLink(inviteCode: string) {
  return `${communityBaseUrl()}/invite/${inviteCode}`;
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase();
}

function invitePrefixFromUser(user: Pick<UserRecognitionBase, "name" | "email">) {
  const source = (user.name?.trim() || user.email.split("@")[0] || "member")
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();

  return (source || "MEMB").slice(0, 4);
}

async function generateUniqueInviteCode(
  client: RecognitionClient,
  user: Pick<UserRecognitionBase, "name" | "email">
) {
  const prefix = invitePrefixFromUser(user);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const inviteCode = `BC-${prefix}-${String(randomInt(1000, 10000))}`;
    const existing = await client.memberInvite.findUnique({
      where: {
        inviteCode
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      return inviteCode;
    }
  }

  return `BC-${prefix}-${Date.now().toString().slice(-4)}`;
}

export async function ensureRecognitionBadgeCatalog(client: RecognitionClient = db) {
  await Promise.all(
    COMMUNITY_BADGE_DEFINITIONS.map((badge) =>
      client.badge.upsert({
        where: {
          slug: badge.slug
        },
        update: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          priority: badge.priority
        },
        create: {
          name: badge.name,
          slug: badge.slug,
          description: badge.description,
          icon: badge.icon,
          priority: badge.priority
        }
      })
    )
  );
}

async function ensureInviteForUserInternal(
  client: RecognitionClient,
  user: UserRecognitionBase
) {
  const existing = await client.memberInvite.findUnique({
    where: {
      inviterUserId: user.id
    }
  });

  if (existing) {
    return existing;
  }

  const inviteCode = await generateUniqueInviteCode(client, user);

  return client.memberInvite.create({
    data: {
      inviterUserId: user.id,
      inviteCode
    }
  });
}

async function ensureReputationScoreInternal(client: RecognitionClient, userId: string) {
  return client.reputationScore.upsert({
    where: {
      userId
    },
    update: {},
    create: {
      userId,
      score: 0
    }
  });
}

export async function ensureMemberGrowthState(userId: string) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        foundingTier: true
      }
    });

    if (!user) {
      return null;
    }

    const [invite] = await Promise.all([
      ensureInviteForUserInternal(tx, user),
      ensureReputationScoreInternal(tx, userId),
      ensureRecognitionBadgeCatalog(tx)
    ]);

    return invite;
  });
}

async function applyReputationEventInternal(
  client: RecognitionClient,
  input: {
    userId: string;
    eventType: ReputationEventType;
    points: number;
  }
) {
  const nextScore = await client.reputationScore.upsert({
    where: {
      userId: input.userId
    },
    update: {
      score: {
        increment: input.points
      }
    },
    create: {
      userId: input.userId,
      score: Math.max(0, input.points)
    },
    select: {
      score: true
    }
  });

  await client.reputationEvent.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      points: input.points
    }
  });

  return nextScore.score;
}

export async function grantReputationToUser(input: {
  userId: string;
  points: number;
}) {
  if (!Number.isFinite(input.points) || input.points === 0) {
    return ensureReputationScoreInternal(db, input.userId);
  }

  return db.$transaction(async (tx) => {
    await ensureReputationScoreInternal(tx, input.userId);

    return applyReputationEventInternal(tx, {
      userId: input.userId,
      eventType: ReputationEventType.ADMIN_GRANTED,
      points: Math.trunc(input.points)
    });
  });
}

export async function resetReputationForUser(userId: string) {
  return db.$transaction(async (tx) => {
    const currentScore = await tx.reputationScore.findUnique({
      where: {
        userId
      },
      select: {
        score: true
      }
    });

    const scoreRecord = await tx.reputationScore.upsert({
      where: {
        userId
      },
      update: {
        score: 0
      },
      create: {
        userId,
        score: 0
      }
    });

    await tx.reputationEvent.create({
      data: {
        userId,
        eventType: ReputationEventType.ADMIN_RESET,
        points: currentScore ? -currentScore.score : 0
      }
    });

    return scoreRecord;
  });
}

export async function assignBadgeToUser(input: {
  userId: string;
  badgeSlug: string;
}) {
  return db.$transaction(async (tx) => {
    await ensureRecognitionBadgeCatalog(tx);

    const badge = await tx.badge.findUnique({
      where: {
        slug: input.badgeSlug
      }
    });

    if (!badge) {
      throw new Error("badge-not-found");
    }

    return tx.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: input.userId,
          badgeId: badge.id
        }
      },
      update: {
        awardedByAdmin: true
      },
      create: {
        userId: input.userId,
        badgeId: badge.id,
        awardedByAdmin: true
      }
    });
  });
}

export async function listBadgeCatalog() {
  await ensureRecognitionBadgeCatalog();

  return db.badge.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }]
  });
}

export async function recordInviteReferral(input: {
  inviteCode?: string | null;
  referredUserId: string;
  subscriptionTier: MembershipTier;
}) {
  const normalizedCode = input.inviteCode ? normalizeInviteCode(input.inviteCode) : "";

  if (!normalizedCode) {
    return null;
  }

  return db.$transaction(async (tx) => {
    const invite = await tx.memberInvite.findUnique({
      where: {
        inviteCode: normalizedCode
      }
    });

    if (!invite || invite.inviterUserId === input.referredUserId) {
      return null;
    }

    const existing = await tx.inviteReferral.findUnique({
      where: {
        referredUserId: input.referredUserId
      }
    });

    if (existing) {
      return existing;
    }

    const referral = await tx.inviteReferral.create({
      data: {
        inviterUserId: invite.inviterUserId,
        referredUserId: input.referredUserId,
        subscriptionTier: input.subscriptionTier
      }
    });

    const eventType =
      input.subscriptionTier === MembershipTier.INNER_CIRCLE ||
      input.subscriptionTier === MembershipTier.CORE
        ? ReputationEventType.INVITE_INNER_CIRCLE
        : ReputationEventType.INVITE_MEMBER;
    const points = REPUTATION_EVENT_POINTS[eventType] ?? 0;

    if (points) {
      await ensureReputationScoreInternal(tx, invite.inviterUserId);
      await applyReputationEventInternal(tx, {
        userId: invite.inviterUserId,
        eventType,
        points
      });
    }

    return referral;
  });
}

function toBadgeModel(
  slug: string,
  source: CommunityBadgeModel["source"],
  awardedAt: Date | null,
  awardedByAdmin: boolean
): CommunityBadgeModel | null {
  const definition = BADGE_DEFINITION_BY_SLUG.get(slug);

  if (!definition) {
    return null;
  }

  return {
    id: slug,
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    priority: definition.priority,
    source,
    awardedAt,
    awardedByAdmin
  };
}

function resolveStatusLevel(input: {
  membershipTier: MembershipTier;
  score: number;
  referralCount: number;
}): CommunityStatusLevel {
  if (input.membershipTier === MembershipTier.CORE) {
    return "Core";
  }

  if (input.membershipTier === MembershipTier.INNER_CIRCLE) {
    return "Inner Circle";
  }

  if (
    input.referralCount >= INVITE_BADGE_THRESHOLDS.circleLeader ||
    input.score >= STATUS_LEVEL_SCORE_THRESHOLDS.circleLeader
  ) {
    return "Circle Leader";
  }

  if (
    input.referralCount >= INVITE_BADGE_THRESHOLDS.communityBuilder ||
    input.score >= STATUS_LEVEL_SCORE_THRESHOLDS.communityBuilder
  ) {
    return "Community Builder";
  }

  if (
    input.referralCount >= INVITE_BADGE_THRESHOLDS.connector ||
    input.score >= STATUS_LEVEL_SCORE_THRESHOLDS.contributor
  ) {
    return "Contributor";
  }

  return "Member";
}

function buildSystemBadges(input: {
  role: Role;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
  score: number;
  referralCount: number;
}) {
  const badges: CommunityBadgeModel[] = [];

  if (input.role === Role.ADMIN) {
    const founderBadge = toBadgeModel("founder", "system", null, false);
    if (founderBadge) {
      badges.push(founderBadge);
    }
  } else if (input.foundingTier === MembershipTier.CORE) {
    const foundingCoreBadge = toBadgeModel("founding-core", "system", null, false);
    if (foundingCoreBadge) {
      badges.push(foundingCoreBadge);
    }
  } else if (input.membershipTier === MembershipTier.CORE) {
    const coreBadge = toBadgeModel("core", "system", null, false);
    if (coreBadge) {
      badges.push(coreBadge);
    }
  } else if (input.foundingTier === MembershipTier.INNER_CIRCLE) {
    const foundingInnerCircleBadge = toBadgeModel(
      "founding-inner-circle",
      "system",
      null,
      false
    );
    if (foundingInnerCircleBadge) {
      badges.push(foundingInnerCircleBadge);
    }
  } else if (input.membershipTier === MembershipTier.INNER_CIRCLE) {
    const innerCircleBadge = toBadgeModel("inner-circle", "system", null, false);
    if (innerCircleBadge) {
      badges.push(innerCircleBadge);
    }
  } else if (input.foundingTier === MembershipTier.FOUNDATION) {
    const foundingMemberBadge = toBadgeModel("founding-member", "system", null, false);
    if (foundingMemberBadge) {
      badges.push(foundingMemberBadge);
    }
  }

  const inviteBadgeSlug =
    input.referralCount >= INVITE_BADGE_THRESHOLDS.circleLeader
      ? "circle-leader"
      : input.referralCount >= INVITE_BADGE_THRESHOLDS.communityBuilder
        ? "community-builder"
        : input.referralCount >= INVITE_BADGE_THRESHOLDS.connector
          ? "connector"
          : null;

  if (inviteBadgeSlug) {
    const inviteBadge = toBadgeModel(inviteBadgeSlug, "system", null, false);
    if (inviteBadge) {
      badges.push(inviteBadge);
    }
  }

  if (input.score >= STATUS_LEVEL_SCORE_THRESHOLDS.contributor) {
    const contributorBadge = toBadgeModel("contributor", "system", null, false);
    if (contributorBadge) {
      badges.push(contributorBadge);
    }
  }

  return badges;
}

function dedupeBadges(badges: CommunityBadgeModel[]) {
  const seen = new Set<string>();
  const ordered = [...badges].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return (right.awardedAt?.getTime() ?? 0) - (left.awardedAt?.getTime() ?? 0);
  });

  return ordered.filter((badge) => {
    if (seen.has(badge.slug)) {
      return false;
    }

    seen.add(badge.slug);
    return true;
  });
}

export async function getCommunityRecognitionForUsers(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const summaries = new Map<string, CommunityRecognitionSummary>();

  if (!uniqueUserIds.length) {
    return summaries;
  }

  await ensureRecognitionBadgeCatalog();

  const [users, scores, referrals, assignedBadges] = await Promise.all([
    db.user.findMany({
      where: {
        id: {
          in: uniqueUserIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        foundingTier: true
      }
    }),
    db.reputationScore.findMany({
      where: {
        userId: {
          in: uniqueUserIds
        }
      },
      select: {
        userId: true,
        score: true
      }
    }),
    db.inviteReferral.findMany({
      where: {
        inviterUserId: {
          in: uniqueUserIds
        }
      },
      select: {
        inviterUserId: true,
        subscriptionTier: true
      }
    }),
    db.userBadge.findMany({
      where: {
        userId: {
          in: uniqueUserIds
        }
      },
      include: {
        badge: true
      }
    })
  ]);

  const scoreByUserId = new Map(scores.map((score) => [score.userId, score.score]));
  const referralStatsByUserId = new Map<
    string,
    { total: number; members: number; innerCircle: number }
  >();

  for (const referral of referrals) {
    const current = referralStatsByUserId.get(referral.inviterUserId) ?? {
      total: 0,
      members: 0,
      innerCircle: 0
    };
    current.total += 1;
    if (
      referral.subscriptionTier === MembershipTier.INNER_CIRCLE ||
      referral.subscriptionTier === MembershipTier.CORE
    ) {
      current.innerCircle += 1;
    } else {
      current.members += 1;
    }
    referralStatsByUserId.set(referral.inviterUserId, current);
  }

  const assignedBadgesByUserId = new Map<string, CommunityBadgeModel[]>();
  for (const awardedBadge of assignedBadges) {
    const nextBadge: CommunityBadgeModel = {
      id: awardedBadge.badge.id,
      slug: awardedBadge.badge.slug,
      name: awardedBadge.badge.name,
      description: awardedBadge.badge.description,
      icon: awardedBadge.badge.icon as CommunityBadgeModel["icon"],
      priority: awardedBadge.badge.priority,
      source: "assigned",
      awardedAt: awardedBadge.awardedAt,
      awardedByAdmin: awardedBadge.awardedByAdmin
    };

    const current = assignedBadgesByUserId.get(awardedBadge.userId) ?? [];
    current.push(nextBadge);
    assignedBadgesByUserId.set(awardedBadge.userId, current);
  }

  for (const user of users) {
    const score = scoreByUserId.get(user.id) ?? 0;
    const referralStats = referralStatsByUserId.get(user.id) ?? {
      total: 0,
      members: 0,
      innerCircle: 0
    };
    const statusLevel = resolveStatusLevel({
      membershipTier: user.membershipTier,
      score,
      referralCount: referralStats.total
    });
    const badges = dedupeBadges([
      ...buildSystemBadges({
        role: user.role,
        membershipTier: user.membershipTier,
        foundingTier: user.foundingTier,
        score,
        referralCount: referralStats.total
      }),
      ...(assignedBadgesByUserId.get(user.id) ?? [])
    ]);

    summaries.set(user.id, {
      score,
      statusLevel,
      badges,
      primaryBadge: badges[0] ?? null,
      referralCount: referralStats.total,
      memberReferralCount: referralStats.members,
      innerCircleReferralCount: referralStats.innerCircle
    });
  }

  return summaries;
}

export async function getCommunityRecognitionForUser(userId: string) {
  const summaries = await getCommunityRecognitionForUsers([userId]);
  return (
    summaries.get(userId) ?? {
      score: 0,
      statusLevel: "Member",
      badges: [],
      primaryBadge: null,
      referralCount: 0,
      memberReferralCount: 0,
      innerCircleReferralCount: 0
    }
  );
}

export async function getInviteDashboardForUser(userId: string): Promise<InviteDashboardModel | null> {
  const inviteState = await ensureMemberGrowthState(userId);

  if (!inviteState) {
    return null;
  }

  const referrals = await db.inviteReferral.findMany({
    where: {
      inviterUserId: userId
    },
    include: {
      referredUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      joinedAt: "desc"
    }
  });

  const totalReferrals = referrals.length;
  const innerCircleReferrals = referrals.filter(
    (referral) =>
      referral.subscriptionTier === MembershipTier.INNER_CIRCLE ||
      referral.subscriptionTier === MembershipTier.CORE
  ).length;
  const memberReferrals = totalReferrals - innerCircleReferrals;

  return {
    inviteCode: inviteState.inviteCode,
    inviteLink: buildInviteLink(inviteState.inviteCode),
    totalReferrals,
    memberReferrals,
    innerCircleReferrals,
    referrals: referrals.map((referral) => ({
      id: referral.referredUser.id,
      name: referral.referredUser.name,
      email: referral.referredUser.email,
      subscriptionTier: referral.subscriptionTier,
      joinedAt: referral.joinedAt
    }))
  };
}

export async function getAdminCommunityGrowthSnapshot() {
  const [topInviters, topContributors, activeMessageCounts] = await Promise.all([
    db.inviteReferral.groupBy({
      by: ["inviterUserId"],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          inviterUserId: "desc"
        }
      },
      take: 5
    }),
    db.reputationScore.findMany({
      orderBy: {
        score: "desc"
      },
      take: 5,
      select: {
        userId: true,
        score: true
      }
    }),
    db.message.groupBy({
      by: ["userId"],
      where: {
        deletedAt: null
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          userId: "desc"
        }
      },
      take: 5
    })
  ]);

  const referencedUserIds = Array.from(
    new Set([
      ...topInviters.map((item) => item.inviterUserId),
      ...topContributors.map((item) => item.userId),
      ...activeMessageCounts.map((item) => item.userId)
    ])
  );

  const users = referencedUserIds.length
    ? await db.user.findMany({
        where: {
          id: {
            in: referencedUserIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    : [];

  const userById = new Map(users.map((user) => [user.id, user]));

  return {
    topInviters: topInviters.map((entry) => ({
      user: userById.get(entry.inviterUserId) ?? null,
      totalInvites: entry._count._all
    })),
    topContributors: topContributors.map((entry) => ({
      user: userById.get(entry.userId) ?? null,
      score: entry.score
    })),
    mostActiveMembers: activeMessageCounts.map((entry) => ({
      user: userById.get(entry.userId) ?? null,
      messageCount: entry._count._all
    }))
  };
}

