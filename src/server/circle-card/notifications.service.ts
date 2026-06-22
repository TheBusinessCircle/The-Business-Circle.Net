import "server-only";

import { CircleCardEventType, type CircleCardNotificationType, type Prisma } from "@prisma/client";
import { CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT } from "@/lib/circle-card/plans";
import { readCircleCardSocialLinks } from "@/lib/circle-card/schema";
import {
  buildCircleCardUpgradeTriggers,
  calculateCircleCardUpgradeReadiness,
  hasCircleCardTeamsOrganisationSignal,
  type CircleCardUpgradeUsageSnapshot
} from "@/lib/circle-card/upgrade-triggers";
import { prisma } from "@/lib/prisma";
import { calculateCircleCardCompletionForCard } from "@/server/circle-card/activation.service";

type CreateCircleCardNotificationInput = {
  userId: string | null | undefined;
  circleCardId?: string | null;
  type: CircleCardNotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
};

export type CircleCardNotificationPanelItem = {
  id: string;
  type: CircleCardNotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

type ActivationNotificationCandidate = {
  entityType: string;
  entityId: string;
  title: string;
  message: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const CIRCLE_CARD_SHARE_EVENT_TYPES: CircleCardEventType[] = [
  CircleCardEventType.SHARE,
  CircleCardEventType.CONNECT_HUB_SHARE,
  CircleCardEventType.CONNECT_HUB_COPY_LINK
];

const ACTIVATION_GUIDANCE_ENTITY_TYPES = [
  "ACTIVATION_PROFILE_IMAGE",
  "ACTIVATION_BIO",
  "ACTIVATION_LOCATION",
  "ACTIVATION_FEATURED_LINK",
  "ACTIVATION_LOW_COMPLETION",
  "ACTIVATION_FINISH_CARD"
] as const;

function utcDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function utcWeekKey(value: Date) {
  const day = value.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = utcDateOnly(new Date(value.getTime() + mondayOffset * DAY_MS));

  return monday.toISOString().slice(0, 10);
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString("en-GB")} ${value === 1 ? singular : plural}`;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function countActiveSocialProfiles(input: {
  socialLinks: Prisma.JsonValue;
  user: {
    profile: {
      linkedin: string | null;
      instagram: string | null;
      facebook: string | null;
      tiktok: string | null;
      youtube: string | null;
    } | null;
  };
}) {
  const cardSocialLinks = readCircleCardSocialLinks(input.socialLinks).links;
  const profileSocialLinks = [
    input.user.profile?.linkedin,
    input.user.profile?.instagram,
    input.user.profile?.facebook,
    input.user.profile?.tiktok,
    input.user.profile?.youtube
  ];

  return (
    cardSocialLinks.filter((link) => link.isActive && link.url.trim()).length +
    profileSocialLinks.filter((url) => Boolean(url?.trim())).length
  );
}

export async function createCircleCardNotification(input: CreateCircleCardNotificationInput) {
  if (!input.userId) {
    return { stored: false as const };
  }

  try {
    await prisma.circleCardNotification.create({
      data: {
        userId: input.userId,
        circleCardId: input.circleCardId ?? null,
        type: input.type,
        title: input.title.slice(0, 160),
        message: input.message.slice(0, 360),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null
      }
    });

    return { stored: true as const };
  } catch {
    return { stored: false as const };
  }
}

async function createCircleCardNotificationOnce(input: CreateCircleCardNotificationInput) {
  if (!input.userId || !input.entityType || !input.entityId) {
    return createCircleCardNotification(input);
  }

  const duplicate = await prisma.circleCardNotification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId
    },
    select: { id: true }
  });

  if (duplicate) {
    return { stored: false as const, duplicate: true as const };
  }

  return createCircleCardNotification(input);
}

export async function getCircleCardNotificationUnreadCount(userId: string) {
  return prisma.circleCardNotification.count({
    where: {
      userId,
      isRead: false
    }
  });
}

export async function getCircleCardNotificationPanel(
  userId: string,
  take = 10
): Promise<CircleCardNotificationPanelItem[]> {
  return prisma.circleCardNotification.findMany({
    where: { userId },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      entityType: true,
      entityId: true,
      isRead: true,
      readAt: true,
      createdAt: true
    }
  });
}

async function markResolvedActivationGuidanceRead(input: {
  userId: string;
  circleCardId: string;
  activeEntityTypes: string[];
  now: Date;
}) {
  await prisma.circleCardNotification.updateMany({
    where: {
      userId: input.userId,
      circleCardId: input.circleCardId,
      type: "SYSTEM",
      isRead: false,
      entityType: {
        in: [...ACTIVATION_GUIDANCE_ENTITY_TYPES]
      },
      NOT: {
        entityType: {
          in: input.activeEntityTypes
        }
      }
    },
    data: {
      isRead: true,
      readAt: input.now
    }
  });
}

export async function createCircleCardActivationNotificationsForUser(
  userId: string,
  now = new Date()
) {
  const card = await prisma.circleCard.findFirst({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      fullName: true,
      businessName: true,
      accountType: true,
      identityTags: true,
      role: true,
      tagline: true,
      about: true,
      profileImageUrl: true,
      location: true,
      email: true,
      phone: true,
      websiteUrl: true,
      socialLinks: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      customLinks: {
        select: {
          id: true,
          isActive: true
        }
      },
      _count: {
        select: {
          walletContacts: true,
          opportunities: true,
          introductionsMade: true,
          introductionsAsPersonA: true,
          introductionsAsPersonB: true,
          referralsMade: true,
          referralsReceived: true
        }
      },
      user: {
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
          }
        }
      }
    }
  });

  if (!card) {
    return { created: 0, skipped: true as const };
  }

  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const weekKey = utcWeekKey(now);
  const [
    shareCount,
    weeklyShareCount,
    weeklyViewCount,
    weeklyLinkClickCount,
    weeklyContactSaveCount,
    weeklyWalletContactCount,
    totalWalletContactCount,
    latestActivity,
    latestWalletContact
  ] = await Promise.all([
    prisma.circleCardEvent.count({
      where: {
        cardId: card.id,
        eventType: { in: CIRCLE_CARD_SHARE_EVENT_TYPES }
      }
    }),
    prisma.circleCardEvent.count({
      where: {
        cardId: card.id,
        eventType: { in: CIRCLE_CARD_SHARE_EVENT_TYPES },
        createdAt: { gte: weekAgo }
      }
    }),
    prisma.circleCardEvent.count({
      where: {
        cardId: card.id,
        eventType: CircleCardEventType.CARD_VIEW,
        createdAt: { gte: weekAgo }
      }
    }),
    prisma.circleCardEvent.count({
      where: {
        cardId: card.id,
        eventType: CircleCardEventType.CUSTOM_LINK_CLICK,
        createdAt: { gte: weekAgo }
      }
    }),
    prisma.circleWalletContact.count({
      where: {
        cardId: card.id,
        userId: { not: userId },
        savedAt: { gte: weekAgo }
      }
    }),
    prisma.circleWalletContact.count({
      where: {
        userId,
        savedAt: { gte: weekAgo }
      }
    }),
    prisma.circleWalletContact.count({
      where: { userId }
    }),
    prisma.circleCardActivity.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    }),
    prisma.circleWalletContact.findFirst({
      where: { userId },
      orderBy: { savedAt: "desc" },
      select: { savedAt: true }
    })
  ]);

  const completion = calculateCircleCardCompletionForCard(card, shareCount);
  const activeFeaturedLinks = card.customLinks.filter((link) => link.isActive).length;
  const activeSocialProfiles = countActiveSocialProfiles(card);
  const referralCount = card._count.referralsMade + card._count.referralsReceived;
  const introductionCount =
    card._count.introductionsMade + card._count.introductionsAsPersonA + card._count.introductionsAsPersonB;
  const usageSnapshot: CircleCardUpgradeUsageSnapshot = {
    activeFeaturedLinks,
    featuredLinkLimit: CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
    walletContacts: totalWalletContactCount,
    cardViews: Math.max(card.viewCount, weeklyViewCount),
    shares: shareCount,
    profileCompletion: completion.score,
    socialProfiles: activeSocialProfiles,
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
  const upgradeTriggers = buildCircleCardUpgradeTriggers(usageSnapshot);
  const readiness = calculateCircleCardUpgradeReadiness(usageSnapshot);
  const lastActiveAt = new Date(
    Math.max(
      card.updatedAt.getTime(),
      latestActivity?.createdAt.getTime() ?? 0,
      latestWalletContact?.savedAt.getTime() ?? 0
    )
  );
  const activeActivationEntityTypes = completion.missingItems.flatMap((item) => {
    switch (item.id) {
      case "profile-photo":
        return ["ACTIVATION_PROFILE_IMAGE"];
      case "bio":
        return ["ACTIVATION_BIO"];
      case "location":
        return ["ACTIVATION_LOCATION"];
      case "featured-link":
        return ["ACTIVATION_FEATURED_LINK"];
      default:
        return [];
    }
  });
  const candidates: ActivationNotificationCandidate[] = [];

  if (!hasText(card.profileImageUrl) && !hasText(card.user.image)) {
    candidates.push({
      entityType: "ACTIVATION_PROFILE_IMAGE",
      entityId: card.id,
      title: "Add your profile image",
      message: "A clear photo helps people recognise you when they save or share your card."
    });
  }

  if (!hasText(card.about) && !hasText(card.user.profile?.bio)) {
    candidates.push({
      entityType: "ACTIVATION_BIO",
      entityId: card.id,
      title: "Add your bio",
      message: "A short bio helps new contacts understand what you do."
    });
  }

  if (!hasText(card.location) && !hasText(card.user.profile?.location)) {
    candidates.push({
      entityType: "ACTIVATION_LOCATION",
      entityId: card.id,
      title: "Add your location",
      message: "Location context helps people place your work and community."
    });
  }

  if (!activeFeaturedLinks) {
    candidates.push({
      entityType: "ACTIVATION_FEATURED_LINK",
      entityId: card.id,
      title: "Add your first featured link",
      message: "Give visitors one useful next step from your Circle Card."
    });
  }

  if (completion.score < 50) {
    activeActivationEntityTypes.push("ACTIVATION_LOW_COMPLETION");
    candidates.push({
      entityType: "ACTIVATION_LOW_COMPLETION",
      entityId: card.id,
      title: "Your Circle Card needs a few basics",
      message: `Your Circle Card is ${completion.score}% complete. Add one missing item to make it easier to trust.`
    });
  } else if (!completion.activationComplete) {
    activeActivationEntityTypes.push("ACTIVATION_FINISH_CARD");
    candidates.push({
      entityType: "ACTIVATION_FINISH_CARD",
      entityId: card.id,
      title: "Finish your Circle Card",
      message: `Your Circle Card is ${completion.score}% complete. Finish the remaining setup steps when you have a minute.`
    });
  }

  if (weeklyViewCount > 0) {
    candidates.push({
      entityType: "USAGE_CARD_VIEWED",
      entityId: `${card.id}:${weekKey}`,
      title: "Your card has been viewed this week",
      message: `${formatCount(weeklyViewCount, "view")} came through this week. Keep your profile sharp while attention is coming in.`
    });
  }

  if (weeklyShareCount > 0) {
    candidates.push({
      entityType: "USAGE_CARD_SHARED",
      entityId: `${card.id}:${weekKey}`,
      title: "Your card has been shared",
      message: `${formatCount(weeklyShareCount, "share")} or copied link happened this week.`
    });
  }

  if (weeklyContactSaveCount > 0) {
    candidates.push({
      entityType: "USAGE_CONTACT_SAVED",
      entityId: `${card.id}:${weekKey}`,
      title: "Someone saved your contact",
      message: `${formatCount(weeklyContactSaveCount, "person", "people")} saved your Circle Card this week.`
    });
  }

  if (weeklyWalletContactCount > 0) {
    candidates.push({
      entityType: "USAGE_CIRCLE_GROWING",
      entityId: `${userId}:${weekKey}`,
      title: "Your Circle is growing",
      message: `${formatCount(weeklyWalletContactCount, "contact")} landed in your wallet this week. Add notes while the context is fresh.`
    });
  }

  if (weeklyLinkClickCount > 0) {
    candidates.push({
      entityType: "USAGE_FEATURED_LINK_CLICKED",
      entityId: `${card.id}:${weekKey}`,
      title: "Your featured links are getting clicks",
      message: `${formatCount(weeklyLinkClickCount, "click")} came through your featured links this week.`
    });
  }

  if (weeklyShareCount === 0 && completion.score >= 50) {
    candidates.push({
      entityType: "USAGE_SHARE_TODAY",
      entityId: `${card.id}:${weekKey}`,
      title: "Share your card today",
      message: "Share your Circle Card with someone you met recently or want to follow up with."
    });
  }

  if (completion.score >= 50 && completion.score < 80) {
    candidates.push({
      entityType: "USAGE_PROFILE_PROGRESS",
      entityId: `${card.id}:${Math.floor(completion.score / 10) * 10}`,
      title: "Your profile is taking shape",
      message: `Your Circle Card is ${completion.score}% complete. One more update will make it stronger.`
    });
  }

  if (now.getTime() - lastActiveAt.getTime() >= 7 * DAY_MS) {
    candidates.push({
      entityType: "USAGE_INACTIVE_7D",
      entityId: `${userId}:${weekKey}`,
      title: "Check in on your Circle Card",
      message: "It has been a week since your last Circle Card action. Share your card or save a new contact."
    });
  }

  if (upgradeTriggers.pro[0] && readiness.score >= 55) {
    candidates.push({
      entityType: "UPGRADE_PRO_READINESS",
      entityId: `${card.id}:${upgradeTriggers.pro[0].id}`,
      title: "Pro readiness detected",
      message: `${upgradeTriggers.pro[0].title}. Explore Pro only if you need more visibility or control.`
    });
  }

  if (
    upgradeTriggers.teams[0] &&
    (upgradeTriggers.teams[0].priority >= 75 || hasCircleCardTeamsOrganisationSignal(usageSnapshot))
  ) {
    candidates.push({
      entityType: "UPGRADE_TEAMS_READINESS",
      entityId: `${card.id}:${upgradeTriggers.teams[0].id}`,
      title: "Teams readiness detected",
      message: `${upgradeTriggers.teams[0].title}. Keep it on your radar if staff cards or shared contacts matter.`
    });
  }

  await markResolvedActivationGuidanceRead({
    userId,
    circleCardId: card.id,
    activeEntityTypes: activeActivationEntityTypes,
    now
  });

  let created = 0;

  for (const candidate of candidates) {
    const result = await createCircleCardNotificationOnce({
      userId,
      circleCardId: card.id,
      type: "SYSTEM",
      title: candidate.title,
      message: candidate.message,
      entityType: candidate.entityType,
      entityId: candidate.entityId
    });

    if (result.stored) {
      created += 1;
    }
  }

  return { created, skipped: false as const };
}

export async function createDueOpportunityNotificationsForUser(userId: string, now = new Date()) {
  const today = utcDateOnly(now);
  const dueOpportunities = await prisma.opportunity.findMany({
    where: {
      userId,
      status: {
        notIn: ["WON", "LOST"]
      },
      nextFollowUpAt: {
        lte: today
      }
    },
    select: {
      id: true,
      circleCardId: true,
      title: true,
      nextFollowUpAt: true
    }
  });

  if (!dueOpportunities.length) {
    return { created: 0 };
  }

  let created = 0;

  for (const opportunity of dueOpportunities) {
    const duplicate = await prisma.circleCardNotification.findFirst({
      where: {
        userId,
        type: "OPPORTUNITY_FOLLOWUP_DUE",
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        createdAt: {
          gte: opportunity.nextFollowUpAt ?? today
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      continue;
    }

    const result = await createCircleCardNotification({
      userId,
      circleCardId: opportunity.circleCardId,
      type: "OPPORTUNITY_FOLLOWUP_DUE",
      title: "Opportunity follow-up due",
      message: `${opportunity.title} needs a follow-up.`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id
    });

    if (result.stored) {
      created += 1;
    }
  }

  return { created };
}
