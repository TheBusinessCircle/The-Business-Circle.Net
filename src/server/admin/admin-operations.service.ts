import { unstable_cache } from "next/cache";
import { MembershipTier, SubscriptionStatus } from "@prisma/client";
import {
  getMembershipTierLabel,
  resolveBillingVariantFromPriceId,
  resolveMembershipPriceFromStripePriceId
} from "@/config/membership";
import { CACHE_TAGS } from "@/lib/cache";
import { CONNECTION_WIN_TAG } from "@/lib/connection-wins";
import { buildCommunityPostPath } from "@/lib/community-paths";
import { db } from "@/lib/db";
import { getRateLimitStatus } from "@/lib/security/rate-limit";
import { toTitleCase } from "@/lib/utils";
import { isBillingEnabled } from "@/server/subscriptions/subscription.service";
import type {
  AdminLiveActivityItem,
  AdminLiveSnapshot,
  AdminRevenueSnapshot,
  AdminSecuritySnapshot,
  AdminSystemHealthSnapshot
} from "@/types";

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
] ;
const PAYMENT_RISK_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.UNPAID
] ;

function isActiveSubscriptionStatus(status: SubscriptionStatus) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

function isPaymentRiskStatus(status: SubscriptionStatus) {
  return PAYMENT_RISK_STATUSES.includes(status);
}

function configuredAppUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "";
}

function isHttpsConfigured() {
  return configuredAppUrl().startsWith("https://");
}

function authSecretConfigured() {
  return Boolean(process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim());
}

function billingWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

