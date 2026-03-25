import { unstable_cache } from "next/cache";
import { MembershipTier, SubscriptionStatus } from "@prisma/client";
import { resolveBillingVariantFromPriceId, resolveMembershipPriceFromStripePriceId } from "@/config/membership";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import type { AdminMetrics } from "@/types";
import { listPublicInsights } from "@/server/insights/insight.service";

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
] ;
const PAYMENT_RISK_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.UNPAID
] ;

function buildDateWindow() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    now,
    startOfToday,
    weekAgo,
    monthAgo
  };
}

async function loadAdminMetrics(): Promise<AdminMetrics> {
  const { now, startOfToday, weekAgo, monthAgo } = buildDateWindow();

  const [
    totalUsers,
    activeMembers,
    foundationMembers,
    innerCircleMembers,
    coreMembers,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    cancellationsThisMonth,
    resourcesCount,
    newResourcesThisWeek,
    postsThisWeek,
    commentsThisWeek,
    postLikesThisWeek,
    commentLikesThisWeek,
    activeDiscussionGroups,
    weeklyPostContributors,
    weeklyCommentContributors,
    completeProfiles,
    incompleteProfiles,
    activeSubscriptions,
    failedPayments,
    totalChannels,
    upcomingEvents
  ] = await Promise.all([
    db.user.count(),
    db.subscription.count({
      where: {
        status: {
          in: ACTIVE_SUBSCRIPTION_STATUSES
        }
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: ACTIVE_SUBSCRIPTION_STATUSES
        },
        tier: MembershipTier.FOUNDATION
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: ACTIVE_SUBSCRIPTION_STATUSES
        },
        tier: MembershipTier.INNER_CIRCLE
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: ACTIVE_SUBSCRIPTION_STATUSES
        },
        tier: MembershipTier.CORE
      }
    }),
    db.user.count({
      where: {
        createdAt: {
          gte: startOfToday
        }
      }
    }),
    db.user.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.user.count({
      where: {
        createdAt: {
          gte: monthAgo
        }
      }
    }),
    db.subscription.count({
      where: {
        canceledAt: {
          gte: monthAgo
        }
      }
    }),
    db.resource.count(),
    db.resource.count({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityPost.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityComment.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityPostLike.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityCommentLike.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityComment.groupBy({
      by: ["postId"],
      where: {
        deletedAt: null,
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityPost.groupBy({
      by: ["userId"],
      where: {
        deletedAt: null,
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityComment.groupBy({
      by: ["userId"],
      where: {
        deletedAt: null,
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.user.count({
      where: {
        profile: {
          is: {
            bio: {
              not: null
            },
            location: {
              not: null
            },
            experience: {
              not: null
            },
            collaborationNeeds: {
              not: null
            },
            collaborationOffers: {
              not: null
            },
            business: {
              is: {
                companyName: {
                  not: null
                },
                description: {
                  not: null
                },
                industry: {
                  not: null
                },
                services: {
                  not: null
                }
              }
            }
          }
        }
      }
    }),
    db.user.count({
      where: {
        OR: [
          {
            profile: null
          },
          {
            profile: {
              is: {
                OR: [
                  { bio: null },
                  { location: null },
                  { experience: null },
                  { collaborationNeeds: null },
                  { collaborationOffers: null },
                  {
                    business: {
                      is: null
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    }),
    db.subscription.findMany({
      where: {
        status: {
          in: ACTIVE_SUBSCRIPTION_STATUSES
        }
      },
      select: {
        stripePriceId: true
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: PAYMENT_RISK_STATUSES
        }
      }
    }),
    db.channel.count({
      where: {
        isArchived: false
      }
    }),
    db.event.count({
      where: {
        startAt: {
          gte: now
        },
        isCancelled: false
      }
    })
  ]);

  const insightsCount = listPublicInsights().length;
  const discountedActiveMembers = activeSubscriptions.filter((subscription) =>
    resolveBillingVariantFromPriceId(subscription.stripePriceId) === "founding"
  ).length;
  const fullPriceActiveMembers = activeSubscriptions.length - discountedActiveMembers;
  const currentMrr = activeSubscriptions.reduce((sum, subscription) => {
    return sum + resolveMembershipPriceFromStripePriceId(subscription.stripePriceId).monthlyPrice;
  }, 0);
  const contributorsThisWeek = new Set([
    ...weeklyPostContributors.map((entry) => entry.userId),
    ...weeklyCommentContributors.map((entry) => entry.userId)
  ]).size;
  const profileCompletionRate =
    totalUsers > 0 ? Math.round((completeProfiles / totalUsers) * 100) : 0;

  return {
    totalUsers,
    activeMembers,
    foundationMembers,
    innerCircleMembers,
    coreMembers,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    cancellationsThisMonth,
    discountedActiveMembers,
    fullPriceActiveMembers,
    resourcesCount,
    newResourcesThisWeek,
    insightsCount,
    postsThisWeek,
    commentsThisWeek,
    likesThisWeek: postLikesThisWeek + commentLikesThisWeek,
    activeDiscussionsThisWeek: activeDiscussionGroups.length,
    contributorsThisWeek,
    profileCompletionRate,
    incompleteProfiles,
    currentMrr,
    failedPayments,
    totalChannels,
    upcomingEvents
  };
}

const getCachedAdminMetrics = unstable_cache(loadAdminMetrics, [CACHE_TAGS.adminMetrics], {
  revalidate: 60
});

export async function getAdminMetrics(): Promise<AdminMetrics> {
  return getCachedAdminMetrics();
}
