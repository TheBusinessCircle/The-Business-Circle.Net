import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier, ResourceStatus, ResourceTier } from "@prisma/client";
import {
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
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
import { MemberRoleBadge } from "@/components/ui/member-role-badge";
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
    "Inner Circle gives serious business owners a closer room for sharper conversations, stronger visibility, and more consistent progress.",
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

const INNER_CIRCLE_CHANGE_BULLETS = [
  "Stronger visibility across the member environment",
  "Access to higher-signal rooms and discussions",
  "Better positioning in member discovery",
  "Priority access to selected group sessions and member opportunities",
  "A clearer route into strategic conversations"
] as const;

const INNER_CIRCLE_UPGRADE_CARDS = [
  {
    title: "Better conversations",
    description:
      "Foundation gets you into the environment. Inner Circle gets you closer to the conversations that move decisions forward."
  },
  {
    title: "Stronger signal",
    description:
      "Your profile and presence carry a clearer tier signal so other members know you are operating at a more committed level."
  },
  {
    title: "More momentum",
    description:
      "Inner Circle is built for owners who are ready to stop just watching and start taking a more active role inside the network."
  }
] as const;

const INNER_CIRCLE_GET_ITEMS = [
  "Inner Circle rooms and discussions",
  "Enhanced profile tier badge",
  "Higher visibility across relevant member areas",
  "Priority consideration for group sessions",
  "Access to deeper member prompts, resources, and growth discussions",
  "Member rate access to Growth Architect services where eligible"
] as const;

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

function ValueCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-violet-300/22 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function TierStatusCard({ title, bullets }: { title: string; bullets: readonly string[] }) {
  return (
    <Card className="border-violet-300/35 bg-[radial-gradient(circle_at_92%_0%,rgba(139,92,246,0.16),transparent_32%),linear-gradient(145deg,rgba(79,70,229,0.12),rgba(15,8,28,0.82)_56%,rgba(8,4,16,0.88))] shadow-[0_22px_62px_rgba(109,76,255,0.15)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Inner Circle is the step from standard access into clearer momentum, stronger positioning, and better strategic context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 text-sm text-muted sm:grid-cols-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-violet-100" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InnerCircleValueOverview({
  hasInnerCircleAccess,
  hasCoreAccess
}: {
  hasInnerCircleAccess: boolean;
  hasCoreAccess: boolean;
}) {
  const cta = hasCoreAccess
    ? {
        title: "You already have Core access",
        description:
          "Core includes Inner Circle access and adds the strongest member signal inside BCN.",
        href: "/core",
        label: "View Core access"
      }
    : hasInnerCircleAccess
      ? {
          title: "You are already inside Inner Circle",
          description:
            "Use the premium rooms, member discovery, and strategy spaces to turn access into visible progress.",
          href: "/community?channel=inner-circle-chat",
          label: "Go to Inner Circle rooms"
        }
      : {
          title: "Upgrade into Inner Circle",
          description:
            "Move from standard access into stronger conversations, higher visibility, and a more committed room.",
          href: "/membership?tier=inner-circle",
          label: "Upgrade to Inner Circle"
        };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-violet-300/35 bg-[radial-gradient(circle_at_88%_0%,rgba(139,92,246,0.2),transparent_34%),linear-gradient(145deg,rgba(79,70,229,0.13),rgba(15,8,28,0.86)_54%,rgba(7,3,14,0.92))] shadow-[0_24px_70px_rgba(109,76,255,0.16)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="innerCircle">
              <Crown size={12} className="mr-1" />
              Inner Circle
            </Badge>
            <Badge variant="outline" className="border-violet-300/35 bg-violet-500/10 text-violet-100">
              <Sparkles size={12} className="mr-1" />
              Access to momentum
            </Badge>
          </div>
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.12em] text-violet-100">Inner Circle</p>
            <CardTitle className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Move from access to momentum.
            </CardTitle>
            <CardDescription className="mt-4 text-base leading-relaxed">
              Inner Circle gives serious business owners a closer room for sharper conversations,
              stronger visibility, and more consistent progress.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <TierStatusCard title="What changes at Inner Circle" bullets={INNER_CIRCLE_CHANGE_BULLETS} />

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-violet-100">Why upgrade from Foundation?</p>
          <h2 className="mt-2 font-display text-2xl text-foreground">A closer room for stronger movement.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {INNER_CIRCLE_UPGRADE_CARDS.map((card) => (
            <ValueCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>What you get</CardTitle>
            <CardDescription>
              Inner Circle builds on Foundation with stronger visibility, better discovery, and deeper member context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {INNER_CIRCLE_GET_ITEMS.map((item) => (
                <div key={item} className="rounded-2xl border border-violet-300/22 bg-violet-500/10 px-4 py-3 text-sm text-muted">
                  <CheckCircle2 size={15} className="mr-2 inline text-violet-100" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-300/35 bg-violet-500/10">
          <CardHeader>
            <CardTitle>{cta.title}</CardTitle>
            <CardDescription>{cta.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href={cta.href}>
              <Button variant="innerCircle" className="w-full justify-center">
                {cta.label}
                <ArrowUpRight size={14} className="ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-center">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
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
        <InnerCircleValueOverview
          hasInnerCircleAccess={hasInnerCircleAccess}
          hasCoreAccess={hasCoreAccess}
        />

        <Card className="border-violet-300/22 bg-card/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted">
              Standard Inner Circle access starts at {formatCurrency(regularPrice, "GBP")}/month.
            </p>
            <Link href="/membership?tier=inner-circle">
              <Button variant="outline">Compare Membership Options</Button>
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
            eyebrow="Priority Releases"
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
            memberRoleTag: true,
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
        memberRoleTag: true,
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
      <InnerCircleValueOverview
        hasInnerCircleAccess={hasInnerCircleAccess}
        hasCoreAccess={hasCoreAccess}
      />

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
                  memberRoleTag={member.memberRoleTag}
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
                    <MemberRoleBadge roleTag={message.user.memberRoleTag} />
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
