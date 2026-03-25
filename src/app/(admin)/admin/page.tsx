import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowUpRight, CalendarDays, MessageSquare, Medal, UsersRound } from "lucide-react";
import { ResourceTierBadge } from "@/components/resources";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getAdminDashboardData } from "@/server/admin";
import type { AdminMetrics } from "@/types";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Overview",
  description: "Private Business Circle admin overview and operational dashboard.",
  path: "/admin",
  noIndex: true
});

export const dynamic = "force-dynamic";

type MetricDescription = {
  key: keyof AdminMetrics;
  label: string;
  hint: string;
  format?: "number" | "currency" | "percent";
};

const membershipMetrics: MetricDescription[] = [
  { key: "totalUsers", label: "Total users", hint: "All user accounts" },
  { key: "activeMembers", label: "Active members", hint: "Active and trialing subscriptions" },
  { key: "foundationMembers", label: "Foundation", hint: "Active Foundation members" },
  { key: "innerCircleMembers", label: "Inner Circle", hint: "Active Inner Circle members" },
  { key: "coreMembers", label: "Core", hint: "Active Core members" },
  { key: "signupsThisWeek", label: "Signups this week", hint: "New member accounts in the last 7 days" },
  { key: "signupsThisMonth", label: "Signups this month", hint: "New member accounts in the last 30 days" },
  { key: "cancellationsThisMonth", label: "Cancellations this month", hint: "Subscriptions canceled in the last 30 days" }
];

const communityMetrics: MetricDescription[] = [
  { key: "postsThisWeek", label: "Posts this week", hint: "New community posts in the last 7 days" },
  { key: "commentsThisWeek", label: "Comments this week", hint: "New comments in the last 7 days" },
  { key: "likesThisWeek", label: "Likes this week", hint: "Post and comment likes in the last 7 days" },
  { key: "activeDiscussionsThisWeek", label: "Active discussions", hint: "Discussions with recent conversation" },
  { key: "contributorsThisWeek", label: "Contributors this week", hint: "Distinct members who posted or replied" },
  { key: "totalChannels", label: "Channels", hint: "Active community channels" }
];

const contentMetrics: MetricDescription[] = [
  { key: "resourcesCount", label: "Resources", hint: "Total resources in the CMS" },
  { key: "newResourcesThisWeek", label: "New resources", hint: "Published resources in the last 7 days" },
  { key: "insightsCount", label: "Insights", hint: "Public SEO insight articles currently live" },
  { key: "profileCompletionRate", label: "Profile completion", hint: "Approximate member profile completion rate", format: "percent" },
  { key: "incompleteProfiles", label: "Incomplete profiles", hint: "Members still missing profile depth" },
  { key: "upcomingEvents", label: "Upcoming events", hint: "Non-cancelled events still ahead" }
];

const revenueMetrics: MetricDescription[] = [
  { key: "discountedActiveMembers", label: "Discounted active", hint: "Members on founding or discounted pricing" },
  { key: "fullPriceActiveMembers", label: "Full-price active", hint: "Members on standard pricing" },
  { key: "currentMrr", label: "Current MRR", hint: "Estimated monthly recurring revenue", format: "currency" },
  { key: "failedPayments", label: "Failed payments", hint: "Past due or unpaid subscriptions" }
];

