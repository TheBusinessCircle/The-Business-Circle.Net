import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier, ResourceStatus, ResourceTier } from "@prisma/client";
import {
  ArrowUpRight,
  Crown,
  Lock,
  MessageSquare,
  ShieldCheck,
  Users,
  Video
} from "lucide-react";
import { submitInnerCircleQuestionAction } from "@/actions/inner-circle/question.actions";
import { EventCard } from "@/components/events";
import { MemberProfileCard } from "@/components/profile";
import { ResourceTierBadge } from "@/components/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { Textarea } from "@/components/ui/textarea";
import { getMembershipPlan } from "@/config/membership";
import { formatEventScheduleWindow } from "@/lib/events";
import { canAccessTier, roleToTier } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { getTierAccentTextClassName, getTierCardClassName } from "@/lib/tier-styles";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Inner Circle",
  description:
    "Your premium space for deeper strategy, closer access to Trev, exclusive resources, and high-level business growth.",
  path: "/inner-circle"
});

type InnerCircleEventRecord = {
  id: string;
  title: string;
  description: string | null;
  hostName: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string;
  meetingLink: string | null;
  accessTier: MembershipTier;
  accessLevel: "PUBLIC" | "MEMBERS" | "INNER_CIRCLE" | "ADMIN_ONLY";
  location: string | null;
  isCancelled: boolean;
  replayUrl: string | null;
};