function sortActivity(items: AdminLiveActivityItem[]) {
  return items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

function buildTierCountRecord(): Record<MembershipTier, number> {
  return {
    FOUNDATION: 0,
    INNER_CIRCLE: 0,
    CORE: 0
  };
}

function formatSubscriptionStatus(status: SubscriptionStatus) {
  return toTitleCase(status.replaceAll("_", " "));
}

export async function getAdminRevenueSnapshot(): Promise<AdminRevenueSnapshot> {
  const subscriptions = await db.subscription.findMany({
    where: {
      status: {
        in: [
          ...ACTIVE_SUBSCRIPTION_STATUSES,
          ...PAYMENT_RISK_STATUSES
        ]
      }
    },
    select: {
      tier: true,
      status: true,
      stripePriceId: true,
      cancelAtPeriodEnd: true
    }
  });

  const activeSubscriptions = subscriptions.filter((subscription) =>
    isActiveSubscriptionStatus(subscription.status)
  );
  const trialingSubscriptions = activeSubscriptions.filter(
    (subscription) => subscription.status === SubscriptionStatus.TRIALING
  ).length;
  const subscriptionsByTier = buildTierCountRecord();
  let discountedActiveMembers = 0;
  let currentMrr = 0;

  activeSubscriptions.forEach((subscription) => {
    subscriptionsByTier[subscription.tier] += 1;
    currentMrr +=
      resolveMembershipPriceFromStripePriceId(subscription.stripePriceId).monthlyEquivalentPrice;

    if (resolveBillingVariantFromPriceId(subscription.stripePriceId) === "founding") {
      discountedActiveMembers += 1;
    }
  });

  return {
    currentMrr,
    activeSubscriptions: activeSubscriptions.length,
    trialingSubscriptions,
    discountedActiveMembers,
    fullPriceActiveMembers: activeSubscriptions.length - discountedActiveMembers,
    cancelAtPeriodEnd: activeSubscriptions.filter((subscription) => subscription.cancelAtPeriodEnd)
      .length,
    failedPayments: subscriptions.filter((subscription) =>
      isPaymentRiskStatus(subscription.status)
    ).length,
    subscriptionsByTier
  };
}

export async function getAdminSecuritySnapshot(): Promise<AdminSecuritySnapshot> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rateLimitStatus = await getRateLimitStatus();
  const rateLimitBackend = rateLimitStatus.backend;
  const billingEnabled = isBillingEnabled();
  const httpsConfigured = isHttpsConfigured();
  const authSecretIsConfigured = authSecretConfigured();

  const [
    suspendedUsers,
    unverifiedMembers,
    paymentRiskMembers,
    passwordResetRequests24h,
    recentPasswordResetRequests
  ] = await Promise.all([
    db.user.count({
      where: {
        suspended: true
      }
    }),
    db.user.count({
      where: {
        role: {
          not: "ADMIN"
        },
        emailVerified: null,
        suspended: false
      }
    }),
    db.subscription.count({
      where: {
        status: {
          in: PAYMENT_RISK_STATUSES
        }
      }
    }),
    db.passwordResetToken.count({
      where: {
        createdAt: {
          gte: dayAgo
        }
      }
    }),
    db.passwordResetToken.findMany({
      where: {
        createdAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        requestedIp: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  ]);

  const warnings: string[] = [];

  if (!authSecretIsConfigured) {
    warnings.push("Authentication secret is not configured.");
  }
  if (!httpsConfigured) {
    warnings.push("Primary application URL is not configured for HTTPS.");
  }
  if (process.env.NODE_ENV === "production" && rateLimitBackend === "in-memory") {
    warnings.push(rateLimitStatus.warning ?? "Rate limiting is using the local fallback instead of shared Redis.");
  }
  if (billingEnabled && !billingWebhookConfigured()) {
    warnings.push("Stripe billing is enabled without a configured webhook secret.");
  }
  if (paymentRiskMembers > 0) {
    warnings.push("One or more memberships are in a payment-risk state.");
  }

  return {
    authSecretConfigured: authSecretIsConfigured,
    httpsConfigured,
    billingEnabled,
    rateLimitBackend,
    rateLimitLabel: rateLimitStatus.label,
    rateLimitDescription: rateLimitStatus.description,
    suspendedUsers,
    unverifiedMembers,
    paymentRiskMembers,
    passwordResetRequests24h,
    recentPasswordResetRequests,
    warnings
  };
}

export async function getAdminSystemHealthSnapshot(): Promise<AdminSystemHealthSnapshot> {
  const now = new Date();
  const rateLimitStatus = await getRateLimitStatus();
  const rateLimitBackend = rateLimitStatus.backend;
  const billingEnabled = isBillingEnabled();

  const [
    scheduledResourcesDue,
    nextScheduledResource,
    lastPublishedResource,
    lastCommunityPrompt
  ] = await Promise.all([
    db.resource.count({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          lte: now
        }
      }
    }),
    db.resource.findFirst({
      where: {
        status: "SCHEDULED",
        scheduledFor: {
          gt: now
        }
      },
      orderBy: {
        scheduledFor: "asc"
      },
      select: {
        scheduledFor: true
      }
    }),
    db.resource.findFirst({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          not: null
        }
      },
      orderBy: {
        publishedAt: "desc"
      },
      select: {
        publishedAt: true
      }
    }),
    db.communityPromptEvent.findFirst({
      where: {
        status: "PUBLISHED"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    })
  ]);

  let databaseStatus: AdminSystemHealthSnapshot["databaseStatus"] = "healthy";

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "degraded";
  }

  const warnings: string[] = [];

  if (databaseStatus !== "healthy") {
    warnings.push("Database connectivity check needs attention.");
  }
  if (scheduledResourcesDue > 0) {
    warnings.push("There are scheduled resources waiting to be published.");
  }
  if (!billingEnabled) {
    warnings.push("Stripe billing is not configured in this environment.");
  }
  if (process.env.NODE_ENV === "production" && rateLimitBackend === "in-memory") {
    warnings.push(
      rateLimitStatus.warning ??
        "Operational rate limiting is using the local fallback instead of shared Redis."
    );
  }

  return {
    appStatus: warnings.length ? "attention" : "healthy",
    databaseStatus,
    billingEnabled,
    rateLimitBackend,
    rateLimitLabel: rateLimitStatus.label,
    rateLimitDescription: rateLimitStatus.description,
    scheduledResourcesDue,
    nextScheduledResourceAt: nextScheduledResource?.scheduledFor ?? null,
    lastPublishedResourceAt: lastPublishedResource?.publishedAt ?? null,
    lastCommunityPromptAt: lastCommunityPrompt?.createdAt ?? null,
    warnings
  };
}

