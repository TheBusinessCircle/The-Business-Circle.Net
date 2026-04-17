import type { Metadata } from "next";
import Link from "next/link";
import { CommunityPostKind, MembershipTier } from "@prisma/client";
import {
  ArrowRight,
  Crown,
  Link2,
  MessageSquare,
  Sparkles,
  UserCheck
} from "lucide-react";
import { ConnectionWinComposer } from "@/components/community";
import { CommunityBadge } from "@/components/ui/community-badge";
import { CommunityRecognitionPanel } from "@/components/profile";
import { ResourceTierBadge } from "@/components/resources";
import { BillingActions } from "@/components/platform/billing-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import {
  getMembershipPriceDifference,
  getMembershipTierLabel,
  getMembershipTierRank
} from "@/config/membership";
import { authorName, buildCommunityPostPreview } from "@/lib/community-helpers";
import { isConnectionWinTags } from "@/lib/connection-wins";
import { buildCommunityChannelPath, buildCommunityPostPath } from "@/lib/community-paths";
import {
  countActiveItems,
  countUniqueContributors,
  getFreshnessSignal,
  getPresenceSignal,
  getSuggestedConversationPrompts,
  rankPostsByMomentum
} from "@/lib/community-rhythm";
import { allowedEditorialResourceTiers, allowedResourceTiers } from "@/lib/db/access";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { getMemberHomeNextAction, getTierHomeGuidance } from "@/lib/member-home";
import { getDashboardOnboardingExperience } from "@/lib/onboarding";
import { roleToTier } from "@/lib/permissions";
import { getDashboardPersonalisation } from "@/lib/personalization";
import { getProfileCompletion } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/security/logging";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { getTierAccentTextClassName, getTierCardClassName } from "@/lib/tier-styles";
import { formatDate } from "@/lib/utils";
import {
  listRecentCommunityPostsForTiers,
  listRecentConnectionWinsForTiers
} from "@/server/community/community.service";
import { getCommunityRecognitionForUser, getInviteDashboardForUser } from "@/server/community-recognition";
import { listUpcomingEventsForTiers } from "@/server/events";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { searchDirectoryMembers } from "@/server/profile";
import { resolveManagedMembershipPlanFromStripePriceId } from "@/server/products-pricing";

export const metadata: Metadata = createPageMetadata({
  title: "Member Dashboard",
  description:
    "Your Business Circle member dashboard with resources, current discussion activity, profile progress, and upcoming events.",
  keywords: [
    "member dashboard",
    "business community dashboard",
    "founder resource dashboard"
  ],
  path: "/dashboard"
});

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveTierFromSearch(value: string | undefined): MembershipTier {
  if (value === MembershipTier.CORE) {
    return MembershipTier.CORE;
  }

  if (value === MembershipTier.INNER_CIRCLE) {
    return MembershipTier.INNER_CIRCLE;
  }

  return MembershipTier.FOUNDATION;
}

function signalClassName(tone: "live" | "recent" | "quiet") {
  if (tone === "live") {
    return "border-gold/24 bg-gold/10 text-gold";
  }

  if (tone === "recent") {
    return "border-silver/20 bg-silver/10 text-silver";
  }

  return "border-border bg-background/18 text-muted";
}

