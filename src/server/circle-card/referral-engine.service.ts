import "server-only";

import { CircleCardEventType, Prisma } from "@prisma/client";
import {
  CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES,
  normalizeCircleCardReferralSourceCardSlug,
  normalizeCircleCardReferralSourceType,
  normalizeCircleCardReferralCode,
  type CircleCardReferralActivationStatus,
  type CircleCardReferralSourceType
} from "@/lib/circle-card/referral-engine";
import { getCircleCardReferralRewardAwareness } from "@/lib/circle-card/referral-rewards";
import { calculateCircleCardCompletionForCard } from "@/server/circle-card/activation.service";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const REFERRAL_RECENT_LIMIT = 8;
const ADMIN_REFERRAL_RECENT_LIMIT = 12;
const ADMIN_TOP_REFERRER_LIMIT = 8;
const RESERVED_REFERRAL_CODES = new Set([
  "admin",
  "api",
  "card",
  "circle-card",
  "dashboard",
  "login",
  "register",
  "sign-up",
  "r"
]);

type ReferralCodeOwner = {
  id: string;
  name: string | null;
  email: string;
  circleCardReferralCode: string | null;
  foundingMember: boolean;
  circleCards: Array<{
    id: string;
    slug: string;
    fullName: string;
    businessName: string | null;
  }>;
};

function sanitizeStatus(value: string): CircleCardReferralActivationStatus {
  return CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES.includes(
    value as CircleCardReferralActivationStatus
  )
    ? (value as CircleCardReferralActivationStatus)
    : "CLICKED";
}

function referralCodeSeed(owner: Pick<ReferralCodeOwner, "name" | "email" | "circleCards">) {
  const primaryCard = owner.circleCards[0];
  const seed =
    primaryCard?.slug ||
    primaryCard?.fullName ||
    owner.name ||
    owner.email.split("@")[0] ||
    "circle-card";
  const slug = slugify(seed);
  const safeSlug = RESERVED_REFERRAL_CODES.has(slug) ? `${slug}-card` : slug;

  if (safeSlug.length >= 2) {
    return safeSlug.slice(0, 96);
  }

  return `${safeSlug || "cc"}-card`;
}