export default async function AdminOverviewPage() {
  await requireAdmin();
  const dashboard = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gold/45 bg-gradient-to-br from-gold/20 via-card/80 to-card/70 shadow-gold-soft">
        <CardHeader className="space-y-3">
          <CardTitle className="font-display text-3xl">Admin Dashboard</CardTitle>
          <CardDescription className="max-w-4xl text-base">
            Operational oversight for members, resources, community activity, and events across
            The Business Circle Network.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/admin/founding"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Manage Founding Launch
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/members"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Manage Members
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/resources"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Manage Resources
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/channels"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Manage Channels
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/community"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Moderate Messages
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Manage Events
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/revenue"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Open Revenue
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/security"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Open Security
            <ArrowUpRight size={12} />
          </Link>
          <Link
            href="/admin/system-health"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/35 px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/35 hover:text-foreground"
          >
            Open System Health
            <ArrowUpRight size={12} />
          </Link>
        </CardContent>
      </Card>

      <MetricSection
        title="Membership"
        description="Growth, active tier mix, and current subscription movement."
        metrics={membershipMetrics}
        values={dashboard.metrics}
      />

      <MetricSection
        title="Community"
        description="How much useful conversation is happening inside the Circle."
        metrics={communityMetrics}
        values={dashboard.metrics}
      />

      <MetricSection
        title="Content"
        description="Resource, insight, profile, and event signals that show whether the platform stays current."
        metrics={contentMetrics}
        values={dashboard.metrics}
      />

      <MetricSection
        title="Revenue"
        description="Pricing mix and current billing health without leaving the overview page."
        metrics={revenueMetrics}
        values={dashboard.metrics}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <UsersRound size={18} className="text-gold" />
              Recent Member Signups
            </CardTitle>
            <CardDescription>Newest members entering the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.recentMembers.length ? (
              dashboard.recentMembers.map((member) => (
                <div key={member.id} className="rounded-xl border border-border/80 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">{member.name || member.email}</p>
                  <p className="text-xs text-muted">{member.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-muted normal-case tracking-normal">
                      {member.role}
                    </Badge>
                    <MembershipTierBadge tier={member.membershipTier} />
                    <FoundingBadge tier={member.foundingTier} />
                    {member.suspended ? <Badge variant="danger">Suspended</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-muted">Joined {formatDate(member.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={UsersRound}
                title="No recent signups"
                description="Recent member signups will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <CalendarDays size={18} className="text-gold" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Next scheduled events by tier access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.upcomingEventItems.length ? (
              dashboard.upcomingEventItems.map((event) => (
                <div key={event.id} className="rounded-xl border border-border/80 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(event.startAt)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <MembershipTierBadge tier={event.accessTier} />
                    {event.hostName ? <p className="text-xs text-muted">Host: {event.hostName}</p> : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events"
                description="Scheduled events will appear here when added."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Resource Activity</CardTitle>
            <CardDescription>Latest resource updates and publication workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.recentResources.length ? (
              dashboard.recentResources.map((resource) => (
                <div key={resource.id} className="rounded-xl border border-border/80 bg-background/30 p-3">
                  <p className="text-sm font-medium text-foreground">{resource.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-muted normal-case tracking-normal">
                      {resource.status}
                    </Badge>
                    <ResourceTierBadge tier={resource.tier} />
                  </div>
                  <p className="mt-2 text-xs text-muted">Updated {formatDate(resource.updatedAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No resource activity yet"
                description="Resource updates will appear here after publishing activity."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <MessageSquare size={18} className="text-gold" />
              Recent Community Activity
            </CardTitle>
            <CardDescription>Latest messages posted across member channels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.recentCommunityActivity.length ? (
              dashboard.recentCommunityActivity.map((message) => (
                <div key={message.id} className="rounded-xl border border-border/80 bg-background/30 p-3">
                  <p className="line-clamp-2 text-sm text-foreground">{message.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {(message.user.name || message.user.email) ?? "Member"} in #{message.channel.slug}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(message.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No recent community messages"
                description="Recent channel activity will appear here."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <LeaderboardCard
          title="Top Inviters"
          description="Members bringing new founders into the ecosystem."
          icon={UsersRound}
          items={dashboard.communityGrowth.topInviters.map((entry) => ({
            key: entry.user?.id ?? `invite-${entry.totalInvites}`,
            href: entry.user ? `/admin/members/${entry.user.id}` : null,
            label: entry.user?.name || entry.user?.email || "Unknown member",
            meta: entry.user?.email ?? null,
            value: `${entry.totalInvites} invites`
          }))}
        />
        <LeaderboardCard
          title="Top Contributors"
          description="Highest reputation scores across the community."
          icon={Medal}
          items={dashboard.communityGrowth.topContributors.map((entry) => ({
            key: entry.user?.id ?? `contributor-${entry.score}`,
            href: entry.user ? `/admin/members/${entry.user.id}` : null,
            label: entry.user?.name || entry.user?.email || "Unknown member",
            meta: entry.user?.email ?? null,
            value: `${entry.score} pts`
          }))}
        />
        <LeaderboardCard
          title="Most Active Members"
          description="Recent message volume across member channels."
          icon={Activity}
          items={dashboard.communityGrowth.mostActiveMembers.map((entry) => ({
            key: entry.user?.id ?? `activity-${entry.messageCount}`,
            href: entry.user ? `/admin/members/${entry.user.id}` : null,
            label: entry.user?.name || entry.user?.email || "Unknown member",
            meta: entry.user?.email ?? null,
            value: `${entry.messageCount} messages`
          }))}
        />
      </section>
    </div>
  );
}

function MetricSection({
  title,
  description,
  metrics,
  values
}: {
  title: string;
  description: string;
  metrics: MetricDescription[];
  values: AdminMetrics;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} value={values[metric.key]} description={metric} />
        ))}
      </div>
    </section>
  );
}

function formatMetricValue(value: number, description: MetricDescription) {
  if (description.format === "currency") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    }).format(value);
  }

  if (description.format === "percent") {
    return `${value.toLocaleString("en-GB")}%`;
  }

  return value.toLocaleString("en-GB");
}

function MetricCard({ description, value }: { description: MetricDescription; value: number }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{description.label}</CardDescription>
        <CardTitle className="text-3xl">{formatMetricValue(value, description)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{description.hint}</p>
      </CardContent>
    </Card>
  );
}

function LeaderboardCard({
  title,
  description,
  icon: Icon,
  items
}: {
  title: string;
  description: string;
  icon: typeof UsersRound;
  items: Array<{
    key: string;
    href: string | null;
    label: string;
    meta: string | null;
    value: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Icon size={18} className="text-gold" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item) => {
            const content = (
              <div className="rounded-xl border border-border/80 bg-background/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    {item.meta ? <p className="truncate text-xs text-muted">{item.meta}</p> : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                    {item.value}
                  </Badge>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.key} href={item.href}>
                {content}
              </Link>
            ) : (
              <div key={item.key}>{content}</div>
            );
          })
        ) : (
          <EmptyState
            title="No data yet"
            description="Growth signals will appear here as members invite and contribute."
            icon={Icon}
          />
        )}
      </CardContent>
    </Card>
  );
}
