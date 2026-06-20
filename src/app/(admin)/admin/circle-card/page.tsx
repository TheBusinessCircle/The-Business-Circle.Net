import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  ContactRound,
  Crown,
  ExternalLink,
  Files,
  Handshake,
  Link2,
  Network,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  UserRound,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  CIRCLE_CARD_ACCOUNT_TYPE_COPY,
  getCircleCardAccountTypeLabel
} from "@/lib/circle-card/identity";
import {
  CIRCLE_CARD_PLAN_DEFINITIONS,
  CIRCLE_CARD_PLANS
} from "@/lib/circle-card/plans";
import {
  circleCardReportReasonLabel,
  circleCardReportStatusLabel
} from "@/lib/circle-card/reports";
import { createPageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import {
  getAdminCircleCardCommandCentre,
  type AdminCircleCardTopCard
} from "@/server/admin/circle-card-command-centre.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetricItem = {
  label: string;
  value: number;
  valueLabel?: string;
  hint: string;
};

const sectionTabs = [
  { label: "Overview", href: "#overview" },
  { label: "Plans", href: "#plans" },
  { label: "Users & Cards", href: "#users-cards" },
  { label: "Activity", href: "#activity" },
  { label: "Safety", href: "#safety" },
  { label: "Files", href: "#files" },
  { label: "Scanner", href: "#scanner" }
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Circle Card Command Centre",
  description: "Admin command centre for Circle Card usage, growth, safety, and activity.",
  path: "/admin/circle-card",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function numberLabel(value: number) {
  return value.toLocaleString("en-GB");
}

function displayPerson(user: { name: string | null; email: string | null }) {
  return user.name || user.email || "Unknown user";
}

function displayCard(card: { fullName: string; businessName: string | null } | null) {
  if (!card) {
    return "No card attached";
  }

  return [card.fullName, card.businessName].filter(Boolean).join(" / ");
}

export default async function AdminCircleCardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const dashboard = await getAdminCircleCardCommandCentre({ query });

  const overviewMetrics: MetricItem[] = [
    {
      label: "Total Circle Card users",
      value: dashboard.overview.totalCircleCardUsers,
      hint: "Users with at least one Circle Card."
    },
    { label: "Total cards", value: dashboard.overview.totalCards, hint: "All Circle Cards created." },
    {
      label: "Published cards",
      value: dashboard.overview.publishedCards,
      hint: "Publicly visible cards."
    },
    {
      label: "Unpublished cards",
      value: dashboard.overview.unpublishedCards,
      hint: "Cards held back from public view."
    },
    { label: "Free users", value: dashboard.overview.freeUsers, hint: "Card owners without active BCN access." },
    {
      label: "BCN members using Circle Card",
      value: dashboard.overview.bcnMembersUsingCircleCard,
      hint: "Admins or active/trialing members with cards."
    },
    {
      label: "Total public card views",
      value: dashboard.overview.totalPublicCardViews,
      hint: "Sum of stored public view counters."
    },
    { label: "QR views", value: dashboard.overview.qrViews, hint: "QR panel view events." },
    { label: "QR source views", value: dashboard.overview.qrSourceViews, hint: "Public visits from QR source links." },
    {
      label: "NFC source views",
      value: dashboard.overview.nfcSourceViews,
      hint: "Public visits from NFC source links."
    },
    {
      label: "Event source views",
      value: dashboard.overview.eventSourceViews,
      hint: "Public visits from event source links."
    },
    { label: "Direct views", value: dashboard.overview.directViews, hint: "Public visits without a source tag." },
    { label: "vCard downloads", value: dashboard.overview.vCardDownloads, hint: "Contact downloads." },
    { label: "Shares", value: dashboard.overview.shares, hint: "Tracked share actions." },
    { label: "Wallet saves", value: dashboard.overview.walletSaves, hint: "Cards saved into Circle Wallet." },
    {
      label: "Connection requests",
      value: dashboard.overview.connectionRequests,
      hint: "All Circle Card connection requests."
    },
    {
      label: "Accepted connections",
      value: dashboard.overview.acceptedConnections,
      hint: "Accepted request records."
    },
    { label: "Recommendations", value: dashboard.overview.recommendations, hint: "Recommendation records." },
    { label: "Introductions", value: dashboard.overview.introductions, hint: "Introductions created." },
    { label: "Referrals", value: dashboard.overview.referrals, hint: "Referral records." },
    { label: "Opportunities", value: dashboard.overview.opportunities, hint: "Pipeline opportunities." },
    { label: "Won opportunities", value: dashboard.overview.wonOpportunities, hint: "Closed-won opportunities." },
    {
      label: "Business card scans",
      value: dashboard.overview.businessCardScans,
      hint: "Scanner events recorded."
    },
    { label: "Files uploaded", value: dashboard.overview.filesUploaded, hint: "Smart links with file metadata." },
    {
      label: "Private file unlocks",
      value: dashboard.overview.privateFileUnlocks,
      hint: "Successful private unlock events."
    },
    {
      label: "Failed private unlocks",
      value: dashboard.overview.failedPrivateUnlocks,
      hint: "Failed private unlock attempts."
    },
    { label: "Open reports", value: dashboard.overview.openReports, hint: "Reports awaiting first review." }
  ];

  const planMetrics: MetricItem[] = CIRCLE_CARD_PLANS.map((plan) => ({
    label: `${CIRCLE_CARD_PLAN_DEFINITIONS[plan].shortLabel} users`,
    value: dashboard.plans.counts[plan],
    hint:
      plan === "FREE"
        ? "Users currently treated as Circle Card Free because no paid Circle Card plan assignment exists yet."
        : `${CIRCLE_CARD_PLAN_DEFINITIONS[plan].description} Count stays 0 until paid Circle Card assignment exists.`
  }));

  const accountTypeMetrics: MetricItem[] = [
    {
      label: CIRCLE_CARD_ACCOUNT_TYPE_COPY.INDIVIDUAL.shortLabel,
      value: dashboard.plans.accountTypeCounts.INDIVIDUAL,
      hint: CIRCLE_CARD_ACCOUNT_TYPE_COPY.INDIVIDUAL.description
    },
    {
      label: CIRCLE_CARD_ACCOUNT_TYPE_COPY.FOUNDER.shortLabel,
      value: dashboard.plans.accountTypeCounts.FOUNDER,
      hint: CIRCLE_CARD_ACCOUNT_TYPE_COPY.FOUNDER.description
    },
    {
      label: CIRCLE_CARD_ACCOUNT_TYPE_COPY.TEAM.shortLabel,
      value: dashboard.plans.accountTypeCounts.TEAM,
      hint: CIRCLE_CARD_ACCOUNT_TYPE_COPY.TEAM.description
    },
    {
      label: "Unknown",
      value: dashboard.plans.accountTypeCounts.UNKNOWN,
      hint: "Cards created before account type was captured."
    }
  ];

  const planSignalMetrics: MetricItem[] = [
    {
      label: "Users likely needing Pro",
      value: dashboard.plans.likelyProUsers.length,
      hint: "Founder/business, link, traffic, recommendation, referral or opportunity signals."
    },
    {
      label: "Users likely needing Teams",
      value: dashboard.plans.likelyTeamsUsers.length,
      hint: "Team / Organisation account type signals."
    }
  ];

  const growthMetrics: MetricItem[] = [
    { label: "New users today", value: dashboard.growth.newUsersToday, hint: "Circle Card owners created today." },
    {
      label: "New users this week",
      value: dashboard.growth.newUsersThisWeek,
      hint: "Circle Card owners from the last 7 days."
    },
    {
      label: "New users this month",
      value: dashboard.growth.newUsersThisMonth,
      hint: "Circle Card owners from the last 30 days."
    },
    { label: "New cards today", value: dashboard.growth.newCardsToday, hint: "Cards created today." },
    { label: "New cards this week", value: dashboard.growth.newCardsThisWeek, hint: "Cards from the last 7 days." },
    {
      label: "New cards this month",
      value: dashboard.growth.newCardsThisMonth,
      hint: "Cards from the last 30 days."
    },
    {
      label: "Recently active users",
      value: dashboard.growth.recentlyActiveUsers.length,
      hint: `Latest ${dashboard.meta.recentLimit} activity actors.`
    },
    {
      label: "Recently updated cards",
      value: dashboard.growth.recentlyUpdatedCards.length,
      hint: `Latest ${dashboard.meta.recentLimit} updated card records.`
    }
  ];

  const activationMetrics: MetricItem[] = [
    {
      label: "New users",
      value: dashboard.activation.newUsers,
      hint: "Circle Card users created in the last 30 days."
    },
    {
      label: "Activated users",
      value: dashboard.activation.activatedUsers,
      hint: "Users with photo, business, featured link and share complete."
    },
    {
      label: "Activation %",
      value: dashboard.activation.activationRate,
      valueLabel: `${dashboard.activation.activationRate}%`,
      hint: "Activated users divided by total Circle Card users."
    },
    {
      label: "Completion %",
      value: dashboard.activation.averageCompletion,
      valueLabel: `${dashboard.activation.averageCompletion}%`,
      hint: "Average Circle Card completion score."
    }
  ];

  const relationshipMetrics: MetricItem[] = [
    {
      label: "Connection requests",
      value: dashboard.relationship.totals.connectionRequests,
      hint: "All requests."
    },
    {
      label: "Connections accepted",
      value: dashboard.relationship.totals.acceptedConnections,
      hint: "Accepted requests."
    },
    { label: "Recommendations", value: dashboard.relationship.totals.recommendations, hint: "All recommendations." },
    { label: "Introductions", value: dashboard.relationship.totals.introductions, hint: "All introductions." },
    { label: "Referrals", value: dashboard.relationship.totals.referrals, hint: "All referrals." },
    { label: "Opportunities", value: dashboard.relationship.totals.opportunities, hint: "All opportunities." },
    {
      label: "Won opportunities",
      value: dashboard.relationship.totals.wonOpportunities,
      hint: "Closed-won pipeline."
    }
  ];

  const fileMetrics: MetricItem[] = [
    { label: "Total smart links", value: dashboard.files.totalSmartLinks, hint: "All smart links." },
    { label: "Active smart links", value: dashboard.files.activeSmartLinks, hint: "Currently active links." },
    { label: "File-backed links", value: dashboard.files.fileBackedLinks, hint: "Links with uploaded file data." },
    { label: "Private links", value: dashboard.files.privateLinks, hint: "Access-code protected links." },
    {
      label: "Private unlock successes",
      value: dashboard.files.privateUnlockSuccesses,
      hint: "Successful access-code unlocks."
    },
    {
      label: "Private unlock failures",
      value: dashboard.files.privateUnlockFailures,
      hint: "Failed access-code attempts."
    }
  ];

  const scannerMetrics: MetricItem[] = [
    {
      label: "Business cards scanned",
      value: dashboard.scanner.businessCardsScanned,
      hint: "Scanner events recorded."
    },
    {
      label: "Scanned contacts created",
      value: dashboard.scanner.scannedContactsCreated,
      hint: "Wallet contacts from scans."
    },
    {
      label: "Claim links generated",
      value: dashboard.scanner.claimLinksGenerated,
      hint: "Claim links for scanned contacts."
    },
    {
      label: "Existing Circle Card matches found",
      value: dashboard.scanner.existingCircleCardMatchesFound,
      hint: "Scanner match events."
    }
  ];

  const safetyMetrics: MetricItem[] = [
    { label: "Open reports", value: dashboard.safety.openReports, hint: "Awaiting review." },
    { label: "Reports reviewing", value: dashboard.safety.reportsReviewing, hint: "In human review." },
    { label: "Reports resolved", value: dashboard.safety.reportsResolved, hint: "Resolved reports." },
    { label: "Reports dismissed", value: dashboard.safety.reportsDismissed, hint: "Dismissed reports." }
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-gold/45 bg-gradient-to-br from-gold/18 via-card/82 to-card/70 shadow-gold-soft">
        <CardHeader className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="premium">
                <BadgeCheck size={12} className="mr-1" />
                Circle Card Command
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl sm:text-4xl">
                Circle Card Command Centre
              </CardTitle>
              <CardDescription className="mt-2 max-w-4xl text-base">
                Usage, growth, safety, users, cards, links, scanner activity and relationship flow
                across the Circle Card ecosystem.
              </CardDescription>
            </div>
            <div className="grid min-w-[210px] gap-2 rounded-2xl border border-gold/30 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-gold">Platform pulse</p>
              <p className="text-3xl font-semibold text-foreground">
                {numberLabel(dashboard.overview.totalPublicCardViews)}
              </p>
              <p className="text-xs text-muted">stored public card views</p>
            </div>
          </div>

          <form method="GET" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input name="q" defaultValue={query} placeholder="Search users, emails, cards, business names or slugs" className="pl-9" />
            </div>
            <Button type="submit" size="sm" className="gap-2">
              <Search size={14} />
              Search
            </Button>
            <Link href="/admin/circle-card">
              <Button type="button" variant="ghost" size="sm" className="w-full">
                Reset
              </Button>
            </Link>
          </form>
        </CardHeader>
        <CardContent>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {sectionTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 rounded-xl border border-border/70 bg-background/25 px-3 py-2 text-sm text-muted transition-colors hover:border-gold/35 hover:text-foreground"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>

      {query ? <SearchResults dashboard={dashboard} /> : null}

      <section id="overview" className="scroll-mt-24 space-y-3">
        <SectionHeading
          icon={BarChart3}
          eyebrow="Overview"
          title="Overview Metrics"
          description="The full Circle Card operating snapshot in compact tiles."
        />
        <MetricGrid metrics={overviewMetrics} />
      </section>

      <section id="plans" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={Crown}
          eyebrow="Plans"
          title="Circle Card Plan Boundary"
          description="Free, Pro and Teams visibility without changing BCN membership or Stripe."
        />
        <MetricGrid metrics={planMetrics} />
        <MetricGrid metrics={accountTypeMetrics} />
        <MetricGrid metrics={planSignalMetrics} />
        <p className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-sm leading-relaxed text-muted">
          {dashboard.plans.note}
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          <PlanCandidatePanel
            title="Users likely needing Pro"
            description="Founder, business growth and lead-capture signals from current Circle Card usage."
            items={dashboard.plans.likelyProUsers}
            emptyTitle="No Pro signals yet"
          />
          <PlanCandidatePanel
            title="Users likely needing Teams"
            description="Company, organisation and staff rollout signals from current Circle Card usage."
            items={dashboard.plans.likelyTeamsUsers}
            emptyTitle="No Teams signals yet"
          />
        </div>
      </section>

      <section id="users-cards" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={UsersRound}
          eyebrow="Users & Cards"
          title="Growth Snapshot"
          description="New accounts, new cards and the freshest user/card movement."
        />
        <MetricGrid metrics={growthMetrics} />

        <div className="space-y-4">
          <SectionHeading
            icon={BadgeCheck}
            eyebrow="Activation"
            title="Activation Snapshot"
            description="Completion and activation health for Circle Card users."
          />
          <MetricGrid metrics={activationMetrics} />

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <UserRound size={18} className="text-gold" />
                Top Incomplete Users
              </CardTitle>
              <CardDescription>Lowest completion scores that need setup attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.activation.topIncompleteUsers.length ? (
                dashboard.activation.topIncompleteUsers.map((item) => (
                  <div
                    key={item.cardId}
                    className="rounded-2xl border border-border/80 bg-background/25 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {item.fullName}
                          {item.businessName ? ` / ${item.businessName}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted">{item.ownerEmail}</p>
                        <p className="mt-2 text-xs leading-relaxed text-muted">
                          Missing: {item.missingItems.slice(0, 4).join(", ") || "None"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-gold/28 text-gold">
                          {item.completionScore}%
                        </Badge>
                        <AdminLinkButton href={`/admin/members/${item.userId}`} label="Member" />
                        <AdminLinkButton href={`/card/${item.slug}`} label="Card" external />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={BadgeCheck}
                  title="No incomplete users"
                  description="Circle Card completion issues will appear here."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Activity size={18} className="text-gold" />
                Recently Active Users
              </CardTitle>
              <CardDescription>Latest Circle Card activity actors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.growth.recentlyActiveUsers.length ? (
                dashboard.growth.recentlyActiveUsers.map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    title={displayPerson(activity.user)}
                    meta={activity.user.email}
                    detail={activity.circleCard ? displayCard(activity.circleCard) : activity.title}
                    href={`/admin/members/${activity.user.id}`}
                    date={activity.createdAt}
                  />
                ))
              ) : (
                <EmptyState icon={Activity} title="No recent activity" description="Circle Card activity will appear here." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ContactRound size={18} className="text-gold" />
                Recently Updated Cards
              </CardTitle>
              <CardDescription>Latest updated Circle Card records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.growth.recentlyUpdatedCards.length ? (
                dashboard.growth.recentlyUpdatedCards.map((card) => (
                  <CardRow
                    key={card.id}
                    name={card.fullName}
                    businessName={card.businessName}
                    slug={card.slug}
                    ownerEmail={card.user.email}
                    ownerId={card.user.id}
                    badge={card.isPublished ? "Published" : "Unpublished"}
                    date={card.updatedAt}
                  />
                ))
              ) : (
                <EmptyState icon={ContactRound} title="No cards yet" description="Updated cards will appear here." />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <TopCardsPanel title="Most Viewed Cards" metricLabel="views" items={dashboard.topCards.mostViewed} />
          <TopCardsPanel title="Most Saved Cards" metricLabel="saves" items={dashboard.topCards.mostSaved} />
          <TopCardsPanel title="Most Shared Cards" metricLabel="shares" items={dashboard.topCards.mostShared} />
          <TopCardsPanel title="Most Recommended Cards" metricLabel="recommendations" items={dashboard.topCards.mostRecommended} />
          <TopCardsPanel
            title="Most Successful Referral Cards"
            metricLabel="won referrals"
            items={dashboard.topCards.mostSuccessfulReferrals}
          />
        </div>
      </section>

      <section id="activity" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={Network}
          eyebrow="Activity"
          title="Relationship Activity"
          description="Connection, recommendation, introduction, referral and opportunity flow."
        />
        <MetricGrid metrics={relationshipMetrics} />

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Handshake size={18} className="text-gold" />
              Latest Relationship Stream
            </CardTitle>
            <CardDescription>Recent relationship activity across Circle Card.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.relationship.latestActivity.length ? (
              dashboard.relationship.latestActivity.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  title={activity.title}
                  meta={displayPerson(activity.user)}
                  detail={activity.message}
                  href={`/admin/members/${activity.user.id}`}
                  date={activity.createdAt}
                />
              ))
            ) : (
              <EmptyState icon={Handshake} title="No relationship activity" description="Relationship actions will appear here." />
            )}
          </CardContent>
        </Card>
      </section>

      <section id="safety" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={ShieldAlert}
          eyebrow="Safety"
          title="Safety and Moderation"
          description="Report volume, reason mix and the latest moderation queue movement."
        />
        <MetricGrid metrics={safetyMetrics} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Reports by Reason</CardTitle>
              <CardDescription>Grouped report reasons across Circle Card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.safety.reportsByReason.length ? (
                dashboard.safety.reportsByReason.map((report) => (
                  <div key={report.reason} className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/25 px-3 py-2">
                    <span className="text-sm text-foreground">{circleCardReportReasonLabel(report.reason)}</span>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {numberLabel(report.count)}
                    </Badge>
                  </div>
                ))
              ) : (
                <EmptyState icon={ShieldAlert} title="No reports yet" description="Report reasons will appear here." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Latest Reports</CardTitle>
                <CardDescription>Newest Circle Card reports for quick triage.</CardDescription>
              </div>
              <Link href="/admin/circle-card/moderation">
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  <ShieldAlert size={14} />
                  Queue
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.safety.latestReports.length ? (
                dashboard.safety.latestReports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-border/80 bg-background/25 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={report.status === "OPEN" ? "warning" : "outline"} className="normal-case tracking-normal">
                        {circleCardReportStatusLabel(report.status)}
                      </Badge>
                      <Badge variant="outline" className="normal-case tracking-normal text-muted">
                        {circleCardReportReasonLabel(report.reason)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{displayCard(report.card)}</p>
                    <p className="mt-1 text-xs text-muted">
                      Reporter: {report.reporterUser ? displayPerson(report.reporterUser) : "Anonymous"} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState icon={ShieldAlert} title="No report history" description="Latest reports will appear here." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="files" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={Files}
          eyebrow="Files"
          title="File and Link Activity"
          description="Smart links, private unlocks and the most-clicked destinations."
        />
        <MetricGrid metrics={fileMetrics} />

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Link2 size={18} className="text-gold" />
              Most Clicked Links
            </CardTitle>
            <CardDescription>Top smart links by tracked custom-link clicks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.files.mostClickedLinks.length ? (
              dashboard.files.mostClickedLinks.map((link) => (
                <div key={link.id} className="rounded-xl border border-border/80 bg-background/25 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{link.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {displayCard({ fullName: link.cardName, businessName: link.businessName })} · /card/{link.slug}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted">{link.ownerEmail}</p>
                    </div>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {numberLabel(link.clicks)} clicks
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminLinkButton href={`/card/${link.slug}`} label="Public card" external />
                    <AdminLinkButton href={`/admin/members/${link.ownerId}`} label="Owner" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Link2} title="No link clicks yet" description="Clicked smart links will appear here." />
            )}
          </CardContent>
        </Card>
      </section>

      <section id="scanner" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={ScanLine}
          eyebrow="Scanner"
          title="Scanner Activity"
          description="Business card scanner usage and conversion into contacts or claim links."
        />
        <MetricGrid metrics={scannerMetrics} />
      </section>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description
}: {
  icon: typeof BarChart3;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-silver">{eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: MetricItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-border/80 bg-background/25 p-4 shadow-inner-surface">
          <p className="text-xs text-muted">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {metric.valueLabel ?? numberLabel(metric.value)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{metric.hint}</p>
        </div>
      ))}
    </div>
  );
}

function AdminLinkButton({
  href,
  label,
  external = false
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      <Button type="button" variant="outline" size="sm" className="gap-2">
        {external ? <ExternalLink size={13} /> : <UserRound size={13} />}
        {label}
      </Button>
    </Link>
  );
}

function TopCardsPanel({
  title,
  metricLabel,
  items
}: {
  title: string;
  metricLabel: string;
  items: AdminCircleCardTopCard[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <QrCode size={18} className="text-gold" />
          {title}
        </CardTitle>
        <CardDescription>Showing up to five cards.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((card) => (
            <CardRow
              key={card.id}
              name={card.name}
              businessName={card.businessName}
              slug={card.slug}
              ownerEmail={card.ownerEmail}
              ownerId={card.ownerId}
              badge={`${numberLabel(card.metricValue)} ${metricLabel}`}
            />
          ))
        ) : (
          <EmptyState icon={QrCode} title="No performance data yet" description="Top cards will appear as activity grows." />
        )}
      </CardContent>
    </Card>
  );
}

function CardRow({
  name,
  businessName,
  slug,
  ownerEmail,
  ownerId,
  badge,
  date
}: {
  name: string;
  businessName: string | null;
  slug: string;
  ownerEmail: string;
  ownerId: string;
  badge: string;
  date?: Date;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-background/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="mt-1 truncate text-xs text-muted">{businessName || "No business name"}</p>
          <p className="mt-1 break-all text-xs text-muted">/card/{slug} · {ownerEmail}</p>
          {date ? <p className="mt-1 text-xs text-muted">Updated {formatDate(date)}</p> : null}
        </div>
        <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
          {badge}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminLinkButton href={`/card/${slug}`} label="Public card" external />
        <AdminLinkButton href={`/admin/members/${ownerId}`} label="Owner" />
      </div>
    </article>
  );
}

function ActivityRow({
  title,
  meta,
  detail,
  href,
  date
}: {
  title: string;
  meta: string | null;
  detail: string;
  href: string;
  date: Date;
}) {
  return (
    <Link href={href} className="block rounded-xl border border-border/80 bg-background/25 p-3 transition-colors hover:border-gold/35">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {meta ? <p className="mt-1 break-all text-xs text-muted">{meta}</p> : null}
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{detail}</p>
        </div>
        <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
          {formatDate(date)}
        </Badge>
      </div>
    </Link>
  );
}

type PlanCandidate = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["plans"]["likelyProUsers"][number];

function PlanCandidatePanel({
  title,
  description,
  items,
  emptyTitle
}: {
  title: string;
  description: string;
  items: PlanCandidate[];
  emptyTitle: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Crown size={18} className="text-gold" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <article key={`${item.userId}-${item.cardId}`} className="rounded-xl border border-border/80 bg-background/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayCard({ fullName: item.fullName, businessName: item.businessName })}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted">
                    {item.ownerName ? `${item.ownerName} / ` : ""}
                    {item.ownerEmail}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.accountType ? (
                      <Badge variant="outline" className="normal-case tracking-normal text-muted">
                        {getCircleCardAccountTypeLabel(item.accountType)}
                      </Badge>
                    ) : null}
                    {item.reasons.slice(0, 4).map((reason) => (
                      <Badge key={reason} variant="outline" className="normal-case tracking-normal text-muted">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                  {item.score} signal{item.score === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminLinkButton href={`/card/${item.slug}`} label="Public card" external />
                <AdminLinkButton href={`/admin/members/${item.userId}`} label="Owner" />
              </div>
            </article>
          ))
        ) : (
          <EmptyState icon={Crown} title={emptyTitle} description="Matching users will appear here as Circle Card usage grows." />
        )}
      </CardContent>
    </Card>
  );
}

function SearchResults({ dashboard }: { dashboard: Awaited<ReturnType<typeof getAdminCircleCardCommandCentre>> }) {
  const search = dashboard.search;

  return (
    <section className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Search size={18} className="text-gold" />
            Search Results
          </CardTitle>
          <CardDescription>
            {search.active
              ? `${search.cards.length + search.users.length} matches for "${search.query}".`
              : "Use at least two characters to search Circle Card users and cards."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-silver">Cards</p>
            {search.cards.length ? (
              search.cards.map((card) => (
                <CardRow
                  key={card.id}
                  name={card.fullName}
                  businessName={card.businessName}
                  slug={card.slug}
                  ownerEmail={card.user.email}
                  ownerId={card.user.id}
                  badge={`${numberLabel(card.viewCount)} views`}
                  date={card.updatedAt}
                />
              ))
            ) : (
              <EmptyState icon={ContactRound} title="No matching cards" description="Matching Circle Cards will appear here." />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-silver">Users</p>
            {search.users.length ? (
              search.users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/members/${user.id}`}
                  className="block rounded-xl border border-border/80 bg-background/25 p-3 transition-colors hover:border-gold/35"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{displayPerson(user)}</p>
                      <p className="mt-1 break-all text-xs text-muted">{user.email}</p>
                      <p className="mt-2 text-xs text-muted">
                        {user.circleCards.length} card{user.circleCards.length === 1 ? "" : "s"} · {user.registrationSource || "member"}
                      </p>
                    </div>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {user.subscription?.status ?? user.role}
                    </Badge>
                  </div>
                  {user.circleCards.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.circleCards.map((card) => (
                        <span key={card.id} className="rounded-full border border-border/70 bg-background/35 px-2.5 py-1 text-xs text-muted">
                          /card/{card.slug}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              ))
            ) : (
              <EmptyState icon={UsersRound} title="No matching users" description="Matching users will appear here." />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