async function resolveUniqueReferralCode(
  tx: Prisma.TransactionClient,
  seed: string
) {
  for (let index = 0; index < 32; index += 1) {
    const candidate = index === 0 ? seed : `${seed}-${index + 1}`;
    const existing = await tx.user.findUnique({
      where: { circleCardReferralCode: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${seed}-${Date.now().toString(36)}`;
}

function referralMetadata(
  input: Record<string, unknown | null | undefined>
): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Prisma.InputJsonObject;
}

function readReferralMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

async function createReferralNotificationOnce(input: {
  userId: string;
  circleCardId?: string | null;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
}) {
  const duplicate = await prisma.circleCardNotification.findFirst({
    where: {
      userId: input.userId,
      type: "SYSTEM",
      entityType: input.entityType,
      entityId: input.entityId
    },
    select: { id: true }
  });

  if (duplicate) {
    return { stored: false as const, duplicate: true as const };
  }

  await prisma.circleCardNotification.create({
    data: {
      userId: input.userId,
      circleCardId: input.circleCardId ?? null,
      type: "SYSTEM",
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 360),
      entityType: input.entityType,
      entityId: input.entityId
    }
  });

  return { stored: true as const };
}

async function loadReferralOwnerByCode(code: string): Promise<ReferralCodeOwner | null> {
  const normalizedCode = normalizeCircleCardReferralCode(code);

  if (!normalizedCode) {
    return null;
  }

  const ownerByCode = await prisma.user.findUnique({
    where: { circleCardReferralCode: normalizedCode },
    select: {
      id: true,
      name: true,
      email: true,
      circleCardReferralCode: true,
      foundingMember: true,
      circleCards: {
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (ownerByCode) {
    return ownerByCode;
  }

  const card = await prisma.circleCard.findUnique({
    where: { slug: normalizedCode },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          circleCardReferralCode: true,
          foundingMember: true,
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              id: true,
              slug: true,
              fullName: true,
              businessName: true
            }
          }
        }
      }
    }
  });

  return card?.user ?? null;
}

export async function ensureCircleCardReferralIdentityForUser(userId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      circleCardReferralCode: true,
      foundingMember: true,
      circleCards: {
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!owner) {
    return null;
  }

  if (owner.circleCardReferralCode) {
    return {
      userId: owner.id,
      code: owner.circleCardReferralCode,
      card: owner.circleCards[0] ?? null,
      created: false,
      isFounderAmbassador: owner.foundingMember
    };
  }

  const seed = referralCodeSeed(owner);
  const result = await prisma.$transaction(async (tx) => {
    const freshOwner = await tx.user.findUnique({
      where: { id: owner.id },
      select: {
        circleCardReferralCode: true,
        circleCards: {
          orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
          take: 1,
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true
          }
        }
      }
    });

    if (freshOwner?.circleCardReferralCode) {
      return {
        code: freshOwner.circleCardReferralCode,
        card: freshOwner.circleCards[0] ?? owner.circleCards[0] ?? null,
        created: false
      };
    }

    const code = await resolveUniqueReferralCode(tx, seed);
    await tx.user.update({
      where: { id: owner.id },
      data: { circleCardReferralCode: code }
    });

    return {
      code,
      card: freshOwner?.circleCards[0] ?? owner.circleCards[0] ?? null,
      created: true
    };
  });

  if (result.created) {
    await createReferralNotificationOnce({
      userId: owner.id,
      circleCardId: result.card?.id,
      title: "Your referral link is ready",
      message: "Share Circle Card with people who would benefit from a cleaner way to connect.",
      entityType: "CIRCLE_CARD_REFERRAL_LINK_READY",
      entityId: owner.id
    });
  }

  return {
    userId: owner.id,
    code: result.code,
    card: result.card,
    created: result.created,
    isFounderAmbassador: owner.foundingMember
  };
}

export async function recordCircleCardReferralClick(input: {
  code: string;
  source?: string | null;
  sourceType?: CircleCardReferralSourceType | string | null;
  sourceCardSlug?: string | null;
  sourceEvent?: string | null;
  visitorId?: string | null;
  viewerUserId?: string | null;
  userAgent?: string | null;
  requestedPath?: string | null;
}) {
  const requestedCode = normalizeCircleCardReferralCode(input.code);
  const owner = await loadReferralOwnerByCode(requestedCode);

  if (!owner || owner.id === input.viewerUserId) {
    return null;
  }

  const identity = owner.circleCardReferralCode
    ? {
        code: owner.circleCardReferralCode,
        card: owner.circleCards[0] ?? null
      }
    : await ensureCircleCardReferralIdentityForUser(owner.id);

  if (!identity) {
    return null;
  }

  const referral = await prisma.circleCardGrowthReferral.create({
    data: {
      referrerUserId: owner.id,
      referrerCardId: identity.card?.id ?? null,
      referralCode: identity.code,
      referralSource:
        input.source?.trim().slice(0, 80) ||
        normalizeCircleCardReferralSourceType(input.sourceType)?.slice(0, 80) ||
        "referral_link",
      visitorId: input.visitorId?.trim().slice(0, 120) || null,
      metadata: referralMetadata({
        requestedCode,
        requestedPath: input.requestedPath,
        userAgent: input.userAgent?.slice(0, 240) ?? null,
        sourceType: normalizeCircleCardReferralSourceType(input.sourceType),
        sourceCardSlug: normalizeCircleCardReferralSourceCardSlug(input.sourceCardSlug),
        sourceEvent: input.sourceEvent?.trim().slice(0, 80) || null
      })
    },
    select: {
      id: true,
      referralCode: true,
      referrerUserId: true,
      referrerCardId: true
    }
  });

  return referral;
}

export async function recordCircleCardReferralDiscoveryFromCard(input: {
  cardSlug: string;
  source?: string | null;
  sourceType?: CircleCardReferralSourceType | string | null;
  sourceEvent?: string | null;
  visitorId?: string | null;
  viewerUserId?: string | null;
  userAgent?: string | null;
  requestedPath?: string | null;
}) {
  const sourceCardSlug = normalizeCircleCardReferralSourceCardSlug(input.cardSlug);

  if (!sourceCardSlug) {
    return null;
  }

  const card = await prisma.circleCard.findUnique({
    where: { slug: sourceCardSlug },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          circleCardReferralCode: true,
          foundingMember: true,
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              id: true,
              slug: true,
              fullName: true,
              businessName: true
            }
          }
        }
      }
    }
  });

  if (!card || !card.isPublished || card.user.id === input.viewerUserId) {
    return null;
  }

  const identity = card.user.circleCardReferralCode
    ? {
        code: card.user.circleCardReferralCode,
        card
      }
    : await ensureCircleCardReferralIdentityForUser(card.user.id);

  if (!identity) {
    return null;
  }

  const sourceType =
    normalizeCircleCardReferralSourceType(input.sourceType) ?? "last_safe_source";
  const referral = await prisma.circleCardGrowthReferral.create({
    data: {
      referrerUserId: card.user.id,
      referrerCardId: card.id,
      referralCode: identity.code,
      referralSource: input.source?.trim().slice(0, 80) || sourceType,
      visitorId: input.visitorId?.trim().slice(0, 120) || null,
      metadata: referralMetadata({
        requestedPath: input.requestedPath,
        userAgent: input.userAgent?.slice(0, 240) ?? null,
        sourceType,
        sourceCardSlug: card.slug,
        sourceEvent: input.sourceEvent?.trim().slice(0, 80) || "CARD_DISCOVERY"
      })
    },
    select: {
      id: true,
      referralCode: true,
      referrerUserId: true,
      referrerCardId: true
    }
  });

  return referral;
}

async function loadAttributionReferral(input: {
  referralClickId?: string | null;
  referralCode?: string | null;
}) {
  if (input.referralClickId) {
    const referral = await prisma.circleCardGrowthReferral.findFirst({
      where: {
        id: input.referralClickId,
        referredUserId: null
      },
      orderBy: { clickedAt: "desc" },
      select: {
        id: true,
        referrerUserId: true,
        referrerCardId: true,
        referralCode: true,
        referralSource: true,
        metadata: true
      }
    });

    if (referral) {
      return referral;
    }
  }

  const code = normalizeCircleCardReferralCode(input.referralCode);

  if (!code) {
    return null;
  }

  return prisma.circleCardGrowthReferral.findFirst({
    where: {
      referralCode: code,
      referredUserId: null
    },
    orderBy: { clickedAt: "desc" },
    select: {
      id: true,
      referrerUserId: true,
      referrerCardId: true,
      referralCode: true,
      referralSource: true,
      metadata: true
    }
  });
}

async function notifyReferralSignupMilestones(input: {
  referrerUserId: string;
  referrerCardId: string | null;
  referralId: string;
  sourceType?: CircleCardReferralSourceType | null;
}) {
  const spinSignup = input.sourceType === "spin_to_connect";

  await createReferralNotificationOnce({
    userId: input.referrerUserId,
    circleCardId: input.referrerCardId,
    title: spinSignup
      ? "Someone spun your Circle and joined"
      : "Someone joined through your referral link",
    message: spinSignup
      ? "A visitor discovered Circle Card through Spin To Connect on your public profile."
      : "Your Circle Card referral link helped someone discover the platform.",
    entityType: "CIRCLE_CARD_REFERRAL_SIGNUP",
    entityId: input.referralId
  });

  const signupCount = await prisma.circleCardGrowthReferral.count({
    where: {
      referrerUserId: input.referrerUserId,
      signedUpAt: { not: null }
    }
  });

  if (signupCount === 1) {
    await createReferralNotificationOnce({
      userId: input.referrerUserId,
      circleCardId: input.referrerCardId,
      title: "You referred your first user",
      message: "Nice start. Your network is beginning to help Circle Card grow.",
      entityType: "CIRCLE_CARD_REFERRAL_MILESTONE",
      entityId: `${input.referrerUserId}:first`
    });
  }

  if (signupCount === 5) {
    await createReferralNotificationOnce({
      userId: input.referrerUserId,
      circleCardId: input.referrerCardId,
      title: "You referred 5 users",
      message: "Five people have now joined through your Circle Card referral link.",
      entityType: "CIRCLE_CARD_REFERRAL_MILESTONE",
      entityId: `${input.referrerUserId}:five`
    });
  }
}

export async function attributeCircleCardReferralSignup(input: {
  referredUserId: string;
  referralClickId?: string | null;
  referralCode?: string | null;
  referralSource?: string | null;
  sourceType?: CircleCardReferralSourceType | string | null;
  sourceCardSlug?: string | null;
  sourceEvent?: string | null;
}) {
  const referredUser = await prisma.user.findUnique({
    where: { id: input.referredUserId },
    select: { id: true }
  });

  if (!referredUser) {
    return { attributed: false as const, reason: "missing-user" as const };
  }

  const existingAttribution = await prisma.circleCardGrowthReferral.findUnique({
    where: { referredUserId: input.referredUserId },
    select: { id: true }
  });

  if (existingAttribution) {
    return { attributed: false as const, reason: "already-attributed" as const };
  }

  const referral = await loadAttributionReferral(input);
  const now = new Date();
  const sourceType = normalizeCircleCardReferralSourceType(input.sourceType);
  const sourceCardSlug = normalizeCircleCardReferralSourceCardSlug(input.sourceCardSlug);
  const sourceEvent = input.sourceEvent?.trim().slice(0, 80) || null;

  try {
    if (referral) {
      if (referral.referrerUserId === input.referredUserId) {
        return { attributed: false as const, reason: "self-referral" as const };
      }

      await prisma.circleCardGrowthReferral.update({
        where: { id: referral.id },
        data: {
          referredUserId: input.referredUserId,
          signedUpAt: now,
          activationStatus: "SIGNED_UP",
          referralSource:
            input.referralSource?.trim().slice(0, 80) || referral.referralSource || "circle_card_signup",
          metadata: {
            ...readReferralMetadata(referral.metadata),
            signupSourceType: sourceType,
            signupSourceCardSlug: sourceCardSlug || null,
            signupSourceEvent: sourceEvent,
            futureRewards: "tracked_after_pro_upgrade"
          } as Prisma.InputJsonObject
        }
      });

      await notifyReferralSignupMilestones({
        referrerUserId: referral.referrerUserId,
        referrerCardId: referral.referrerCardId,
        referralId: referral.id,
        sourceType
      });

      return { attributed: true as const, referralId: referral.id };
    }

    const owner = await loadReferralOwnerByCode(input.referralCode ?? "");
    const identity = owner ? await ensureCircleCardReferralIdentityForUser(owner.id) : null;

    if (!owner || !identity || owner.id === input.referredUserId) {
      return { attributed: false as const, reason: "missing-referrer" as const };
    }

    const created = await prisma.circleCardGrowthReferral.create({
      data: {
        referrerUserId: owner.id,
        referrerCardId: identity.card?.id ?? null,
        referredUserId: input.referredUserId,
        referralCode: identity.code,
        referralSource: input.referralSource?.trim().slice(0, 80) || "circle_card_signup",
        clickedAt: now,
        signedUpAt: now,
        activationStatus: "SIGNED_UP",
        metadata: referralMetadata({
          attribution: "signup_without_click_cookie",
          signupSourceType: sourceType,
          signupSourceCardSlug: sourceCardSlug || null,
          signupSourceEvent: sourceEvent,
          futureRewards: "tracked_after_pro_upgrade"
        })
      },
      select: {
        id: true,
        referrerUserId: true,
        referrerCardId: true
      }
    });

    await notifyReferralSignupMilestones({
      referrerUserId: created.referrerUserId,
      referrerCardId: created.referrerCardId,
      referralId: created.id,
      sourceType
    });

    return { attributed: true as const, referralId: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { attributed: false as const, reason: "already-attributed" as const };
    }

    throw error;
  }
}

export async function markCircleCardReferralActivationForUser(input: {
  userId: string;
  circleCardId?: string | null;
  completionScore?: number | null;
}) {
  const referral = await prisma.circleCardGrowthReferral.findUnique({
    where: { referredUserId: input.userId },
    select: {
      id: true,
      activatedAt: true,
      referrerUserId: true,
      referrerCardId: true,
      metadata: true
    }
  });

  if (!referral || referral.activatedAt) {
    return { marked: false as const };
  }

  await prisma.circleCardGrowthReferral.update({
    where: { id: referral.id },
    data: {
      activatedAt: new Date(),
      activationStatus: "ACTIVATED",
      metadata: {
        ...readReferralMetadata(referral.metadata),
        activationSource: "circle_card_completion",
        completionScore: input.completionScore ?? null,
        activatedCardId: input.circleCardId ?? null
      } as Prisma.InputJsonObject
    }
  });

  await createReferralNotificationOnce({
    userId: referral.referrerUserId,
    circleCardId: referral.referrerCardId,
    title: "One of your referrals completed their Circle Card",
    message: "A person who joined through your referral link has completed the key setup steps.",
    entityType: "CIRCLE_CARD_REFERRAL_ACTIVATION",
    entityId: referral.id
  });

  return { marked: true as const, referralId: referral.id };
}

export async function markCircleCardReferralProductInterest(input: {
  product: "PRO" | "TEAMS";
  userId?: string | null;
  referralClickId?: string | null;
  referralCode?: string | null;
  source?: string | null;
}) {
  const now = new Date();
  const productData =
    input.product === "PRO"
      ? { proInterestAt: now }
      : { teamsInterestAt: now };
  const existing = input.userId
    ? await prisma.circleCardGrowthReferral.findUnique({
        where: { referredUserId: input.userId },
        select: { id: true, proInterestAt: true, teamsInterestAt: true }
      })
    : await loadAttributionReferral(input);

  if (existing) {
    await prisma.circleCardGrowthReferral.update({
      where: { id: existing.id },
      data: productData
    });

    return { marked: true as const, referralId: existing.id };
  }

  const owner = await loadReferralOwnerByCode(input.referralCode ?? "");
  const identity = owner ? await ensureCircleCardReferralIdentityForUser(owner.id) : null;

  if (!owner || !identity || owner.id === input.userId) {
    return { marked: false as const };
  }

  const referral = await prisma.circleCardGrowthReferral.create({
    data: {
      referrerUserId: owner.id,
      referrerCardId: identity.card?.id ?? null,
      referralCode: identity.code,
      referralSource: input.source?.trim().slice(0, 80) || "circle_card_product_interest",
      clickedAt: now,
      ...productData,
      metadata: referralMetadata({
        productInterest: input.product
      })
    },
    select: { id: true }
  });

  return { marked: true as const, referralId: referral.id };
}

function referralDisplayName(user: {
  name: string | null;
  email: string;
  circleCards?: Array<{ fullName: string; businessName: string | null }>;
}) {
  const card = user.circleCards?.[0];

  return card?.businessName
    ? `${card.fullName} / ${card.businessName}`
    : card?.fullName || user.name || user.email;
}

export async function getCircleCardReferralCentreForUser(userId: string) {
  const identity = await ensureCircleCardReferralIdentityForUser(userId);

  if (!identity) {
    return null;
  }

  const [clicks, signups, activated, proReferrals, teamsReferrals, recentReferrals] =
    await Promise.all([
      prisma.circleCardGrowthReferral.count({
        where: { referrerUserId: userId }
      }),
      prisma.circleCardGrowthReferral.count({
        where: { referrerUserId: userId, signedUpAt: { not: null } }
      }),
      prisma.circleCardGrowthReferral.count({
        where: { referrerUserId: userId, activatedAt: { not: null } }
      }),
      prisma.circleCardGrowthReferral.count({
        where: { referrerUserId: userId, proInterestAt: { not: null } }
      }),
      prisma.circleCardGrowthReferral.count({
        where: { referrerUserId: userId, teamsInterestAt: { not: null } }
      }),
      prisma.circleCardGrowthReferral.findMany({
        where: {
          referrerUserId: userId,
          OR: [
            { signedUpAt: { not: null } },
            { activatedAt: { not: null } },
            { proInterestAt: { not: null } },
            { teamsInterestAt: { not: null } }
          ]
        },
        orderBy: [{ updatedAt: "desc" }, { clickedAt: "desc" }],
        take: REFERRAL_RECENT_LIMIT,
        select: {
          id: true,
          referralSource: true,
          clickedAt: true,
          signedUpAt: true,
          activatedAt: true,
          activationStatus: true,
          proInterestAt: true,
          teamsInterestAt: true,
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
              circleCards: {
                orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
                take: 1,
                select: {
                  fullName: true,
                  businessName: true
                }
              }
            }
          }
        }
      })
    ]);

  return {
    identity,
    stats: {
      clicks,
      signups,
      activated,
      proReferrals,
      teamsReferrals
    },
    insights: {
      referredButInactive: Math.max(signups - activated, 0),
      referredButIncomplete: Math.max(signups - activated, 0),
      referredAndActivated: activated,
      likelyProCandidates: proReferrals
    },
    rewardAwareness: getCircleCardReferralRewardAwareness({
      activatedReferralCount: activated,
      isFounderAmbassador: identity.isFounderAmbassador
    }),
    recentReferrals: recentReferrals.map((referral) => ({
      id: referral.id,
      name: referral.referredUser ? referralDisplayName(referral.referredUser) : "Pending signup",
      email: referral.referredUser?.email ?? null,
      referralSource: referral.referralSource,
      clickedAt: referral.clickedAt,
      signedUpAt: referral.signedUpAt,
      activatedAt: referral.activatedAt,
      activationStatus: sanitizeStatus(referral.activationStatus),
      proInterestAt: referral.proInterestAt,
      teamsInterestAt: referral.teamsInterestAt
    }))
  };
}

type AdminReferralSort = "clicks" | "signups" | "activations" | "pro" | "teams";

function mergeCount(
  target: Map<string, number>,
  rows: Array<{ referrerUserId: string; _count: { _all: number } }>
) {
  for (const row of rows) {
    target.set(row.referrerUserId, (target.get(row.referrerUserId) ?? 0) + row._count._all);
  }
}

export async function getAdminCircleCardReferralEngineDashboard(input: {
  sort?: string | null;
} = {}) {
  const sort = (
    input.sort === "signups" ||
    input.sort === "activations" ||
    input.sort === "pro" ||
    input.sort === "teams"
      ? input.sort
      : "clicks"
  ) as AdminReferralSort;

  const [
    totalClicks,
    totalSignups,
    totalActivations,
    totalProInterest,
    totalTeamsInterest,
    directReferralClicks,
    publicCardReferralClicks,
    spinToConnectReferralClicks,
    clickGroups,
    signupGroups,
    activationGroups,
    proGroups,
    teamsGroups,
    recentReferrals
  ] = await Promise.all([
    prisma.circleCardGrowthReferral.count(),
    prisma.circleCardGrowthReferral.count({ where: { signedUpAt: { not: null } } }),
    prisma.circleCardGrowthReferral.count({ where: { activatedAt: { not: null } } }),
    prisma.circleCardGrowthReferral.count({ where: { proInterestAt: { not: null } } }),
    prisma.circleCardGrowthReferral.count({ where: { teamsInterestAt: { not: null } } }),
    prisma.circleCardGrowthReferral.count({
      where: {
        referralSource: {
          in: [
            "referral_link",
            "direct_referral_route",
            "circle_card_query",
            "circle_card_landing_ref"
          ]
        }
      }
    }),
    prisma.circleCardGrowthReferral.count({ where: { referralSource: "public_card_ref" } }),
    prisma.circleCardGrowthReferral.count({ where: { referralSource: "spin_to_connect" } }),
    prisma.circleCardGrowthReferral.groupBy({
      by: ["referrerUserId"],
      _count: { _all: true }
    }),
    prisma.circleCardGrowthReferral.groupBy({
      by: ["referrerUserId"],
      where: { signedUpAt: { not: null } },
      _count: { _all: true }
    }),
    prisma.circleCardGrowthReferral.groupBy({
      by: ["referrerUserId"],
      where: { activatedAt: { not: null } },
      _count: { _all: true }
    }),
    prisma.circleCardGrowthReferral.groupBy({
      by: ["referrerUserId"],
      where: { proInterestAt: { not: null } },
      _count: { _all: true }
    }),
    prisma.circleCardGrowthReferral.groupBy({
      by: ["referrerUserId"],
      where: { teamsInterestAt: { not: null } },
      _count: { _all: true }
    }),
    prisma.circleCardGrowthReferral.findMany({
      orderBy: [{ updatedAt: "desc" }, { clickedAt: "desc" }],
      take: ADMIN_REFERRAL_RECENT_LIMIT,
      select: {
        id: true,
        referralCode: true,
        referralSource: true,
        metadata: true,
        clickedAt: true,
        signedUpAt: true,
        activatedAt: true,
        activationStatus: true,
        proInterestAt: true,
        teamsInterestAt: true,
        referrerUser: {
          select: {
            id: true,
            name: true,
            email: true,
            circleCards: {
              orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
              take: 1,
              select: {
                fullName: true,
                businessName: true,
                slug: true
              }
            }
          }
        },
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            circleCards: {
              orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
              take: 1,
              select: {
                fullName: true,
                businessName: true,
                slug: true
              }
            }
          }
        }
      }
    })
  ]);

  const scoreByUserId = new Map<string, number>();
  const selectedGroups =
    sort === "signups"
      ? signupGroups
      : sort === "activations"
        ? activationGroups
        : sort === "pro"
          ? proGroups
          : sort === "teams"
            ? teamsGroups
            : clickGroups;
  mergeCount(scoreByUserId, selectedGroups);

  const topUserIds = Array.from(scoreByUserId.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, ADMIN_TOP_REFERRER_LIMIT)
    .map(([userId]) => userId);
  const referrerUsers = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
          circleCardReferralCode: true,
          circleCards: {
            orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              slug: true,
              fullName: true,
              businessName: true
            }
          }
        }
      })
    : [];
  const userById = new Map(referrerUsers.map((user) => [user.id, user]));

  return {
    sort,
    funnel: {
      clicks: totalClicks,
      signups: totalSignups,
      activations: totalActivations,
      proInterest: totalProInterest,
      teamsInterest: totalTeamsInterest,
      directReferralClicks,
      publicCardReferralClicks,
      spinToConnectReferralClicks
    },
    insights: {
      referredButInactive: Math.max(totalSignups - totalActivations, 0),
      referredButIncomplete: Math.max(totalSignups - totalActivations, 0),
      referredAndActivated: totalActivations,
      likelyProCandidates: totalProInterest
    },
    topReferrers: topUserIds.map((userId) => {
      const user = userById.get(userId);

      return {
        userId,
        name: user ? referralDisplayName(user) : "Unknown referrer",
        email: user?.email ?? null,
        code: user?.circleCardReferralCode ?? null,
        cardSlug: user?.circleCards[0]?.slug ?? null,
        metricValue: scoreByUserId.get(userId) ?? 0
      };
    }),
    recentReferrals: recentReferrals.map((referral) => ({
      id: referral.id,
      referralCode: referral.referralCode,
      referralSource: referral.referralSource,
      sourceType:
        typeof readReferralMetadata(referral.metadata).sourceType === "string"
          ? (readReferralMetadata(referral.metadata).sourceType as string)
          : null,
      sourceCardSlug:
        typeof readReferralMetadata(referral.metadata).sourceCardSlug === "string"
          ? (readReferralMetadata(referral.metadata).sourceCardSlug as string)
          : null,
      sourceEvent:
        typeof readReferralMetadata(referral.metadata).sourceEvent === "string"
          ? (readReferralMetadata(referral.metadata).sourceEvent as string)
          : null,
      clickedAt: referral.clickedAt,
      signedUpAt: referral.signedUpAt,
      activatedAt: referral.activatedAt,
      activationStatus: sanitizeStatus(referral.activationStatus),
      proInterestAt: referral.proInterestAt,
      teamsInterestAt: referral.teamsInterestAt,
      referrer: {
        id: referral.referrerUser.id,
        name: referralDisplayName(referral.referrerUser),
        email: referral.referrerUser.email,
        cardSlug: referral.referrerUser.circleCards[0]?.slug ?? null
      },
      referredUser: referral.referredUser
        ? {
            id: referral.referredUser.id,
            name: referralDisplayName(referral.referredUser),
            email: referral.referredUser.email,
            cardSlug: referral.referredUser.circleCards[0]?.slug ?? null
          }
        : null
    }))
  };
}

export async function refreshCircleCardReferralActivationForUser(input: {
  userId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      image: true,
      profile: {
        select: {
          bio: true,
          location: true,
          website: true,
          linkedin: true,
          instagram: true,
          facebook: true,
          tiktok: true,
          youtube: true,
          business: {
            select: {
              companyName: true,
              website: true
            }
          }
        }
      },
      circleCards: {
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          profileImageUrl: true,
          businessName: true,
          about: true,
          location: true,
          email: true,
          phone: true,
          websiteUrl: true,
          socialLinks: true,
          customLinks: {
            select: {
              id: true,
              isActive: true
            }
          }
        }
      }
    }
  });
  const card = user?.circleCards[0];

  if (!user || !card) {
    return { marked: false as const };
  }

  const shareCount = await prisma.circleCardEvent.count({
    where: {
      cardId: card.id,
      eventType: {
        in: [
          CircleCardEventType.SHARE,
          CircleCardEventType.CONNECT_HUB_SHARE,
          CircleCardEventType.CONNECT_HUB_COPY_LINK
        ]
      }
    }
  });
  const completion = calculateCircleCardCompletionForCard(
    {
      ...card,
      user
    },
    shareCount
  );

  if (!completion.activationComplete) {
    return { marked: false as const, completionScore: completion.score };
  }

  return markCircleCardReferralActivationForUser({
    userId: user.id,
    circleCardId: card.id,
    completionScore: completion.score
  });
}
