import "server-only";

import {
  CircleCardActivityType,
  CircleCardAccountType,
  CircleCardEventType,
  CircleCardReportReason,
  CircleCardReportStatus,
  Prisma,
  SubscriptionStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
  CIRCLE_CARD_PLANS,
  type CircleCardPlanKey
} from "@/lib/circle-card/plans";
import {
  buildCircleCardUpgradeTriggers,
  calculateCircleCardUpgradeReadiness,
  hasCircleCardTeamsOrganisationSignal,
  type CircleCardUpgradeUsageSnapshot
} from "@/lib/circle-card/upgrade-triggers";
import { requireAdmin } from "@/lib/session";
import {
  calculateCircleCardCompletionForCard,
  getCircleCardActivationSnapshot
} from "@/server/circle-card/activation.service";

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
];

const TOP_CARD_LIMIT = 5;
const RECENT_LIMIT = 10;
const SEARCH_LIMIT = 8;
const RAW_EVENT_LIMIT = 8;
const CIRCLE_CARD_SHARE_EVENT_TYPES: CircleCardEventType[] = [
  CircleCardEventType.SHARE,
  CircleCardEventType.CONNECT_HUB_SHARE,
  CircleCardEventType.CONNECT_HUB_COPY_LINK
];
const CIRCLE_CARD_GROWTH_EVENT_TYPES: CircleCardEventType[] = [
  CircleCardEventType.CARD_VIEW,
  CircleCardEventType.WALLET_SAVE,
  CircleCardEventType.SHARE,
  CircleCardEventType.CONNECT_HUB_SHARE,
  CircleCardEventType.CONNECT_HUB_COPY_LINK,
  CircleCardEventType.CUSTOM_LINK_CLICK,
  CircleCardEventType.REFERRAL_CREATED,
  CircleCardEventType.OPPORTUNITY_CREATED
];

const RELATIONSHIP_ACTIVITY_TYPES: CircleCardActivityType[] = [
  CircleCardActivityType.CONNECTION_REQUEST_SENT,
  CircleCardActivityType.CONNECTION_ACCEPTED,
  CircleCardActivityType.RECOMMENDATION_CREATED,
  CircleCardActivityType.RECOMMENDATION_RECEIVED,
  CircleCardActivityType.INTRODUCTION_CREATED,
  CircleCardActivityType.INTRODUCTION_ACCEPTED,
  CircleCardActivityType.INTRODUCTION_DECLINED,
  CircleCardActivityType.INTRODUCTION_COMPLETED,
  CircleCardActivityType.REFERRAL_CREATED,
  CircleCardActivityType.REFERRAL_RECEIVED,
  CircleCardActivityType.REFERRAL_ACCEPTED,
  CircleCardActivityType.REFERRAL_WON,
  CircleCardActivityType.REFERRAL_LOST,
  CircleCardActivityType.OPPORTUNITY_CREATED,
  CircleCardActivityType.OPPORTUNITY_UPDATED,
  CircleCardActivityType.OPPORTUNITY_WON,
  CircleCardActivityType.OPPORTUNITY_LOST
];

type CountLike = bigint | number | string | null | undefined;

type SourceCountRow = {
  source: string | null;
  count: CountLike;
};

type TopClickedLinkRow = {
  id: string;
  label: string;
  type: string;
  visibility: string;
  cardId: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  ownerId: string;
  ownerEmail: string;
  clicks: CountLike;
};

export type AdminCircleCardTopCard = {
  id: string;
  name: string;
  businessName: string | null;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  metricValue: number;
};

export type AdminCircleCardActiveUser = {
  userId: string;
  name: string | null;
  email: string;
  metricValue: number;
  primaryCard: {
    id: string;
    slug: string;
    fullName: string;
    businessName: string | null;
  } | null;
};

export type AdminCircleCardPlanCandidate = {
  userId: string;
  ownerName: string | null;
  ownerEmail: string;
  cardId: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  accountType: CircleCardAccountType | null;
  reasons: string[];
  score: number;
  readinessScore: number;
  readinessLabel: string;
};

export type AdminCircleCardCommandCentre = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>;

function toNumber(value: CountLike) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10) || 0;
  }

  return 0;
}

function buildDateWindow() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    startOfToday,
    weekAgo,
    monthAgo
  };
}

function cardWhereForSearch(query: string): Prisma.CircleCardWhereInput {
  return {
    OR: [
      {
        fullName: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        businessName: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        slug: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        user: {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              email: {
                contains: query,
                mode: "insensitive"
              }
            }
          ]
        }
      }
    ]
  };
}