async function getRecentConnectionWinsForDashboard(input: {
  tiers: MembershipTier[];
  viewerUserId: string;
  take?: number;
}) {
  try {
    return await listRecentConnectionWinsForTiers(input);
  } catch (error) {
    logServerError("dashboard-connection-wins-unavailable", error, {
      take: input.take,
      tiers: input.tiers.join(",")
    });

    return [];
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const billingSource = firstValue(params.source);
  const billingIntent = firstValue(params.intent);
  const billingVariant = firstValue(params.variant);
  const billingInterval = firstValue(params.interval);
  const billingDelta = firstValue(params.delta);
  const billingTier = resolveTierFromSearch(firstValue(params.tier));
  const welcome = firstValue(params.welcome);
  const notice = firstValue(params.notice);
  const error = firstValue(params.error);
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const effectiveTierRank = getMembershipTierRank(effectiveTier);
  const tiers = allowedResourceTiers(effectiveTier);
  const resourceTiers = allowedEditorialResourceTiers(effectiveTier);
  const hasInnerCircleAccess = effectiveTierRank >= getMembershipTierRank(MembershipTier.INNER_CIRCLE);
  const hasCoreAccess = effectiveTierRank >= getMembershipTierRank(MembershipTier.CORE);

  const [
    member,
    subscription,
    newestResources,
    recentPosts,
    upcomingEvents,
    memberCount,
    channelCount,
    foundingOffer,
    recognition,
    inviteDashboard,
    memberHighlights,
    recentConnectionWins,
    latestMemberPost,
    latestMemberComment
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: {
          include: {
            business: true
          }
        }
      }
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        tier: true,
        status: true,
        stripePriceId: true,
        trialEnd: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: true
      }
    }),
    prisma.resource.findMany({
      where: {
        status: "PUBLISHED",
        tier: { in: resourceTiers }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        tier: true,
        publishedAt: true,
        category: true
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6
    }),
    listRecentCommunityPostsForTiers({
      tiers,
      viewerUserId: session.user.id,
      take: 6
    }),
    listUpcomingEventsForTiers(tiers, { take: 6 }),
    prisma.user.count({
      where: {
        suspended: false
      }
    }),
    prisma.channel.count({
      where: {
        accessTier: { in: tiers },
        isArchived: false
      }
    }),
    getFoundingOfferSnapshot(),
    getCommunityRecognitionForUser(session.user.id),
    getInviteDashboardForUser(session.user.id),
    searchDirectoryMembers({
      communityFilter: "TOP_CONTRIBUTORS",
      page: 1,
      pageSize: 3,
      excludeUserId: session.user.id
    }),
    getRecentConnectionWinsForDashboard({
      tiers,
      viewerUserId: session.user.id,
      take: 3
    }),
    prisma.communityPost.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true,
        channel: {
          select: {
            slug: true,
            name: true
          }
        }
      }
    }),
    prisma.communityComment.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true,
        post: {
          select: {
            channel: {
              select: {
                slug: true,
                name: true
              }
            }
          }
        }
      }
    })
  ]);

  const completion = getProfileCompletion({
    name: member?.name,
    bio: member?.profile?.bio,
    location: member?.profile?.location,
    experience: member?.profile?.experience,
    companyName: member?.profile?.business?.companyName,
    businessDescription: member?.profile?.business?.description,
    industry: member?.profile?.business?.industry,
    services: member?.profile?.business?.services,
    website: member?.profile?.website || member?.profile?.business?.website,
    instagram: member?.profile?.instagram,
    linkedin: member?.profile?.linkedin,
    tiktok: member?.profile?.tiktok,
    collaborationNeeds: member?.profile?.collaborationNeeds,
    collaborationOffers: member?.profile?.collaborationOffers,
    partnershipInterests: member?.profile?.partnershipInterests
  });
  const nextAction = getMemberHomeNextAction({
    completionPercentage: completion.percentage,
    membershipTier: effectiveTier,
    hasRecentDiscussion: recentPosts.length > 0,
    hasUpcomingEvent: upcomingEvents.length > 0
  });
  const tierGuidance = getTierHomeGuidance(effectiveTier);
  const rankedRecentPosts = rankPostsByMomentum(recentPosts);
  const worthYourTimeDiscussion = rankedRecentPosts[0] ?? null;
  const activeDiscussions = rankedRecentPosts
    .filter((post) => !isConnectionWinTags(post.tags))
    .slice(0, 2);
  const dailyConversationPrompts = getSuggestedConversationPrompts({
    membershipTier: effectiveTier,
    limit: 2
  });
  const activeNowCount = countActiveItems(
    recentPosts.map((post) => ({
      createdAt: post.createdAt
    }))
  );
  const contributingMemberCount = countUniqueContributors(recentPosts);
  const featuredDiscussion = worthYourTimeDiscussion ?? null;
  const featuredResource =
    newestResources.find((resource) => resource.tier === effectiveTier) ?? newestResources[0] ?? null;
  const featuredMemberHighlight = memberHighlights.members[0] ?? null;
  const memberContribution =
    rankedRecentPosts.find(
      (post) =>
        post.kind !== CommunityPostKind.AUTO_PROMPT &&
        !isConnectionWinTags(post.tags) &&
        !activeDiscussions.some((activeDiscussion) => activeDiscussion.id === post.id)
    ) ?? null;
  const quickActions = [
    {
      href: featuredDiscussion ? buildCommunityPostPath(featuredDiscussion.id) : "/community",
      title: "Join a discussion",
      description: featuredDiscussion
        ? "Step into the discussion already carrying the strongest signal."
        : "Open the community and join the room that feels most relevant today.",
      icon: MessageSquare
    },
    {
      href: dailyConversationPrompts[0]
        ? buildCommunityChannelPath(dailyConversationPrompts[0].channelSlug)
        : "/community",
      title: "Start a conversation",
      description: dailyConversationPrompts[0]
        ? `Use "${dailyConversationPrompts[0].title}" if you want a cleaner place to begin.`
        : "Start a clean post when you have a useful question or lesson to share.",
      icon: ArrowRight
    },
    {
      href: featuredResource ? `/dashboard/resources/${featuredResource.slug}` : "/dashboard/resources",
      title: "Read a resource",
      description: featuredResource
        ? `Open ${featuredResource.title} and take one useful idea back into the week.`
        : "Use the resource hub when you need better structure before the next move.",
      icon: Sparkles
    }
  ];

  const trialDaysRemaining =
    subscription?.trialEnd && subscription.status === "TRIALING"
      ? Math.max(
          0,
          Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        )
      : null;

  const currentBillingPlan = await resolveManagedMembershipPlanFromStripePriceId(
    subscription?.stripePriceId
  );
  const upgradeTargetTier =
    effectiveTier === MembershipTier.FOUNDATION
      ? MembershipTier.INNER_CIRCLE
      : effectiveTier === MembershipTier.INNER_CIRCLE
        ? MembershipTier.CORE
        : null;
  const upgradeTargetOffer =
    upgradeTargetTier === MembershipTier.INNER_CIRCLE
      ? foundingOffer.innerCircle
      : upgradeTargetTier === MembershipTier.CORE
        ? foundingOffer.core
        : null;
  const upgradeTargetMonthlyPrice = upgradeTargetOffer
    ? upgradeTargetOffer.standardPrice
    : null;
  const upgradePriceDifference =
    upgradeTargetMonthlyPrice === null
      ? null
      : getMembershipPriceDifference({
          currentMonthlyEquivalentPrice: currentBillingPlan.monthlyEquivalentPrice,
          targetMonthlyEquivalentPrice: upgradeTargetMonthlyPrice
        });
  const upgradeOffer =
    upgradeTargetTier && upgradeTargetOffer && upgradePriceDifference !== null
      ? {
          targetTier: upgradeTargetTier,
          label: `Upgrade to ${getMembershipTierLabel(upgradeTargetTier)}`,
          deltaLabel:
            upgradePriceDifference > 0
              ? `Adds GBP ${upgradePriceDifference}/month to your current plan.`
              : `Moves you to GBP ${upgradeTargetMonthlyPrice}/month with no extra monthly uplift over your current plan.`
        }
      : null;
  const newlyAddedResources = newestResources.slice(0, 3);
  const tierCardClassName = getTierCardClassName(effectiveTier);
  const tierAccentTextClassName = getTierAccentTextClassName(effectiveTier);
  const profileProgressBarClassName =
    effectiveTier === MembershipTier.CORE
      ? "bg-gold"
      : effectiveTier === MembershipTier.INNER_CIRCLE
        ? "bg-silver"
        : "bg-foundation";
  const latestActivityChannel =
    latestMemberPost && latestMemberComment
      ? latestMemberPost.createdAt >= latestMemberComment.createdAt
        ? latestMemberPost.channel
        : latestMemberComment.post.channel
      : latestMemberPost?.channel ?? latestMemberComment?.post.channel ?? null;
  const personalisation = getDashboardPersonalisation({
    membershipTier: effectiveTier,
    profileCompletion: completion.percentage,
    hasPosted: Boolean(latestMemberPost),
    hasCommented: Boolean(latestMemberComment),
    hasUpcomingEvent: upcomingEvents.length > 0,
    recentChannelName: latestActivityChannel?.name ?? null,
    recentChannelHref: latestActivityChannel
      ? buildCommunityChannelPath(latestActivityChannel.slug)
      : null,
    featuredDiscussionTitle: featuredDiscussion?.title ?? null,
    featuredDiscussionHref: featuredDiscussion
      ? buildCommunityPostPath(featuredDiscussion.id)
      : null,
    featuredResourceTitle: featuredResource?.title ?? null,
    featuredResourceHref: featuredResource
      ? `/dashboard/resources/${featuredResource.slug}`
      : null
  });
  const joinedRecently = member
    ? Date.now() - member.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000
    : false;
  const showOnboardingExperience =
    billingSource === "join" ||
    welcome === "1" ||
    (joinedRecently &&
      (completion.percentage < 85 || !latestMemberPost || !latestMemberComment));
  const onboardingExperience = showOnboardingExperience
    ? getDashboardOnboardingExperience({
        membershipTier: effectiveTier,
        profileCompletion: completion.percentage,
        hasPosted: Boolean(latestMemberPost),
        hasCommented: Boolean(latestMemberComment),
        activeDiscussionCount: activeNowCount,
        contributingMemberCount,
        recentWinCount: recentConnectionWins.length,
        featuredDiscussionHref: featuredDiscussion
          ? buildCommunityPostPath(featuredDiscussion.id)
          : "/community",
        featuredResourceHref: featuredResource
          ? `/dashboard/resources/${featuredResource.slug}`
          : "/dashboard/resources"
      })
    : null;

  return (
    <div className="space-y-6">
      {billing === "success" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Billing update received. Your membership access is active.{" "}
          {billingSource === "membership"
            ? "Your updated plan is now reflected across the platform."
            : billingSource === "join"
              ? "Welcome to The Business Circle. Start with the first few minutes below."
              : "You can manage billing any time from your dashboard."}
        </p>
      ) : null}

      {billing === "plan-updated" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your plan has been updated to {getMembershipTierLabel(billingTier)}.
          {billingVariant === "founding"
            ? ` Founding ${getMembershipTierLabel(billingTier)} pricing is now active.`
            : ` Standard ${getMembershipTierLabel(billingTier)} pricing is now active.`}
          {billingInterval === "annual" ? " Annual billing is now active." : ""}
          {billingDelta ? ` Monthly uplift: GBP ${billingDelta}.` : ""}
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. You can restart billing any time from this dashboard.
        </p>
      ) : null}

      {error === "verify-email" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Verify your email address to unlock community and directory access. Check your inbox for the verification link.
        </p>
      ) : null}

      {notice === "connection-win-created" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your connection win is now visible inside the Circle.
        </p>
      ) : null}

      {error === "connection-win-invalid" ? (
        <p className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Please keep the win specific so members can see what changed and why it mattered.
        </p>
      ) : null}

      {error === "connection-win-unavailable" ? (
        <p className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Wins and movement is not available right now. Please try again shortly.
        </p>
      ) : null}

      {billing === "portal-return" && billingIntent === "downgrade" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Billing portal opened for a plan downgrade. Select the membership level you want in Stripe to apply the change.
        </p>
      ) : null}

      {subscription?.status === "TRIALING" && trialDaysRemaining !== null ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your trial ends in {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"}.
          Ensure billing is active to avoid access disruption.
        </p>
      ) : null}

      {subscription?.status === "PAST_DUE" || subscription?.status === "UNPAID" ? (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Your subscription payment is past due. Update your payment method in billing to keep full platform access.
        </p>
      ) : null}

      {subscription?.cancelAtPeriodEnd ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Membership changes are scheduled at period end.{" "}
          {subscription.currentPeriodEnd
            ? `Current period ends ${formatDate(subscription.currentPeriodEnd)}.`
            : "Your current period end date will update shortly."}
        </p>
      ) : null}

      {onboardingExperience ? (
        <section className="space-y-4">
          <div className="border-b border-silver/12 pb-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              {onboardingExperience.eyebrow}
            </p>
            <h2 className="font-display text-2xl text-foreground">
              {onboardingExperience.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              {onboardingExperience.description}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-silver/18 bg-gradient-to-br from-silver/10 via-card/78 to-card/68">
              <CardHeader>
                <CardTitle>First five minutes inside the Circle</CardTitle>
                <CardDescription>{onboardingExperience.emphasis}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {onboardingExperience.actions.map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/28"
                    >
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <p className="mt-2 text-sm text-muted">{action.description}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm text-silver">
                        {action.label}
                        <ArrowRight size={14} />
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    {onboardingExperience.engagementTitle}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {onboardingExperience.engagementDescription}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle>{onboardingExperience.profileTitle}</CardTitle>
                  <CardDescription>
                    {onboardingExperience.profileDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {onboardingExperience.profileBenefits.map((benefit) => (
                      <Badge
                        key={benefit}
                        variant="outline"
                        className="border-silver/16 bg-background/20 normal-case tracking-normal text-silver"
                      >
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={onboardingExperience.profileHref}
                    className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
                  >
                    {onboardingExperience.profileLabel}
                    <ArrowRight size={14} />
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle>{onboardingExperience.momentumTitle}</CardTitle>
                  <CardDescription>{onboardingExperience.momentumDescription}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  {onboardingExperience.momentumItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4"
                    >
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                      <p className="mt-2 text-sm text-muted">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-silver/16 bg-card/62">
                <CardHeader>
                  <CardTitle>Immediate value</CardTitle>
                  <CardDescription>
                    One discussion and one resource are enough to make the platform feel useful quickly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {featuredDiscussion ? (
                    <Link
                      href={buildCommunityPostPath(featuredDiscussion.id)}
                      className="block rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/28"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Useful discussion
                        </span>
                        {(() => {
                          const activitySignal = getFreshnessSignal(featuredDiscussion.createdAt, {
                            withinDayLabel: "Active today",
                            withinWeekLabel: "Updated this week",
                            fallbackPrefix: "Updated"
                          });

                          return (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(activitySignal.tone)}`}
                            >
                              {activitySignal.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {featuredDiscussion.title}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        {buildCommunityPostPreview(featuredDiscussion.content, featuredDiscussion.tags)}
                      </p>
                    </Link>
                  ) : null}

                  {featuredResource ? (
                    <Link
                      href={`/dashboard/resources/${featuredResource.slug}`}
                      className="block rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/28"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                          Relevant resource
                        </span>
                        {(() => {
                          const resourceSignal = getFreshnessSignal(featuredResource.publishedAt, {
                            withinDayLabel: "Added today",
                            withinWeekLabel: "Recently added",
                            fallbackPrefix: "Added"
                          });

                          return (
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(resourceSignal.tone)}`}
                            >
                              {resourceSignal.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {featuredResource.title}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        Open one structured resource first, then let the next move come from that.
                      </p>
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      ) : null}

      <Card className="overflow-hidden border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
        <CardHeader className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Member home</p>
          <CardTitle className="font-display text-3xl md:text-4xl">
            Welcome back, {session.user.name ?? "Member"}
          </CardTitle>
          <CardDescription className="max-w-3xl text-base text-muted">
            Use this space to get oriented quickly, open the right discussion, and keep the business moving without adding noise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <MembershipTierBadge tier={effectiveTier} foundationLabel="Foundation" />
            <Badge variant="muted" className="normal-case tracking-normal">
              Profile {completion.percentage}% complete
            </Badge>
            <Badge variant="outline" className="border-silver/20 text-silver normal-case tracking-normal">
              Status {recognition.statusLevel}
            </Badge>
            <Badge variant="outline" className="border-silver/20 text-silver normal-case tracking-normal">
              {memberCount} active members
            </Badge>
            <Badge variant="outline" className="border-silver/20 text-silver normal-case tracking-normal">
              {channelCount} discussion areas available
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Active now</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activeNowCount}</p>
              <p className="mt-2 text-sm text-muted">
                {activeNowCount
                  ? "Discussions with visible movement inside your current view."
                  : "A quieter moment right now, with room to enter cleanly."}
              </p>
            </div>
            <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Members contributing</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{contributingMemberCount}</p>
              <p className="mt-2 text-sm text-muted">
                Visible contributors across the current discussion flow.
              </p>
            </div>
            <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recent wins</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{recentConnectionWins.length}</p>
              <p className="mt-2 text-sm text-muted">
                Quiet proof that useful activity is turning into outcomes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={`rounded-2xl px-4 py-4 ${tierCardClassName}`}>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Current access</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{tierGuidance.title}</p>
              <p className="mt-2 text-sm text-muted">{tierGuidance.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-silver/20 text-silver normal-case tracking-normal"
                >
                  {resourceTiers.length} resource tier{resourceTiers.length === 1 ? "" : "s"} available
                </Badge>
                <Badge
                  variant="outline"
                  className="border-silver/20 text-silver normal-case tracking-normal"
                >
                  {channelCount} discussion area{channelCount === 1 ? "" : "s"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-silver/20 text-silver normal-case tracking-normal"
                >
                  {upcomingEvents.length} upcoming event{upcomingEvents.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href="/membership"
                  className={`inline-flex items-center gap-2 font-medium ${tierAccentTextClassName}`}
                >
                  Review membership
                  <ArrowRight size={14} />
                </Link>
                {hasInnerCircleAccess ? (
                  <Link
                    href="/inner-circle"
                    className="inline-flex items-center gap-2 text-silver transition-colors hover:text-foreground"
                  >
                    <Crown size={14} />
                    {hasCoreAccess ? "Open Core access" : "Open Inner Circle"}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-silver/16 bg-background/25 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Orientation</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Treat the dashboard like a calm starting point
              </p>
              <p className="mt-2 text-sm text-muted">
                Pick one clear move, let the rest wait, and use the sections below to stay close to the parts of the ecosystem that matter this week.
              </p>

              <div className="mt-5 space-y-2">
                <p className="text-sm font-medium text-silver">Profile completion progress</p>
                <div className="h-2.5 rounded-full bg-background/65">
                  <div
                    className={`h-2.5 rounded-full transition-all ${profileProgressBarClassName}`}
                    style={{ width: `${completion.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  A stronger profile improves directory visibility and helps the right people understand where you can help.
                </p>
              </div>

              <Link
                href="/profile"
                className="mt-4 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
              >
                Refine profile
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <BillingActions
            tier={effectiveTier}
            subscription={{
              cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
              currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null
            }}
            upgradeOffer={upgradeOffer}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="border-b border-silver/12 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Inside the Circle Today</p>
              <h2 className="font-display text-2xl text-foreground">A clear read on what matters now</h2>
            </div>
            {activeNowCount ? (
              <Badge
                variant="outline"
                className="border-gold/24 bg-gold/10 text-gold normal-case tracking-normal"
              >
                {activeNowCount} discussion{activeNowCount === 1 ? "" : "s"} active now
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            One look at current movement, one useful next step, and enough signal to make returning feel worthwhile without turning the dashboard into noise.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Active discussions</CardTitle>
              <CardDescription>One or two threads with enough movement to be worth opening today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeDiscussions.length ? (
                activeDiscussions.map((post) => {
                  const activitySignal = getFreshnessSignal(post.createdAt, {
                    withinDayLabel: "Active today",
                    withinWeekLabel: "Updated this week",
                    fallbackPrefix: "Updated"
                  });

                  return (
                    <Link
                      key={post.id}
                      href={buildCommunityPostPath(post.id)}
                      className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                            {post.channel.name}
                          </span>
                          {worthYourTimeDiscussion?.id === post.id ? (
                            <span className="rounded-full border border-gold/24 bg-gold/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                              Worth your time
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(activitySignal.tone)}`}
                        >
                          {activitySignal.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">{post.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
                        {buildCommunityPostPreview(post.content, post.tags) ||
                          "Open the discussion to read the full post."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>{authorName(post.user)}</span>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState
                  title="No discussions yet"
                  description="Open the community and start a useful post in the right room."
                  icon={MessageSquare}
                  action={
                    <Link href="/community">
                      <Button variant="outline">Open community</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Suggested action</CardTitle>
              <CardDescription>The next move that keeps the platform useful without overloading the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{nextAction.eyebrow}</p>
                <p className="mt-3 text-lg font-semibold text-foreground">{nextAction.title}</p>
                <p className="mt-2 text-sm text-muted">{nextAction.description}</p>
                <Link
                  href={nextAction.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold"
                >
                  {nextAction.label}
                  <ArrowRight size={14} />
                </Link>
              </div>

              {dailyConversationPrompts[0] ? (
                <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Prompt nearby</p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {dailyConversationPrompts[0].title}
                  </p>
                  <p className="mt-2 text-sm text-muted">{dailyConversationPrompts[0].prompt}</p>
                  <Link
                    href={buildCommunityChannelPath(dailyConversationPrompts[0].channelSlug)}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
                  >
                    Start in {dailyConversationPrompts[0].channelName}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Resource for today</CardTitle>
              <CardDescription>One relevant piece to sharpen thinking before the next move.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredResource ? (
                <Link
                  href={`/dashboard/resources/${featuredResource.slug}`}
                  className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ResourceTierBadge tier={featuredResource.tier} />
                    {(() => {
                      const resourceSignal = getFreshnessSignal(featuredResource.publishedAt, {
                        withinDayLabel: "Added today",
                        withinWeekLabel: "Recently added",
                        fallbackPrefix: "Added"
                      });

                      return (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(resourceSignal.tone)}`}
                        >
                          {resourceSignal.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{featuredResource.title}</p>
                  <p className="mt-2 text-sm text-muted">
                    {featuredResource.category}
                    {newlyAddedResources.length > 1
                      ? ` | ${newlyAddedResources.length} recent resources available`
                      : ""}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-2 text-sm text-silver">
                    Open resource
                    <ArrowRight size={14} />
                  </p>
                </Link>
              ) : (
                <EmptyState
                  title="No resources yet"
                  description="New material will appear here as soon as it is published for your membership tier."
                  icon={Sparkles}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Member contribution</CardTitle>
              <CardDescription>A useful contribution or visible member signal worth noticing today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {memberContribution ? (
                <Link
                  href={buildCommunityPostPath(memberContribution.id)}
                  className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                      {memberContribution.channel.name}
                    </span>
                    {(() => {
                      const contributionSignal = getFreshnessSignal(memberContribution.createdAt, {
                        withinDayLabel: "Shared today",
                        withinWeekLabel: "Updated this week",
                        fallbackPrefix: "Shared"
                      });

                      return (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(contributionSignal.tone)}`}
                        >
                          {contributionSignal.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-3 text-base font-semibold text-foreground">{memberContribution.title}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">
                    {buildCommunityPostPreview(memberContribution.content, memberContribution.tags) ||
                      "Open the contribution to read the full post."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{authorName(memberContribution.user)}</span>
                    <span>{memberContribution.commentCount} comment{memberContribution.commentCount === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              ) : featuredMemberHighlight ? (
                <Link
                  href={buildMemberProfilePath(featuredMemberHighlight.id)}
                  className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={featuredMemberHighlight.name || featuredMemberHighlight.email}
                      image={featuredMemberHighlight.image}
                      className="h-11 w-11"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {featuredMemberHighlight.name || featuredMemberHighlight.email}
                        </p>
                        <MembershipTierBadge tier={featuredMemberHighlight.membershipTier} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {featuredMemberHighlight.profile?.business?.companyName || "Business Circle member"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {featuredMemberHighlight.recognition.primaryBadge ? (
                          <CommunityBadge badge={featuredMemberHighlight.recognition.primaryBadge} />
                        ) : null}
                        <span>{featuredMemberHighlight.recognition.statusLevel}</span>
                        <span>{getPresenceSignal(featuredMemberHighlight.lastActiveAt).label}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <EmptyState
                  title="Contribution signal will appear here"
                  description="As members post, reply, and stay visible, this card will surface someone worth noticing."
                  icon={UserCheck}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-b border-silver/12 pb-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Connection wins</p>
          <h2 className="font-display text-2xl text-foreground">Recent wins inside the Circle</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Quiet proof that useful conversations turn into something real. Short, specific outcomes are enough.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle>Recent wins</CardTitle>
              <CardDescription>Real outcomes surfaced cleanly so members can see what is moving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentConnectionWins.length ? (
                recentConnectionWins.map((win) => {
                  const winSignal = getFreshnessSignal(win.createdAt, {
                    withinDayLabel: "Shared today",
                    withinWeekLabel: "Updated this week",
                    fallbackPrefix: "Shared"
                  });

                  return (
                    <Link
                      key={win.id}
                      href={buildCommunityPostPath(win.id)}
                      className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                            {win.channel.name}
                          </span>
                          <span className="rounded-full border border-silver/20 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                            Connection win
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${signalClassName(winSignal.tone)}`}
                        >
                          {winSignal.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">{win.title}</p>
                      <p className="mt-2 line-clamp-3 text-sm text-muted">
                        {buildCommunityPostPreview(win.content, win.tags)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>{authorName(win.user)}</span>
                        <span>{formatDate(win.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState
                  title="No recent wins yet"
                  description="Wins will appear here as members share specific outcomes from useful conversations and introductions."
                  icon={Sparkles}
                  action={
                    <Link href={buildCommunityChannelPath("wins-and-progress")}>
                      <Button variant="outline">Open wins and movement</Button>
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>

          <ConnectionWinComposer returnPath="/dashboard" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-b border-silver/12 pb-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recommended for you</p>
          <h2 className="font-display text-2xl text-foreground">Use your membership with more intent</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            These suggestions stay simple on purpose. Use the parts of the ecosystem that best match the stage you are in now.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <Card className={tierCardClassName}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <MembershipTierBadge tier={effectiveTier} foundationLabel="Foundation" />
                <Badge variant="outline" className="border-silver/18 text-silver normal-case tracking-normal">
                  Recommended focus
                </Badge>
              </div>
              <CardTitle className="text-2xl">{tierGuidance.title}</CardTitle>
              <CardDescription>{tierGuidance.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-silver/18 text-silver normal-case tracking-normal">
                  {resourceTiers.length} resource tier{resourceTiers.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline" className="border-silver/18 text-silver normal-case tracking-normal">
                  {channelCount} discussion area{channelCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline" className="border-silver/18 text-silver normal-case tracking-normal">
                  {memberCount} active members
                </Badge>
              </div>

              {upgradeOffer ? (
                <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">If you need more depth</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{upgradeOffer.label}</p>
                  <p className="mt-2 text-sm text-muted">{upgradeOffer.deltaLabel}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href="/membership"
                  className={`inline-flex items-center gap-2 font-medium ${tierAccentTextClassName}`}
                >
                  Review membership
                  <ArrowRight size={14} />
                </Link>
                {hasInnerCircleAccess ? (
                  <Link
                    href="/inner-circle"
                    className="inline-flex items-center gap-2 text-silver transition-colors hover:text-foreground"
                  >
                    {hasCoreAccess ? "Open Core access" : "Open Inner Circle"}
                    <ArrowRight size={14} />
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                {personalisation.basedOnActivity.eyebrow}
              </p>
              <CardTitle>{personalisation.basedOnActivity.title}</CardTitle>
              <CardDescription>{personalisation.basedOnActivity.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {featuredDiscussion ? (
                <Link
                  href={personalisation.basedOnActivity.href}
                  className="block rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/32"
                >
                  <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                    {latestActivityChannel?.name || featuredDiscussion.channel.name}
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {personalisation.basedOnActivity.label}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">
                    {personalisation.basedOnActivity.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{featuredDiscussion.commentCount} comment{featuredDiscussion.commentCount === 1 ? "" : "s"}</span>
                    <span>{featuredDiscussion.likeCount} like{featuredDiscussion.likeCount === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              ) : (
                <EmptyState
                  title="No discussion selected yet"
                  description="When discussion activity picks up, the strongest thread will surface here first."
                  icon={MessageSquare}
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                {personalisation.unexplored.eyebrow}
              </p>
              <CardTitle>{personalisation.unexplored.title}</CardTitle>
              <CardDescription>{personalisation.unexplored.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Profile status</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{completion.percentage}%</p>
                <p className="mt-2 text-sm text-muted">
                  {completion.percentage < 100
                    ? "A stronger profile helps the directory work harder for you."
                    : "Your profile is in strong shape. Keep it current as your business evolves."}
                </p>
              </div>

              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Visible status</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{recognition.statusLevel}</p>
                <p className="mt-2 text-sm text-muted">
                  Recognition appears across discussions, profiles, and the member directory.
                </p>
              </div>

              <Link
                href={personalisation.unexplored.href}
                className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
              >
                {personalisation.unexplored.label}
                <ArrowRight size={14} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-b border-silver/12 pb-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Quick actions</p>
          <h2 className="font-display text-2xl text-foreground">Return without overthinking it</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Keep the path back simple. Open one discussion, start one useful conversation, or read one structured resource.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-silver/16 bg-card/60 p-4 transition-colors hover:border-silver/28 hover:bg-card/72"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-silver/18 bg-background/30 text-silver">
                <item.icon size={16} />
              </span>
              <p className="mt-4 text-base font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm text-silver">
                Open
                <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted">
          These actions stay limited on purpose so the dashboard feels calm even when the platform is moving.
        </p>
      </section>

      <section className="space-y-4 border-t border-silver/12 pt-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Visibility and network</p>
          <h2 className="font-display text-2xl text-foreground">Bring the right people closer</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Keep your profile visible, share the ecosystem with care, and let stronger introductions build over time.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Link2 size={16} className="text-silver" />
                Invite your network
              </CardTitle>
              <CardDescription>
                Share your private invite link with founders and business owners who should be inside the Circle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteDashboard ? (
                <>
                  <div className="rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Invite link</p>
                    <p className="mt-2 break-all text-sm text-foreground">{inviteDashboard.inviteLink}</p>
                    <p className="mt-2 text-xs text-muted">Code: {inviteDashboard.inviteCode}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Total referrals</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{inviteDashboard.totalReferrals}</p>
                    </div>
                    <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Members</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{inviteDashboard.memberReferrals}</p>
                    </div>
                    <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Inner Circle+</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{inviteDashboard.innerCircleReferrals}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Recent referrals</p>
                    {inviteDashboard.referrals.length ? (
                      inviteDashboard.referrals.slice(0, 5).map((referral) => (
                        <div
                          key={referral.id}
                          className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {referral.name || referral.email}
                              </p>
                              <p className="text-xs text-muted">{referral.email}</p>
                            </div>
                            <MembershipTierBadge tier={referral.subscriptionTier} />
                          </div>
                          <p className="mt-2 text-xs text-muted">Joined {formatDate(referral.joinedAt)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-silver/14 bg-background/18 px-4 py-4 text-sm text-muted">
                        No referrals yet. Share your invite link with business owners who should be inside the network.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-silver/14 bg-background/18 px-4 py-4 text-sm text-muted">
                  Invite details will appear once your member record is fully available.
                </div>
              )}
            </CardContent>
          </Card>

          <CommunityRecognitionPanel
            recognition={recognition}
            description="Your visible status across discussions, profiles, and the member directory."
          />
        </div>
      </section>
    </div>
  );
}