function LockedPreviewCard({
  title,
  eyebrow,
  description,
  tier = MembershipTier.INNER_CIRCLE
}: {
  title: string;
  eyebrow: string;
  description: string;
  tier?: "INNER_CIRCLE" | "CORE";
}) {
  const tierCardClassName = getTierCardClassName(tier);
  const tierAccentTextClassName = getTierAccentTextClassName(tier);

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${tierCardClassName}`}>
      <div className="space-y-2 blur-sm">
        <p className={`text-[11px] uppercase tracking-[0.08em] ${tierAccentTextClassName}`}>{eyebrow}</p>
        <p className="text-lg font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[2px]">
        <Badge variant={tier === MembershipTier.CORE ? "core" : "innerCircle"}>
          <Lock size={11} className="mr-1" />
          Upgrade to access
        </Badge>
      </div>
    </div>
  );
}

function mapEventRecord(
  event: {
    id: string;
    title: string;
    description: string | null;
    hostName: string | null;
    startAt: Date;
    endAt: Date | null;
    timezone: string;
    meetingLink: string | null;
    accessTier: MembershipTier;
    accessLevel: "PUBLIC" | "MEMBERS" | "INNER_CIRCLE" | "ADMIN_ONLY";
    location: string | null;
    isCancelled: boolean;
    replayUrl: string | null;
  }
): InnerCircleEventRecord {
  return {
    ...event,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null
  };
}

export default async function InnerCirclePage() {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const hasInnerCircleAccess = canAccessTier(effectiveTier, MembershipTier.INNER_CIRCLE);
  const hasCoreAccess = canAccessTier(effectiveTier, MembershipTier.CORE);
  const visibleResourceTiers = hasCoreAccess
    ? [ResourceTier.INNER, ResourceTier.CORE]
    : [ResourceTier.INNER];
  const visiblePremiumMembershipTiers = hasCoreAccess
    ? [MembershipTier.INNER_CIRCLE, MembershipTier.CORE]
    : [MembershipTier.INNER_CIRCLE];
  const premiumAreaTitle = hasCoreAccess ? "Core Access" : "Inner Circle";
  const premiumAreaDescription = hasCoreAccess
    ? "Your highest-access room for calmer discussion, sharper decisions, premium resources, and stronger strategic proximity."
    : "A more focused room for deeper strategy, calmer discussion, private resources, and closer founder access.";
  const premiumTier = hasCoreAccess ? MembershipTier.CORE : MembershipTier.INNER_CIRCLE;
  const premiumTierCardClassName = getTierCardClassName(premiumTier);
  const premiumAccentTextClassName = getTierAccentTextClassName(premiumTier);

  if (!hasInnerCircleAccess) {
    const regularPrice = getMembershipPlan(MembershipTier.INNER_CIRCLE).monthlyPrice;

    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-silver/26 bg-gradient-to-br from-silver/14 via-card/82 to-card/72 shadow-silver-soft">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="innerCircle">
                <Crown size={12} className="mr-1" />
                Inner Circle
              </Badge>
              <Badge variant="outline" className="border-silver/22 text-silver">
                More focused access
              </Badge>
            </div>
            <CardTitle className="font-display text-3xl">Inner Circle</CardTitle>
            <CardDescription className="max-w-4xl text-base">
              Step into a more focused room when you want stronger signal, better private context,
              and a calmer level of access than Foundation alone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/membership?upgrade=inner-circle">
              <Button variant="innerCircle">
                Unlock Inner Circle
                <ArrowUpRight size={14} className="ml-2" />
              </Button>
            </Link>
            <Link href="/membership?upgrade=inner-circle">
              <Button variant="outline">
                {`Upgrade Now - ${formatCurrency(regularPrice, "GBP")}/month`}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LockedPreviewCard
            eyebrow="Deeper Strategy Discussions"
            title="Private founder strategy conversations"
            description="Advanced problem-solving, execution feedback, and high-trust peer insight."
            tier={MembershipTier.INNER_CIRCLE}
          />
          <LockedPreviewCard
            eyebrow="Private Live Sessions"
            title="Inner Circle strategy sessions"
            description="Upcoming live calls, premium replays, and direct implementation guidance."
            tier={MembershipTier.INNER_CIRCLE}
          />
          <LockedPreviewCard
            eyebrow="Founder Q&A"
            title="Closer access to Trev"
            description="Submit strategic questions and review answered founder prompts."
            tier={MembershipTier.INNER_CIRCLE}
          />
          <LockedPreviewCard
            eyebrow="Exclusive Resources"
            title="Premium playbooks and frameworks"
            description="High-signal resources reserved for Inner Circle members."
            tier={MembershipTier.INNER_CIRCLE}
          />
          <LockedPreviewCard
            eyebrow="Early Access Tools"
            title="Get new assets before the wider community"
            description="Selected resources and tools land here first."
            tier={MembershipTier.INNER_CIRCLE}
          />
          <LockedPreviewCard
            eyebrow="Private Networking"
            title="Inner Circle member directory"
            description="Connect with premium members in a more focused networking environment."
            tier={MembershipTier.INNER_CIRCLE}
          />
        </div>
      </div>
    );
  }

  const [
    premiumResources,
    scheduledResources,
    premiumChannels,
    recentPremiumMessages,
    upcomingPremiumEvents,
    replayEvents,
    answeredQuestions,
    innerCircleMembers
  ] = await Promise.all([
    prisma.resource.findMany({
      where: {
        status: ResourceStatus.PUBLISHED,
        tier: {
          in: visibleResourceTiers
        }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        tier: true,
        publishedAt: true,
        estimatedReadMinutes: true,
        category: true
      },
      orderBy: [{ tier: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.resource.findMany({
      where: {
        status: ResourceStatus.SCHEDULED,
        tier: {
          in: visibleResourceTiers
        }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        tier: true,
        scheduledFor: true
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
      take: 4
    }),
    prisma.channel.findMany({
      where: {
        accessTier: {
          in: visiblePremiumMembershipTiers
        },
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        topic: true,
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        position: "asc"
      },
      take: 6
    }),
    prisma.message.findMany({
      where: {
        deletedAt: null,
        channel: {
          accessTier: {
            in: visiblePremiumMembershipTiers
          },
          isArchived: false
        }
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        channel: {
          select: {
            slug: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            foundingTier: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }),
    prisma.event.findMany({
      where: {
        accessTier: {
          in: visiblePremiumMembershipTiers
        },
        startAt: {
          gte: new Date()
        },
        isCancelled: false
      },
      orderBy: {
        startAt: "asc"
      },
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        hostName: true,
        startAt: true,
        endAt: true,
        timezone: true,
        meetingLink: true,
        accessTier: true,
        accessLevel: true,
        location: true,
        isCancelled: true,
        replayUrl: true
      }
    }),
    prisma.event.findMany({
      where: {
        accessTier: {
          in: visiblePremiumMembershipTiers
        },
        replayUrl: {
          not: null
        },
        isCancelled: false
      },
      orderBy: {
        startAt: "desc"
      },
      take: 4,
      select: {
        id: true,
        title: true,
        description: true,
        hostName: true,
        startAt: true,
        endAt: true,
        timezone: true,
        meetingLink: true,
        accessTier: true,
        accessLevel: true,
        location: true,
        isCancelled: true,
        replayUrl: true
      }
    }),
    prisma.innerCircleQuestion.findMany({
      where: {
        isAnswered: true
      },
      select: {
        id: true,
        question: true,
        answer: true,
        answeredAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        answeredBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        answeredAt: "desc"
      },
      take: 6
    }),
    prisma.user.findMany({
      where: {
        suspended: false,
        membershipTier: {
          in: visiblePremiumMembershipTiers
        },
        profile: {
          is: {
            isPublic: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        membershipTier: true,
        foundingTier: true,
        profile: {
          select: {
            headline: true,
            location: true,
            collaborationTags: true,
            business: {
              select: {
                companyName: true,
                industry: true,
                stage: true,
                description: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: [
        {
          createdAt: "desc"
        }
      ],
      take: 6
    })
  ]);

  const mappedUpcomingEvents = upcomingPremiumEvents.map(mapEventRecord);
  const mappedReplayEvents = replayEvents.map(mapEventRecord);

  return (
    <div className="space-y-6">
      <Card className={`overflow-hidden ${premiumTierCardClassName} ${hasCoreAccess ? "shadow-gold-soft" : "shadow-silver-soft"}`}>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {hasCoreAccess ? (
              <Badge variant="core">
                <ShieldCheck size={12} className="mr-1" />
                Core
              </Badge>
            ) : (
              <Badge variant="innerCircle">
                <Crown size={12} className="mr-1" />
                Inner Circle
              </Badge>
            )}
            <FoundingBadge tier={session.user.foundingTier} />
            <Badge variant="outline" className={`border-silver/35 bg-silver/10 ${premiumAccentTextClassName}`}>
              <ShieldCheck size={12} className="mr-1" />
              {hasCoreAccess ? "Includes Inner Circle + Core" : "Premium Member Area"}
            </Badge>
          </div>
          <CardTitle className="font-display text-3xl">{premiumAreaTitle}</CardTitle>
          <CardDescription className="max-w-4xl text-base">
            {premiumAreaDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-border text-muted">
            {premiumResources.length} premium resources
          </Badge>
          <Badge variant="outline" className="border-border text-muted">
            {premiumChannels.length} private discussions
          </Badge>
          <Badge variant="outline" className="border-border text-muted">
            {mappedUpcomingEvents.length} upcoming live sessions
          </Badge>
          <Badge variant="outline" className="border-border text-muted">
            {innerCircleMembers.length} visible members
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className={premiumTierCardClassName}>
          <CardHeader>
            <CardTitle>Deeper Strategy Discussions</CardTitle>
            <CardDescription>
              Private discussion spaces focused on strategic decisions, execution, and founder-level context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {premiumChannels.map((channel) => (
              <Link
                key={channel.id}
                href={`/community?channel=${channel.slug}`}
                className="block rounded-xl border border-border/80 bg-background/35 p-3 hover:border-silver/35"
              >
                <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <MessageSquare size={14} className={premiumAccentTextClassName} />
                  #{channel.slug}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {channel.topic || channel.description || "Private strategy discussion"}
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  {channel._count.messages} total messages
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className={premiumTierCardClassName}>
          <CardHeader>
            <CardTitle>Private Live Sessions</CardTitle>
            <CardDescription>
              Upcoming sessions, premium live access, and replay-ready programming across your premium tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mappedUpcomingEvents.length ? (
              mappedUpcomingEvents.map((event) => <EventCard key={event.id} event={event} variant="compact" />)
            ) : (
              <p className="text-sm text-muted">No private live sessions are scheduled yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Replays</CardTitle>
            <CardDescription>
              Catch up on previous premium calls and implementation sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mappedReplayEvents.length ? (
              mappedReplayEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border/80 bg-background/35 p-3">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatEventScheduleWindow({
                      startAt: event.startAt,
                      endAt: event.endAt,
                      timezone: event.timezone
                    })}
                  </p>
                  <a
                    href={event.replayUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Video size={12} />
                    Open replay
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No replays have been added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exclusive Resources</CardTitle>
            <CardDescription>
              Premium resources for deeper implementation and strategic clarity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {premiumResources.map((resource) => (
              <Link
                key={resource.id}
                href={`/dashboard/resources/${resource.slug}`}
                className="block rounded-xl border border-border/80 bg-background/35 p-3 hover:border-silver/35"
              >
                <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{resource.title}</p>
                  <ResourceTierBadge tier={resource.tier} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted">{resource.excerpt}</p>
                <p className="mt-2 text-[11px] text-muted">
                  {resource.category}{" "}
                  {resource.publishedAt ? `| Updated ${formatDate(resource.publishedAt)}` : ""}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className={premiumTierCardClassName}>
          <CardHeader>
            <CardTitle>Founder Q&A</CardTitle>
            <CardDescription>
              Submit your question and browse answered prompts from the Inner Circle archive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={submitInnerCircleQuestionAction} className="space-y-3">
              <Textarea
                name="question"
                rows={4}
                placeholder="What strategic question would you like Trev to answer?"
              />
              <Button type="submit">Submit Question</Button>
            </form>

            <div className="space-y-2">
              {answeredQuestions.length ? (
                answeredQuestions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/80 bg-background/35 p-3">
                    <p className="text-sm font-medium text-foreground">{item.question}</p>
                    <p className="mt-2 text-sm text-muted">{item.answer}</p>
                    <p className="mt-2 text-[11px] text-muted">
                      Asked by {item.user.name || item.user.email}
                      {item.answeredAt ? ` | Answered ${formatDate(item.answeredAt)}` : ""}
                      {item.answeredBy ? ` | ${item.answeredBy.name || item.answeredBy.email}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Answered questions will appear here.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Next</CardTitle>
            <CardDescription>
              What is already queued next inside the premium editorial flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scheduledResources.length ? (
              scheduledResources.map((resource) => (
                <Link
                  key={resource.id}
                  href={`/dashboard/resources/${resource.slug}`}
                  className="block rounded-xl border border-border/80 bg-background/35 p-3 hover:border-silver/35"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ResourceTierBadge tier={resource.tier} />
                    <p className="text-sm font-medium text-foreground">{resource.title}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{resource.excerpt}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    {resource.scheduledFor ? `Scheduled ${formatDate(resource.scheduledFor)}` : "Awaiting schedule"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">No scheduled premium resources are queued yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Private Networking</CardTitle>
            <CardDescription>
              Connect with other premium members through the private directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {innerCircleMembers.map((member) => (
                <MemberProfileCard
                  key={member.id}
                  userId={member.id}
                  name={member.name || member.email}
                  image={member.image}
                  membershipTier={member.membershipTier}
                  foundingTier={member.foundingTier}
                  companyName={member.profile?.business?.companyName}
                  bio={member.profile?.headline || member.profile?.business?.description}
                  location={member.profile?.location || member.profile?.business?.location}
                  industry={member.profile?.business?.industry}
                  stage={member.profile?.business?.stage}
                  tags={member.profile?.collaborationTags || []}
                />
              ))}
            </div>
            <Link href="/directory?community=INNER_CIRCLE">
              <Button variant="outline" className="w-full justify-center">
                <Users size={14} className="mr-2" />
                {hasCoreAccess ? "Open Premium Directory" : "Open Inner Circle Directory"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Premium Discussion Feed</CardTitle>
            <CardDescription>
              A quick view of what premium members are discussing right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPremiumMessages.length ? (
              recentPremiumMessages.map((message) => (
                <div key={message.id} className="rounded-xl border border-border/80 bg-background/35 p-3">
                  <p className="line-clamp-2 text-sm text-foreground">{message.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span>{message.user.name || message.user.email}</span>
                    <FoundingBadge tier={message.user.foundingTier} />
                    <span>#{message.channel.slug}</span>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No recent Inner Circle messages yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