function userWhereForSearch(query: string): Prisma.UserWhereInput {
  return {
    OR: [
      {
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        email: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        circleCards: {
          some: {
            OR: [
              {
                fullName: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                businessName: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                slug: {
                  contains: query,
                  mode: "insensitive"
                }
              }
            ]
          }
        }
      }
    ]
  };
}

function mapCard(card: {
  id: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  user: {
    id: string;
    email: string;
  };
}) {
  return {
    id: card.id,
    name: card.fullName,
    businessName: card.businessName,
    slug: card.slug,
    ownerId: card.user.id,
    ownerEmail: card.user.email
  };
}

async function loadCardSummaries(cardIds: string[]) {
  if (!cardIds.length) {
    return new Map<string, ReturnType<typeof mapCard>>();
  }

  const cards = await db.circleCard.findMany({
    where: {
      id: {
        in: cardIds
      }
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  return new Map(cards.map((card) => [card.id, mapCard(card)]));
}

async function topCardsFromGroups(
  groups: Array<{ cardId: string | null; count: number }>
): Promise<AdminCircleCardTopCard[]> {
  const cardIds = groups.map((group) => group.cardId).filter((cardId): cardId is string => Boolean(cardId));
  const cards = await loadCardSummaries(cardIds);

  return groups
    .map((group) => {
      if (!group.cardId) {
        return null;
      }

      const card = cards.get(group.cardId);
      if (!card) {
        return null;
      }

      return {
        ...card,
        metricValue: group.count
      };
    })
    .filter((card): card is AdminCircleCardTopCard => Boolean(card));
}

async function loadTopSavedCards() {
  const groups = await db.circleWalletContact.groupBy({
    by: ["cardId"],
    where: {
      cardId: {
        not: null
      }
    },
    _count: {
      cardId: true
    },
    orderBy: {
      _count: {
        cardId: "desc"
      }
    },
    take: TOP_CARD_LIMIT
  });

  return topCardsFromGroups(
    groups.map((group) => ({
      cardId: group.cardId,
      count: group._count.cardId
    }))
  );
}

async function loadTopEventCards(eventType: CircleCardEventType) {
  const groups = await db.circleCardEvent.groupBy({
    by: ["cardId"],
    where: {
      eventType
    },
    _count: {
      cardId: true
    },
    orderBy: {
      _count: {
        cardId: "desc"
      }
    },
    take: TOP_CARD_LIMIT
  });

  return topCardsFromGroups(
    groups.map((group) => ({
      cardId: group.cardId,
      count: group._count.cardId
    }))
  );
}

async function loadTopRecommendedCards() {
  const groups = await db.circleCardRecommendation.groupBy({
    by: ["recommendedCardId"],
    where: {
      recommendedCardId: {
        not: null
      },
      status: "ACTIVE"
    },
    _count: {
      recommendedCardId: true
    },
    orderBy: {
      _count: {
        recommendedCardId: "desc"
      }
    },
    take: TOP_CARD_LIMIT
  });

  return topCardsFromGroups(
    groups.map((group) => ({
      cardId: group.recommendedCardId,
      count: group._count.recommendedCardId
    }))
  );
}

async function loadTopSuccessfulReferralCards() {
  const groups = await db.circleCardReferral.groupBy({
    by: ["recipientCardId"],
    where: {
      recipientCardId: {
        not: null
      },
      status: "WON"
    },
    _count: {
      recipientCardId: true
    },
    orderBy: {
      _count: {
        recipientCardId: "desc"
      }
    },
    take: TOP_CARD_LIMIT
  });

  return topCardsFromGroups(
    groups.map((group) => ({
      cardId: group.recipientCardId,
      count: group._count.recipientCardId
    }))
  );
}

async function loadTopViewedCards() {
  const cards = await db.circleCard.findMany({
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take: TOP_CARD_LIMIT,
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      viewCount: true,
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  return cards.map((card) => ({
    ...mapCard(card),
    metricValue: card.viewCount
  }));
}

async function loadFastestGrowingCards(since: Date) {
  const groups = await db.circleCardEvent.groupBy({
    by: ["cardId"],
    where: {
      createdAt: {
        gte: since
      },
      eventType: {
        in: CIRCLE_CARD_GROWTH_EVENT_TYPES
      }
    },
    _count: {
      cardId: true
    },
    orderBy: {
      _count: {
        cardId: "desc"
      }
    },
    take: TOP_CARD_LIMIT
  });

  return topCardsFromGroups(
    groups.map((group) => ({
      cardId: group.cardId,
      count: group._count.cardId
    }))
  );
}

async function loadMostActiveUsers(since: Date): Promise<AdminCircleCardActiveUser[]> {
  const groups = await db.circleCardActivity.groupBy({
    by: ["userId"],
    where: {
      createdAt: {
        gte: since
      }
    },
    _count: {
      userId: true
    },
    orderBy: {
      _count: {
        userId: "desc"
      }
    },
    take: RECENT_LIMIT
  });
  const userIds = groups.map((group) => group.userId);

  if (!userIds.length) {
    return [];
  }

  const users = await db.user.findMany({
    where: {
      id: {
        in: userIds
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
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
  const userMap = new Map(users.map((user) => [user.id, user]));
  const activeUsers: AdminCircleCardActiveUser[] = [];

  for (const group of groups) {
    const user = userMap.get(group.userId);

    if (!user) {
      continue;
    }

    activeUsers.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      metricValue: group._count.userId,
      primaryCard: user.circleCards[0] ?? null
    });
  }

  return activeUsers;
}

async function loadSourceViewCounts() {
  const rows = await db.$queryRaw<SourceCountRow[]>`
    SELECT
      COALESCE(NULLIF(metadata->>'source', ''), 'direct') AS source,
      COUNT(*)::bigint AS count
    FROM "CircleCardEvent"
    WHERE "eventType" = 'CARD_VIEW'
    GROUP BY COALESCE(NULLIF(metadata->>'source', ''), 'direct')
  `;

  const sourceCounts = new Map(rows.map((row) => [row.source ?? "direct", toNumber(row.count)]));

  return {
    direct: sourceCounts.get("direct") ?? 0,
    qr: sourceCounts.get("qr") ?? 0,
    nfc: sourceCounts.get("nfc") ?? 0,
    event: sourceCounts.get("event") ?? 0
  };
}

async function loadMostClickedLinks() {
  const rows = await db.$queryRaw<TopClickedLinkRow[]>`
    SELECT
      l.id,
      l.label,
      l.type,
      l.visibility,
      l."cardId",
      c.slug,
      c."fullName",
      c."businessName",
      u.id AS "ownerId",
      u.email AS "ownerEmail",
      COUNT(e.id)::bigint AS clicks
    FROM "CircleCardEvent" e
    INNER JOIN "CircleCardLink" l ON l.id = e.metadata->>'linkId'
    INNER JOIN "CircleCard" c ON c.id = l."cardId"
    INNER JOIN "User" u ON u.id = c."userId"
    WHERE e."eventType" = 'CUSTOM_LINK_CLICK'
    GROUP BY
      l.id,
      l.label,
      l.type,
      l.visibility,
      l."cardId",
      c.slug,
      c."fullName",
      c."businessName",
      u.id,
      u.email
    ORDER BY COUNT(e.id) DESC
    LIMIT ${RAW_EVENT_LIMIT}
  `;

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    type: row.type,
    visibility: row.visibility,
    cardId: row.cardId,
    cardName: row.fullName,
    businessName: row.businessName,
    slug: row.slug,
    ownerId: row.ownerId,
    ownerEmail: row.ownerEmail,
    clicks: toNumber(row.clicks)
  }));
}

async function loadSearch(query: string) {
  const normalizedQuery = query.trim().slice(0, 80);

  if (normalizedQuery.length < 2) {
    return {
      query: normalizedQuery,
      cards: [],
      users: [],
      active: false
    };
  }

  const [cards, users] = await Promise.all([
    db.circleCard.findMany({
      where: cardWhereForSearch(normalizedQuery),
      orderBy: [{ updatedAt: "desc" }],
      take: SEARCH_LIMIT,
      select: {
        id: true,
        slug: true,
        fullName: true,
        businessName: true,
        isPublished: true,
        updatedAt: true,
        viewCount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    db.user.findMany({
      where: userWhereForSearch(normalizedQuery),
      orderBy: [{ updatedAt: "desc" }],
      take: SEARCH_LIMIT,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        registrationSource: true,
        createdAt: true,
        circleCards: {
          orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
          take: 3,
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true,
            isPublished: true
          }
        },
        subscription: {
          select: {
            status: true
          }
        }
      }
    })
  ]);

  return {
    query: normalizedQuery,
    cards,
    users,
    active: true
  };
}

type PlanBoundaryCandidateCard = {
  id: string;
  slug: string;
  fullName: string;
  businessName: string | null;
  accountType: CircleCardAccountType | null;
  role: string | null;
  tagline: string | null;
  about: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  profileImageUrl: string | null;
  socialLinks: Prisma.JsonValue;
  identityTags: string[];
  viewCount: number;
  customLinks: Array<{
    id: string;
    isActive: boolean;
    fileUrl: string | null;
    fileName: string | null;
    fileMimeType: string | null;
  }>;
  _count: {
    events: number;
    walletContacts: number;
    opportunities: number;
    introductionsMade: number;
    introductionsAsPersonA: number;
    introductionsAsPersonB: number;
    referralsMade: number;
    referralsReceived: number;
    recommendationsReceived: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    profile: {
      bio: string | null;
      location: string | null;
      website: string | null;
      linkedin: string | null;
      instagram: string | null;
      facebook: string | null;
      tiktok: string | null;
      youtube: string | null;
      business: {
        companyName: string | null;
        website: string | null;
      } | null;
    } | null;
  };
};

function mapPlanCandidate(
  card: PlanBoundaryCandidateCard,
  extraReasons: string[] = []
): AdminCircleCardPlanCandidate {
  const activeLinkCount = card.customLinks.filter((link) => link.isActive).length;
  const hasFileBackedLinks = card.customLinks.some((link) =>
    Boolean(link.fileUrl || link.fileName || link.fileMimeType)
  );
  const shareCount = card._count.events;
  const introductionCount =
    card._count.introductionsMade + card._count.introductionsAsPersonA + card._count.introductionsAsPersonB;
  const referralCount = card._count.referralsMade + card._count.referralsReceived;
  const completion = calculateCircleCardCompletionForCard(card, shareCount);
  const usageSnapshot: CircleCardUpgradeUsageSnapshot = {
    activeFeaturedLinks: activeLinkCount,
    featuredLinkLimit: CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
    walletContacts: card._count.walletContacts,
    cardViews: card.viewCount,
    shares: shareCount,
    profileCompletion: completion.score,
    socialProfiles: 0,
    referrals: referralCount,
    introductions: introductionCount,
    opportunities: card._count.opportunities,
    accountType: card.accountType,
    businessName: card.businessName,
    role: card.role,
    tagline: card.tagline,
    about: card.about,
    identityTags: card.identityTags
  };
  const readiness = calculateCircleCardUpgradeReadiness(usageSnapshot);
  const triggers = buildCircleCardUpgradeTriggers(usageSnapshot);
  const reasons = [...extraReasons];

  if (card.accountType === CircleCardAccountType.FOUNDER) {
    reasons.push("Founder / Business Owner account type");
  }

  if (card.businessName) {
    reasons.push("Business name on public card");
  }

  if (activeLinkCount >= CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT) {
    reasons.push("At Free featured link limit");
  }

  if (hasFileBackedLinks) {
    reasons.push("Uses file-backed links during early access");
  }

  if (card._count.opportunities > 0) {
    reasons.push("Tracks opportunities");
  }

  if (referralCount > 0) {
    reasons.push("Referral activity");
  }

  if (introductionCount > 0) {
    reasons.push("Introduction activity");
  }

  if (card._count.recommendationsReceived > 0) {
    reasons.push("Has recommendations");
  }

  if (card.viewCount >= 25) {
    reasons.push("Meaningful public-card traffic");
  }

  if (card._count.walletContacts > 0) {
    reasons.push("Saved by other wallets");
  }

  if (hasCircleCardTeamsOrganisationSignal(usageSnapshot)) {
    reasons.push("Company or staff language");
  }

  reasons.push(
    ...triggers.pro.map((trigger) => trigger.title),
    ...triggers.teams.map((trigger) => trigger.title),
    ...readiness.reasons
  );

  const uniqueReasons = Array.from(new Set(reasons));

  return {
    userId: card.user.id,
    ownerName: card.user.name,
    ownerEmail: card.user.email,
    cardId: card.id,
    slug: card.slug,
    fullName: card.fullName,
    businessName: card.businessName,
    accountType: card.accountType,
    reasons: uniqueReasons,
    score: uniqueReasons.length,
    readinessScore: readiness.score,
    readinessLabel: readiness.label
  };
}

async function loadLikelyProUsers() {
  const cards = await db.circleCard.findMany({
    where: {
      OR: [
        { accountType: CircleCardAccountType.FOUNDER },
        {
          customLinks: {
            some: {
              isActive: true
            }
          }
        },
        {
          customLinks: {
            some: {
              OR: [
                {
                  fileUrl: {
                    not: null
                  }
                },
                {
                  fileName: {
                    not: null
                  }
                },
                {
                  fileMimeType: {
                    not: null
                  }
                }
              ]
            }
          }
        },
        {
          opportunities: {
            some: {}
          }
        },
        {
          referralsMade: {
            some: {}
          }
        },
        {
          recommendationsReceived: {
            some: {
              status: "ACTIVE"
            }
          }
        },
        {
          walletContacts: {
            some: {}
          }
        },
        {
          events: {
            some: {
              eventType: {
                in: CIRCLE_CARD_SHARE_EVENT_TYPES
              }
            }
          }
        },
        {
          viewCount: {
            gte: 25
          }
        }
      ]
    },
    orderBy: [{ updatedAt: "desc" }, { viewCount: "desc" }],
    take: RECENT_LIMIT,
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      accountType: true,
      role: true,
      tagline: true,
      about: true,
      location: true,
      email: true,
      phone: true,
      websiteUrl: true,
      profileImageUrl: true,
      socialLinks: true,
      identityTags: true,
      viewCount: true,
      customLinks: {
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        take: CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT + 1,
        select: {
          id: true,
          isActive: true,
          fileUrl: true,
          fileName: true,
          fileMimeType: true
        }
      },
      _count: {
        select: {
          events: {
            where: {
              eventType: {
                in: CIRCLE_CARD_SHARE_EVENT_TYPES
              }
            }
          },
          walletContacts: true,
          opportunities: true,
          introductionsMade: true,
          introductionsAsPersonA: true,
          introductionsAsPersonB: true,
          referralsMade: true,
          referralsReceived: true,
          recommendationsReceived: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
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
          }
        }
      }
    }
  });

  return cards
    .map((card) => mapPlanCandidate(card))
    .sort((a, b) => b.readinessScore - a.readinessScore || b.score - a.score);
}

async function loadLikelyTeamsUsers() {
  const cards = await db.circleCard.findMany({
    where: {
      OR: [
        { accountType: CircleCardAccountType.TEAM },
        { businessName: { contains: "Ltd", mode: "insensitive" } },
        { businessName: { contains: "Limited", mode: "insensitive" } },
        { businessName: { contains: "Group", mode: "insensitive" } },
        { businessName: { contains: "Agency", mode: "insensitive" } },
        { about: { contains: "staff", mode: "insensitive" } },
        { about: { contains: "team", mode: "insensitive" } },
        { about: { contains: "employees", mode: "insensitive" } },
        { introductionsMade: { some: {} } },
        { introductionsAsPersonA: { some: {} } },
        { introductionsAsPersonB: { some: {} } },
        { referralsMade: { some: {} } },
        { referralsReceived: { some: {} } },
        { opportunities: { some: {} } }
      ]
    },
    orderBy: [{ updatedAt: "desc" }],
    take: RECENT_LIMIT,
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      accountType: true,
      role: true,
      tagline: true,
      about: true,
      location: true,
      email: true,
      phone: true,
      websiteUrl: true,
      profileImageUrl: true,
      socialLinks: true,
      identityTags: true,
      viewCount: true,
      customLinks: {
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        take: CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT + 1,
        select: {
          id: true,
          isActive: true,
          fileUrl: true,
          fileName: true,
          fileMimeType: true
        }
      },
      _count: {
        select: {
          events: {
            where: {
              eventType: {
                in: CIRCLE_CARD_SHARE_EVENT_TYPES
              }
            }
          },
          walletContacts: true,
          opportunities: true,
          introductionsMade: true,
          introductionsAsPersonA: true,
          introductionsAsPersonB: true,
          referralsMade: true,
          referralsReceived: true,
          recommendationsReceived: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
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
          }
        }
      }
    }
  });

  return cards
    .map((card) =>
      mapPlanCandidate(card, [
        "Team / Organisation account type",
        "Free is for personal use"
      ])
    )
    .sort((a, b) => b.readinessScore - a.readinessScore || b.score - a.score);
}

async function loadCircleCardPlanBoundary() {
  const [
    totalCircleCardUsers,
    accountTypeGroups,
    likelyProUsers,
    likelyTeamsUsers,
    proInterestCount,
    teamsInterestCount
  ] =
    await Promise.all([
      db.user.count({
        where: {
          circleCards: {
            some: {}
          }
        }
      }),
      db.circleCard.groupBy({
        by: ["accountType"],
        _count: {
          _all: true
        }
      }),
      loadLikelyProUsers(),
      loadLikelyTeamsUsers(),
      db.lead.count({
        where: {
          OR: [
            { tags: { hasSome: ["pro-interest", "circle-card-pro"] } },
            { sourceLabel: { contains: "Circle Card Pro Interest", mode: "insensitive" } }
          ]
        }
      }),
      db.lead.count({
        where: {
          OR: [
            { tags: { hasSome: ["teams-interest", "circle-card-teams"] } },
            { sourceLabel: { contains: "Circle Card Teams Interest", mode: "insensitive" } }
          ]
        }
      })
    ]);

  const planCounts = CIRCLE_CARD_PLANS.reduce(
    (counts, plan) => ({
      ...counts,
      [plan]: plan === "FREE" ? totalCircleCardUsers : 0
    }),
    {} as Record<CircleCardPlanKey, number>
  );
  const accountTypeCounts = {
    INDIVIDUAL: 0,
    FOUNDER: 0,
    TEAM: 0,
    UNKNOWN: 0
  };

  accountTypeGroups.forEach((group) => {
    if (!group.accountType) {
      accountTypeCounts.UNKNOWN += group._count._all;
      return;
    }

    accountTypeCounts[group.accountType] = group._count._all;
  });

  return {
    counts: planCounts,
    accountTypeCounts,
    proInterestCount,
    teamsInterestCount,
    likelyProUsers,
    likelyTeamsUsers,
    note: "No paid Circle Card plan assignment is stored yet, so Pro and Teams counts stay at 0 until a future billing or admin assignment phase."
  };
}

function eventCount(
  counts: Array<{ eventType: CircleCardEventType; _count: { _all: number } }>,
  eventType: CircleCardEventType
) {
  return counts.find((count) => count.eventType === eventType)?._count._all ?? 0;
}

export async function getAdminCircleCardCommandCentre(input: { query?: string } = {}) {
  await requireAdmin();

  const { startOfToday, weekAgo, monthAgo } = buildDateWindow();

  const [
    totalCircleCardUsers,
    totalCards,
    publishedCards,
    unpublishedCards,
    freeUsers,
    bcnMembersUsingCircleCard,
    cardViewAggregate,
    eventTypeCounts,
    sourceViewCounts,
    totalConnectionRequests,
    acceptedConnections,
    totalRecommendations,
    totalIntroductions,
    totalReferrals,
    totalOpportunities,
    wonOpportunities,
    filesUploaded,
    openReports,
    growth,
    recentlyActiveActivity,
    recentlyUpdatedCards,
    mostActiveUsers,
    topViewedCards,
    topSavedCards,
    topSharedCards,
    topRecommendedCards,
    topSuccessfulReferralCards,
    fastestGrowingCards,
    relationshipActivity,
    fileMetrics,
    mostClickedLinks,
    scannerContacts,
    reportsByStatus,
    reportsByReason,
    latestReports,
    activationSnapshot,
    planBoundary,
    search
  ] = await Promise.all([
    db.user.count({
      where: {
        circleCards: {
          some: {}
        }
      }
    }),
    db.circleCard.count(),
    db.circleCard.count({
      where: {
        isPublished: true
      }
    }),
    db.circleCard.count({
      where: {
        isPublished: false
      }
    }),
    db.user.count({
      where: {
        role: {
          not: "ADMIN"
        },
        circleCards: {
          some: {}
        },
        OR: [
          {
            subscription: {
              is: null
            }
          },
          {
            subscription: {
              is: {
                status: {
                  notIn: ACTIVE_SUBSCRIPTION_STATUSES
                }
              }
            }
          }
        ]
      }
    }),
    db.user.count({
      where: {
        circleCards: {
          some: {}
        },
        OR: [
          {
            role: "ADMIN"
          },
          {
            subscription: {
              is: {
                status: {
                  in: ACTIVE_SUBSCRIPTION_STATUSES
                }
              }
            }
          }
        ]
      }
    }),
    db.circleCard.aggregate({
      _sum: {
        viewCount: true
      }
    }),
    db.circleCardEvent.groupBy({
      by: ["eventType"],
      _count: {
        _all: true
      }
    }),
    loadSourceViewCounts(),
    db.circleCardConnectionRequest.count(),
    db.circleCardConnectionRequest.count({
      where: {
        status: "ACCEPTED"
      }
    }),
    db.circleCardRecommendation.count(),
    db.circleCardIntroduction.count(),
    db.circleCardReferral.count(),
    db.opportunity.count(),
    db.opportunity.count({
      where: {
        status: "WON"
      }
    }),
    db.circleCardLink.count({
      where: {
        OR: [
          {
            fileUrl: {
              not: null
            }
          },
          {
            fileName: {
              not: null
            }
          },
          {
            fileMimeType: {
              not: null
            }
          }
        ]
      }
    }),
    db.circleCardReport.count({
      where: {
        status: "OPEN"
      }
    }),
    Promise.all([
      db.user.count({
        where: {
          circleCards: {
            some: {}
          },
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      db.user.count({
        where: {
          circleCards: {
            some: {}
          },
          createdAt: {
            gte: weekAgo
          }
        }
      }),
      db.user.count({
        where: {
          circleCards: {
            some: {}
          },
          createdAt: {
            gte: monthAgo
          }
        }
      }),
      db.circleCard.count({
        where: {
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      db.circleCard.count({
        where: {
          createdAt: {
            gte: weekAgo
          }
        }
      }),
      db.circleCard.count({
        where: {
          createdAt: {
            gte: monthAgo
          }
        }
      })
    ]),
    db.circleCardActivity.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 40,
      select: {
        id: true,
        title: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        circleCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true
          }
        }
      }
    }),
    db.circleCard.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      take: RECENT_LIMIT,
      select: {
        id: true,
        slug: true,
        fullName: true,
        businessName: true,
        isPublished: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    }),
    loadMostActiveUsers(weekAgo),
    loadTopViewedCards(),
    loadTopSavedCards(),
    loadTopEventCards(CircleCardEventType.SHARE),
    loadTopRecommendedCards(),
    loadTopSuccessfulReferralCards(),
    loadFastestGrowingCards(weekAgo),
    db.circleCardActivity.findMany({
      where: {
        type: {
          in: RELATIONSHIP_ACTIVITY_TYPES
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        circleCard: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true
          }
        }
      }
    }),
    Promise.all([
      db.circleCardLink.count(),
      db.circleCardLink.count({
        where: {
          isActive: true
        }
      }),
      db.circleCardLink.count({
        where: {
          OR: [
            {
              fileUrl: {
                not: null
              }
            },
            {
              fileName: {
                not: null
              }
            },
            {
              fileMimeType: {
                not: null
              }
            }
          ]
        }
      }),
      db.circleCardLink.count({
        where: {
          visibility: "PRIVATE_CODE"
        }
      })
    ]),
    loadMostClickedLinks(),
    Promise.all([
      db.circleWalletContact.count({
        where: {
          source: "BUSINESS_CARD_SCAN"
        }
      }),
      db.circleWalletContact.count({
        where: {
          source: "BUSINESS_CARD_SCAN",
          claimToken: {
            not: null
          }
        }
      })
    ]),
    db.circleCardReport.groupBy({
      by: ["status"],
      _count: {
        _all: true
      }
    }),
    db.circleCardReport.groupBy({
      by: ["reason"],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          reason: "desc"
        }
      }
    }),
    db.circleCardReport.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: RECENT_LIMIT,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        card: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            businessName: true
          }
        },
        reporterUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    getCircleCardActivationSnapshot({
      limit: RECENT_LIMIT
    }),
    loadCircleCardPlanBoundary(),
    loadSearch(input.query ?? "")
  ]);

  const [newUsersToday, newUsersThisWeek, newUsersThisMonth, newCardsToday, newCardsThisWeek, newCardsThisMonth] =
    growth;
  const [totalSmartLinks, activeSmartLinks, fileBackedLinks, privateLinks] = fileMetrics;
  const [scannedContactsCreated, claimLinksGeneratedFromContacts] = scannerContacts;
  const totalPublicCardViews = cardViewAggregate._sum.viewCount ?? 0;
  const privateUnlockSuccesses = eventCount(eventTypeCounts, CircleCardEventType.CUSTOM_LINK_UNLOCK_SUCCESS);
  const privateUnlockFailures = eventCount(eventTypeCounts, CircleCardEventType.CUSTOM_LINK_UNLOCK_FAILED);

  const recentlyActiveUsers = [];
  const seenActiveUserIds = new Set<string>();

  for (const activity of recentlyActiveActivity) {
    if (seenActiveUserIds.has(activity.user.id)) {
      continue;
    }

    seenActiveUserIds.add(activity.user.id);
    recentlyActiveUsers.push(activity);

    if (recentlyActiveUsers.length >= RECENT_LIMIT) {
      break;
    }
  }

  const reportStatusCount = (status: CircleCardReportStatus) =>
    reportsByStatus.find((report) => report.status === status)?._count._all ?? 0;

  return {
    overview: {
      totalCircleCardUsers,
      totalCards,
      publishedCards,
      unpublishedCards,
      freeUsers,
      bcnMembersUsingCircleCard,
      totalPublicCardViews,
      qrViews: eventCount(eventTypeCounts, CircleCardEventType.QR_VIEW),
      qrSourceViews: sourceViewCounts.qr,
      nfcSourceViews: sourceViewCounts.nfc,
      eventSourceViews: sourceViewCounts.event,
      directViews: sourceViewCounts.direct,
      vCardDownloads: eventCount(eventTypeCounts, CircleCardEventType.VCARD_DOWNLOAD),
      shares: eventCount(eventTypeCounts, CircleCardEventType.SHARE),
      walletSaves: eventCount(eventTypeCounts, CircleCardEventType.WALLET_SAVE),
      connectionRequests: totalConnectionRequests,
      acceptedConnections,
      recommendations: totalRecommendations,
      introductions: totalIntroductions,
      referrals: totalReferrals,
      opportunities: totalOpportunities,
      wonOpportunities,
      businessCardScans: eventCount(eventTypeCounts, CircleCardEventType.BUSINESS_CARD_SCANNED),
      filesUploaded,
      privateFileUnlocks: privateUnlockSuccesses,
      failedPrivateUnlocks: privateUnlockFailures,
      openReports
    },
    growth: {
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      newCardsToday,
      newCardsThisWeek,
      newCardsThisMonth,
      mostActiveUsers,
      recentlyActiveUsers,
      recentlyUpdatedCards
    },
    activation: {
      newUsers: newUsersThisMonth,
      activatedUsers: activationSnapshot.activatedUsers,
      activationRate: activationSnapshot.activationRate,
      averageCompletion: activationSnapshot.averageCompletion,
      topIncompleteUsers: activationSnapshot.topIncompleteUsers
    },
    topCards: {
      mostViewed: topViewedCards,
      mostSaved: topSavedCards,
      mostShared: topSharedCards,
      mostRecommended: topRecommendedCards,
      mostSuccessfulReferrals: topSuccessfulReferralCards,
      fastestGrowing: fastestGrowingCards
    },
    relationship: {
      totals: {
        connectionRequests: totalConnectionRequests,
        acceptedConnections,
        recommendations: totalRecommendations,
        introductions: totalIntroductions,
        referrals: totalReferrals,
        opportunities: totalOpportunities,
        wonOpportunities
      },
      latestActivity: relationshipActivity
    },
    files: {
      totalSmartLinks,
      activeSmartLinks,
      fileBackedLinks,
      privateLinks,
      privateUnlockSuccesses,
      privateUnlockFailures,
      mostClickedLinks
    },
    scanner: {
      businessCardsScanned: eventCount(eventTypeCounts, CircleCardEventType.BUSINESS_CARD_SCANNED),
      scannedContactsCreated,
      claimLinksGenerated: Math.max(
        eventCount(eventTypeCounts, CircleCardEventType.CLAIM_LINK_GENERATED),
        claimLinksGeneratedFromContacts
      ),
      existingCircleCardMatchesFound: eventCount(eventTypeCounts, CircleCardEventType.BUSINESS_CARD_MATCH_FOUND)
    },
    safety: {
      openReports: reportStatusCount(CircleCardReportStatus.OPEN),
      reportsReviewing: reportStatusCount(CircleCardReportStatus.REVIEWING),
      reportsResolved: reportStatusCount(CircleCardReportStatus.RESOLVED),
      reportsDismissed: reportStatusCount(CircleCardReportStatus.DISMISSED),
      reportsByReason: reportsByReason.map((report) => ({
        reason: report.reason as CircleCardReportReason,
        count: report._count._all
      })),
      latestReports
    },
    plans: planBoundary,
    search,
    meta: {
      topCardLimit: TOP_CARD_LIMIT,
      recentLimit: RECENT_LIMIT,
      searchLimit: SEARCH_LIMIT
    }
  };
}