async function loadAdminLiveSnapshot(): Promise<AdminLiveSnapshot> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    system,
    security,
    signups24h,
    posts24h,
    comments24h,
    wins24h,
    recentMembers,
    recentPosts,
    recentComments,
    recentResources,
    recentEvents,
    recentProfiles,
    recentBillingEvents
  ] = await Promise.all([
    getAdminSystemHealthSnapshot(),
    getAdminSecuritySnapshot(),
    db.user.count({
      where: {
        createdAt: {
          gte: dayAgo
        }
      }
    }),
    db.communityPost.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: dayAgo
        }
      }
    }),
    db.communityComment.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: dayAgo
        }
      }
    }),
    db.communityPost.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: dayAgo
        },
        tags: {
          has: CONNECTION_WIN_TAG
        }
      }
    }),
    db.user.findMany({
      where: {
        createdAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 4,
      select: {
        id: true,
        name: true,
        email: true,
        membershipTier: true,
        createdAt: true
      }
    }),
    db.communityPost.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6,
      select: {
        id: true,
        title: true,
        tags: true,
        createdAt: true,
        channel: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    db.communityComment.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        post: {
          select: {
            id: true,
            title: true
          }
        }
      }
    }),
    db.resource.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        publishedAt: "desc"
      },
      take: 4,
      select: {
        id: true,
        title: true,
        publishedAt: true
      }
    }),
    db.event.findMany({
      where: {
        createdAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 4,
      select: {
        id: true,
        title: true,
        accessTier: true,
        createdAt: true
      }
    }),
    db.profile.findMany({
      where: {
        updatedAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 4,
      select: {
        userId: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    db.subscription.findMany({
      where: {
        updatedAt: {
          gte: dayAgo
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 5,
      select: {
        userId: true,
        tier: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  const activity: AdminLiveActivityItem[] = sortActivity([
    ...recentMembers.map((member) => ({
      id: `member-${member.id}-${member.createdAt.toISOString()}`,
      type: "member-signup" as const,
      title: "New member signup",
      detail: `${member.name || member.email} joined on ${getMembershipTierLabel(member.membershipTier)}.`,
      href: `/admin/members/${member.id}`,
      createdAt: member.createdAt
    })),
    ...recentPosts.map((post) => ({
      id: `post-${post.id}`,
      type: (post.tags.includes(CONNECTION_WIN_TAG)
        ? "connection-win"
        : "community-post") as "connection-win" | "community-post",
      title: post.tags.includes(CONNECTION_WIN_TAG)
        ? "Connection win shared"
        : "New community post",
      detail: `${post.user.name || post.user.email} posted in ${post.channel.name}.`,
      href: buildCommunityPostPath(post.id),
      createdAt: post.createdAt
    })),
    ...recentComments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "community-comment" as const,
      title: "New community comment",
      detail: `${comment.user.name || comment.user.email} replied on ${comment.post.title}.`,
      href: buildCommunityPostPath(comment.post.id),
      createdAt: comment.createdAt
    })),
    ...recentResources.map((resource) => ({
      id: `resource-${resource.id}`,
      type: "resource" as const,
      title: "Resource published",
      detail: resource.title,
      href: `/admin/resources/${resource.id}`,
      createdAt: resource.publishedAt ?? dayAgo
    })),
    ...recentEvents.map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      title: "Event created",
      detail: `${event.title} for ${getMembershipTierLabel(event.accessTier)}.`,
      href: `/admin/events?edit=${event.id}`,
      createdAt: event.createdAt
    })),
    ...recentProfiles.map((profile) => ({
      id: `profile-${profile.userId}-${profile.updatedAt.toISOString()}`,
      type: "profile" as const,
      title: "Profile updated",
      detail: `${profile.user.name || profile.user.email} refreshed their public profile.`,
      href: `/admin/members/${profile.userId}`,
      createdAt: profile.updatedAt
    })),
    ...recentBillingEvents.map((subscription) => ({
      id: `billing-${subscription.userId}-${subscription.updatedAt.toISOString()}`,
      type: "billing" as const,
      title:
        isPaymentRiskStatus(subscription.status)
          ? "Billing needs attention"
          : "Subscription updated",
      detail: `${subscription.user.name || subscription.user.email}: ${formatSubscriptionStatus(subscription.status)} on ${getMembershipTierLabel(subscription.tier)}.`,
      href: `/admin/members/${subscription.userId}`,
      createdAt: subscription.updatedAt,
      tone: isPaymentRiskStatus(subscription.status) ? ("attention" as const) : ("default" as const)
    }))
  ]).slice(0, 12);

  return {
    pulse: {
      signups24h,
      posts24h,
      comments24h,
      wins24h
    },
    system: {
      appStatus: system.appStatus,
      databaseStatus: system.databaseStatus,
      warnings: system.warnings.length
    },
    security: {
      warnings: security.warnings.length,
      suspendedUsers: security.suspendedUsers,
      paymentRiskMembers: security.paymentRiskMembers,
      passwordResetRequests24h: security.passwordResetRequests24h
    },
    activity,
    lastUpdatedAt: new Date()
  };
}

const getCachedAdminLiveSnapshot = unstable_cache(
  loadAdminLiveSnapshot,
  [CACHE_TAGS.adminLiveSnapshot],
  {
    revalidate: 30
  }
);

export async function getAdminLiveSnapshot(): Promise<AdminLiveSnapshot> {
  return getCachedAdminLiveSnapshot();
}
