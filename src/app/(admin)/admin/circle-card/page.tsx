import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  ContactRound,
  Coins,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Files,
  Handshake,
  Link2,
  Network,
  QrCode,
  ScanLine,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { BackToTopButton } from "@/components/ui/back-to-top-button";
import {
  generateCircleCardCommissionLedgerAction,
  markCircleCardCommissionPaidAction,
  updateCircleCardAmbassadorProfileAction,
  voidCircleCardCommissionAction
} from "@/actions/admin/circle-card-commission.actions";
import {
  CIRCLE_CARD_ACCOUNT_TYPE_COPY,
  getCircleCardAccountTypeLabel
} from "@/lib/circle-card/identity";
import {
  CIRCLE_CARD_PLAN_DEFINITIONS,
  CIRCLE_CARD_PLANS
} from "@/lib/circle-card/plans";
import {
  CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS,
  CIRCLE_CARD_ENTITLEMENT_SOURCES
} from "@/lib/circle-card/permissions";
import {
  formatCircleCardAnnualPrice,
  formatCircleCardPrice,
  getCircleCardBillingReadiness
} from "@/lib/circle-card/pricing";
import {
  circleCardReportReasonLabel,
  circleCardReportStatusLabel
} from "@/lib/circle-card/reports";
import { createPageMetadata } from "@/lib/seo";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getAdminCircleCardCommandCentre,
  type AdminCircleCardTopCard
} from "@/server/admin/circle-card-command-centre.service";
import { getCircleCardCommissionMonitorForCurrentAdmin } from "@/server/circle-card/commission.service";

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
  { label: "Referrals", href: "#referrals" },
  { label: "Commissions", href: "#commissions" },
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
  const referralSort = firstValue(params.refSort).trim();
  const referralCode = firstValue(params.refCode).trim();
  const dashboard = await getAdminCircleCardCommandCentre({
    query,
    referralSort,
    referralCode
  });
  const commissionMonitor = await getCircleCardCommissionMonitorForCurrentAdmin();
  const pricingReadiness = getCircleCardBillingReadiness();
  const proAnnualPrice = formatCircleCardAnnualPrice("PRO");
  const teamsAnnualPrice = formatCircleCardAnnualPrice("TEAMS");

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
    {
      label: "Discover visible users",
      value: dashboard.discoverPrivacy.visibleUsers,
      hint: "Users with at least one published card opted in to Discover."
    },
    {
      label: "Discover hidden users",
      value: dashboard.discoverPrivacy.hiddenUsers,
      hint: "Circle Card users without a currently visible Discover card."
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
        ? "Users with Free Circle Card entitlement after BCN included Pro and overrides are separated."
        : `${CIRCLE_CARD_PLAN_DEFINITIONS[plan].description} Source counts below distinguish paid access from included or override access.`
  }));
  const referralFunnelMetrics: MetricItem[] = [
    {
      label: "Referral Clicks",
      value: dashboard.referralEngine.funnel.clicks,
      hint: "Tracked visits through Circle Card referral links."
    },
    {
      label: "Referral Signups",
      value: dashboard.referralEngine.funnel.signups,
      hint: "Users attributed to a Circle Card referrer."
    },
    {
      label: "Referral Activations",
      value: dashboard.referralEngine.funnel.activations,
      hint: "Referred users who completed key Circle Card setup."
    },
    {
      label: "Referral Pro Interest",
      value: dashboard.referralEngine.funnel.proInterest,
      hint: "Referred users or visitors who registered Pro interest."
    },
    {
      label: "Referral Teams Interest",
      value: dashboard.referralEngine.funnel.teamsInterest,
      hint: "Referred users or visitors who registered Teams interest."
    }
  ];
  const entitlementSourceHints = {
    FREE: "No paid Circle Card subscription, BCN included Pro, admin override or early access source.",
    PRO_SUBSCRIPTION: "Future paid Circle Card Pro subscriptions only.",
    TEAMS_SUBSCRIPTION: "Future paid Circle Card Teams subscriptions only.",
    BCN_INCLUDED_PRO: "Active BCN members receiving Circle Card Pro without a separate Circle Card subscription.",
    ADMIN_OVERRIDE: "Admin Preview access, separate from paid and BCN-included reporting.",
    EARLY_ACCESS: "Future early-access grants, separate from paid and BCN-included reporting.",
    AMBASSADOR_FREE_PRO: "Founding Ambassador free Pro access. Not a paid subscription source."
  } satisfies Record<(typeof CIRCLE_CARD_ENTITLEMENT_SOURCES)[number], string>;
  const entitlementSourceMetrics: MetricItem[] = CIRCLE_CARD_ENTITLEMENT_SOURCES.map((source) => ({
    label: CIRCLE_CARD_ENTITLEMENT_SOURCE_LABELS[source],
    value: dashboard.plans.sourceCounts[source],
    hint: entitlementSourceHints[source]
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
      label: "Free users",
      value: dashboard.plans.counts.FREE,
      hint: "Circle Card users currently treated as Free."
    },
    {
      label: "Pro interest leads",
      value: dashboard.plans.proInterestCount,
      hint: "Leads tagged from the Circle Card Pro interest form."
    },
    {
      label: "Teams interest leads",
      value: dashboard.plans.teamsInterestCount,
      hint: "Leads tagged from the Circle Card Teams interest form."
    },
    {
      label: "Likely Pro candidates",
      value: dashboard.plans.likelyProUsers.length,
      hint: "Founder/business, link, traffic, recommendation, referral or opportunity signals."
    },
    {
      label: "Likely Teams candidates",
      value: dashboard.plans.likelyTeamsUsers.length,
      hint: "Team / Organisation account type signals."
    },
    {
      label: "Multi-card fit",
      value: dashboard.plans.multiCardCandidates.length,
      hint: "Business identity with only one Circle Card."
    },
    {
      label: "Closest to Free limits",
      value: dashboard.plans.freeLimitUsers.length,
      hint: "Featured links, wallet growth, profile completion, shares and view activity."
    }
  ];
  const multiCardFoundationMetrics: MetricItem[] = [
    {
      label: "Multi-card users",
      value: dashboard.multiCardFoundation.multiCardUsers,
      hint: "Users with more than one active Circle Card."
    },
    {
      label: "Business cards",
      value: dashboard.multiCardFoundation.businessCards,
      hint: "Active cards stored with Business card type."
    },
    {
      label: "Creator cards",
      value: dashboard.multiCardFoundation.creatorCards,
      hint: "Active cards stored with Creator card type."
    },
    {
      label: "Personal cards",
      value: dashboard.multiCardFoundation.personalCards,
      hint: "Active cards stored with Personal card type."
    },
    {
      label: "Default cards",
      value:
        dashboard.multiCardFoundation.defaultCardCounts.PERSONAL +
        dashboard.multiCardFoundation.defaultCardCounts.BUSINESS +
        dashboard.multiCardFoundation.defaultCardCounts.CREATOR,
      hint: "Active cards marked as the owner default landing card."
    },
    {
      label: "Users at card limit",
      value: dashboard.multiCardFoundation.usersAtCardLimit,
      hint: "Current active card count is at the resolved entitlement limit."
    },
    {
      label: "Missing default",
      value: dashboard.multiCardFoundation.usersMissingDefaultCard,
      hint: "Active card owners without a default card marker."
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
      label: "Most active users",
      value: dashboard.growth.mostActiveUsers.length,
      hint: "Top Circle Card activity actors from the last 7 days."
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

      <section id="referrals" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={Send}
          eyebrow="Referral Engine"
          title="Referral Growth"
          description="Referral clicks, signups, activations and early Pro or Teams intent."
        />
        <MetricGrid metrics={referralFunnelMetrics} />
        <ReferralEnginePanel referralEngine={dashboard.referralEngine} />
      </section>

      {commissionMonitor ? (
        <section id="commissions" className="scroll-mt-24 space-y-4">
          <SectionHeading
            icon={Coins}
            eyebrow="Platform owner"
            title="Commission Monitor"
            description="Manual, auditable Circle Card Pro commission estimates. No payouts run here."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Founding Ambassadors", commissionMonitor.totalAmbassadors],
              ["Standard referrers", commissionMonitor.standardReferrers],
              ["Active Pro referrals", commissionMonitor.activeProReferrals],
              ["Paid Pro subscribers", commissionMonitor.paidSubscribers],
              ["Monthly subscribers", commissionMonitor.monthlySubscribers],
              ["Annual subscribers", commissionMonitor.annualSubscribers],
              ["Trialing", commissionMonitor.trialingCount],
              ["Past due", commissionMonitor.pastDueCount],
              ["Cancelling", commissionMonitor.cancellingAtPeriodEnd],
              ["Cancelled", commissionMonitor.cancelledCount],
              ["Paid referrals", commissionMonitor.paidReferralCount],
              [
                "Monthly liability",
                formatCurrency(commissionMonitor.estimatedMonthlyCommissionLiabilityPence / 100)
              ],
              ["Pending", formatCurrency(commissionMonitor.pendingCommissionPence / 100)],
              ["Paid", formatCurrency(commissionMonitor.paidCommissionPence / 100)],
              ["Current month rows", commissionMonitor.currentMonthRows]
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl border border-gold/18 bg-card/62 p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 truncate text-xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <Card className="border-gold/24 bg-gradient-to-br from-gold/10 via-card/72 to-background/25">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <Coins size={18} className="text-gold" />
                Current month ledger
              </CardTitle>
              <CardDescription>{commissionMonitor.notice} Entries begin as Pending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={generateCircleCardCommissionLedgerAction}>
                <Button type="submit" className="w-full gap-2 sm:w-auto">
                  <Coins size={16} />
                  Generate current month ledger
                </Button>
              </form>
              <p className="text-xs leading-relaxed text-muted">
                Safe to run again: the unique referrer, referred user and month key skips duplicates.
                This records estimates only and never contacts Stripe, a bank or a payout provider.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ambassador and test entitlement</CardTitle>
              <CardDescription>
                Owner-assigned only. Founding Ambassador places are capped at 50; free Pro is an
                internal entitlement override, not evidence of payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateCircleCardAmbassadorProfileAction} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto_auto] lg:items-center">
                <Input name="userId" required placeholder="User ID" />
                <select name="type" defaultValue="STANDARD" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="STANDARD">Standard</option>
                  <option value="FOUNDING_AMBASSADOR">Founding Ambassador</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="freeProGranted" /> Free Pro
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="active" defaultChecked /> Active
                </label>
                <Button type="submit" variant="outline">Save profile</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission rows</CardTitle>
              <CardDescription>Latest 40 private ledger entries. Paid and Void are manual owner decisions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {commissionMonitor.rows.length ? commissionMonitor.rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border/80 bg-background/25 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {displayPerson(row.referrerUser)} → {displayPerson(row.referredUser)}
                        </p>
                        <Badge variant="outline">{row.status}</Badge>
                        <Badge variant="outline" className="border-gold/24 text-gold">
                          {formatCurrency(row.amountPence / 100)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {row.tierApplied.replaceAll("_", " ")} · {row.source} · {formatDate(row.periodMonth)}
                      </p>
                      {row.statusReason ? <p className="mt-1 text-xs text-muted">{row.statusReason}</p> : null}
                    </div>
                    {row.status === "PENDING" || row.status === "APPROVED" ? (
                      <div className="grid shrink-0 grid-cols-2 gap-2">
                        <form action={markCircleCardCommissionPaidAction}>
                          <input type="hidden" name="ledgerId" value={row.id} />
                          <Button type="submit" size="sm" variant="outline" className="w-full">Mark paid</Button>
                        </form>
                        <form action={voidCircleCardCommissionAction}>
                          <input type="hidden" name="ledgerId" value={row.id} />
                          <Button type="submit" size="sm" variant="ghost" className="w-full">Void</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              )) : (
                <EmptyState icon={Coins} title="No commission rows" description="Generate the current month after Pro entitlements are ready." />
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section id="plans" className="scroll-mt-24 space-y-4">
        <SectionHeading
          icon={Crown}
          eyebrow="Plans"
          title="Circle Card Plan Boundary"
          description="Free, Pro and Teams visibility without changing BCN membership or Stripe."
        />
        <Card className="border-gold/24 bg-card/70">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Crown size={18} className="text-gold" />
              Pricing Readiness
            </CardTitle>
            <CardDescription>
              Circle Card billing preparation only. Stripe price IDs stay server-side and hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReadinessTile label="Billing enabled" ready={pricingReadiness.billingEnabled} />
            <ReadinessTile
              label="Pro monthly configured"
              ready={pricingReadiness.pro.monthlyPriceConfigured}
            />
            <ReadinessTile
              label="Pro annual configured"
              ready={pricingReadiness.pro.annualPriceConfigured}
            />
            <ReadinessTile label="Teams price configured" ready={pricingReadiness.teamsPriceConfigured} />
            <div className="rounded-xl border border-border/80 bg-background/25 p-3">
              <p className="text-xs text-muted">Configured prices</p>
              <p className="mt-2 text-sm text-foreground">
                Pro {formatCircleCardPrice("PRO")}
                {proAnnualPrice ? ` / ${proAnnualPrice}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                Teams {formatCircleCardPrice("TEAMS")}
                {teamsAnnualPrice ? ` / ${teamsAnnualPrice}` : ""}
              </p>
            </div>
            <ReadinessTile
              label="Referral Pro conversion ready"
              ready={dashboard.referralEngine.funnel.proInterest > 0}
            />
            <div className="rounded-xl border border-border/80 bg-background/25 p-3">
              <p className="text-xs text-muted">Interest / candidates</p>
              <p className="mt-2 text-sm text-foreground">
                Pro {numberLabel(dashboard.plans.proInterestCount)} / Teams{" "}
                {numberLabel(dashboard.plans.teamsInterestCount)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Likely: Pro {numberLabel(dashboard.plans.likelyProUsers.length)} / Teams{" "}
                {numberLabel(dashboard.plans.likelyTeamsUsers.length)}
              </p>
            </div>
          </CardContent>
        </Card>
        <MetricGrid metrics={planSignalMetrics} />
        <MetricGrid metrics={entitlementSourceMetrics} />
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/lead-generation?segment=CIRCLE_CARD_PRO_INTEREST" className="inline-flex w-fit">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Crown size={14} />
              View Pro interest leads
            </Button>
          </Link>
          <Link href="/admin/lead-generation?segment=CIRCLE_CARD_TEAMS_INTEREST" className="inline-flex w-fit">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <UsersRound size={14} />
              View Teams interest leads
            </Button>
          </Link>
        </div>
        <p className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-sm leading-relaxed text-muted">
          {dashboard.plans.note}
        </p>
        <details className="group rounded-2xl border border-border/80 bg-background/20 shadow-inner-surface">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Plan and account breakdown</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Paid Circle Card assignment and captured account-type signals.
              </p>
            </div>
            <ChevronDown size={17} className="mt-1 shrink-0 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-border/70 p-4">
            <MetricGrid metrics={planMetrics} />
            <MetricGrid metrics={accountTypeMetrics} />
          </div>
        </details>
        <FreeLimitCandidatePanel items={dashboard.plans.freeLimitUsers} />
        <div className="grid gap-4 xl:grid-cols-3">
          <PlanCandidatePanel
            title="Likely Pro candidates"
            description="Founder, business growth and lead-capture signals from current Circle Card usage."
            items={dashboard.plans.likelyProUsers}
            emptyTitle="No Pro signals yet"
          />
          <PlanCandidatePanel
            title="Pro multi-card candidates"
            description="Business or brand identity signals from users who still have only one Circle Card."
            items={dashboard.plans.multiCardCandidates}
            emptyTitle="No multi-card signals yet"
          />
          <PlanCandidatePanel
            title="Likely Teams candidates"
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
        <MetricGrid metrics={multiCardFoundationMetrics} />
        <DiscoverPrivacyPanel privacy={dashboard.discoverPrivacy} />

        <div className="space-y-4">
          <SectionHeading
            icon={BadgeCheck}
            eyebrow="Activation"
            title="Activation Snapshot"
            description="Completion and activation health for Circle Card users."
          />
          <MetricGrid metrics={activationMetrics} />
          <ActivationVisibilityPanel visibility={dashboard.activation.visibility} />

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

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Activity size={18} className="text-gold" />
                Most Active Users
              </CardTitle>
              <CardDescription>Highest Circle Card activity count from the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.growth.mostActiveUsers.length ? (
                dashboard.growth.mostActiveUsers.map((user) => (
                  <Link
                    key={user.userId}
                    href={`/admin/members/${user.userId}`}
                    className="block rounded-xl border border-border/80 bg-background/25 p-3 transition-colors hover:border-gold/35"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {displayPerson({ name: user.name, email: user.email })}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted">{user.email}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                          {user.primaryCard ? displayCard(user.primaryCard) : "No primary card yet"}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                        {numberLabel(user.metricValue)} actions
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState icon={Activity} title="No active users" description="Activity leaders will appear here." />
              )}
            </CardContent>
          </Card>

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
          <TopCardsPanel
            title="Fastest Growing Cards"
            metricLabel="recent signals"
            items={dashboard.topCards.fastestGrowing}
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
      <BackToTopButton />
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

function ReadinessTile({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/25 p-3">
      <p className="text-xs text-muted">{label}</p>
      <Badge
        variant={ready ? "success" : "outline"}
        className="mt-2 normal-case tracking-normal"
      >
        {ready ? "Yes" : "No"}
      </Badge>
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

type ReferralEngine = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["referralEngine"];

const referralSortOptions = [
  { label: "Clicks", value: "clicks" },
  { label: "Signups", value: "signups" },
  { label: "Activations", value: "activations" },
  { label: "Pro", value: "pro" },
  { label: "Teams", value: "teams" }
] as const;

const referralSourceTypeLabels = {
  direct_referral_route: "Direct referral route",
  circle_card_landing_ref: "Circle Card landing ref",
  public_card_ref: "Public card ref",
  spin_to_connect: "Spin To Connect",
  signup_referral_code: "Signup referral code",
  last_safe_source: "Last safe source"
} as const;

function ReferralEnginePanel({ referralEngine }: { referralEngine: ReferralEngine }) {
  const activeSortLabel =
    referralSortOptions.find((option) => option.value === referralEngine.sort)?.label ?? "Clicks";
  const validation = referralEngine.validation;
  const validationCode = validation?.query ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Send size={18} className="text-gold" />
          Referral Centre Intelligence
        </CardTitle>
        <CardDescription>
          Sorted by {activeSortLabel.toLowerCase()}. Reward calculations and payouts are not active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action="/admin/circle-card#referrals" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            name="refCode"
            defaultValue={validationCode}
            placeholder="Search referral code or public card slug"
            aria-label="Search referral code"
          />
          <Button type="submit" variant="outline" className="gap-2">
            <Search size={15} />
            Validate
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {referralSortOptions.map((option) => (
            <Link
              key={option.value}
              href={`/admin/circle-card?refSort=${option.value}${
                validationCode ? `&refCode=${encodeURIComponent(validationCode)}` : ""
              }#referrals`}
            >
              <Button
                type="button"
                variant={option.value === referralEngine.sort ? "default" : "outline"}
                size="sm"
              >
                {option.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Inactive", referralEngine.insights.referredButInactive],
            ["Incomplete", referralEngine.insights.referredButIncomplete],
            ["Activated", referralEngine.insights.referredAndActivated],
            ["Likely Pro", referralEngine.insights.likelyProCandidates]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border/80 bg-background/25 p-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {Number(value).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Direct links", referralEngine.funnel.directReferralClicks],
            ["Public card refs", referralEngine.funnel.publicCardReferralClicks],
            ["Spin To Connect", referralEngine.funnel.spinToConnectReferralClicks]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border/80 bg-background/25 p-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {Number(value).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
        </div>

        <details open={Boolean(validation)} className="group rounded-2xl border border-border/80 bg-background/20">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Live Referral Validation</p>
              <p className="mt-1 text-xs text-muted">
                Search a referral code or public card slug to inspect owner, flow counts and attribution events.
              </p>
            </div>
            <ChevronDown size={17} className="mt-1 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-border/70 p-4">
            {validation ? (
              <>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)]">
                  <div className="rounded-xl border border-border/80 bg-background/25 p-3">
                    <p className="text-xs text-muted">Referral owner</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {validation.owner?.name ?? (validation.found ? "Referral rows found" : "No owner found")}
                    </p>
                    {validation.owner?.email ? (
                      <p className="mt-1 break-all text-xs text-muted">{validation.owner.email}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminLinkButton href={validation.referralLink} label={validation.referralLink} external />
                      {validation.publicCardRefLink ? (
                        <AdminLinkButton href={validation.publicCardRefLink} label="Public ref test" external />
                      ) : null}
                      {validation.owner?.id ? (
                        <AdminLinkButton href={`/admin/members/${validation.owner.id}`} label="Member" />
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Clicks", validation.stats.clicks],
                      ["Signups", validation.stats.signups],
                      ["Activations", validation.stats.activations],
                      ["Pro", validation.stats.proInterest],
                      ["Teams", validation.stats.teamsInterest]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border/80 bg-background/25 p-3">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{numberLabel(Number(value))}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(referralSourceTypeLabels).map(([sourceType, label]) => (
                    <div key={sourceType} className="rounded-xl border border-border/80 bg-background/25 p-3">
                      <p className="text-xs text-muted">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {numberLabel(validation.sourceTypeCounts[sourceType as keyof typeof referralSourceTypeLabels] ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Recent attribution events</p>
                  {validation.recentEvents.length ? (
                    validation.recentEvents.map((event) => (
                      <ActivityRow
                        key={event.id}
                        title={event.referredUser?.name ?? "Pending signup"}
                        meta={event.referredUser?.email ?? event.referralCode}
                        detail={[
                          referralSourceTypeLabels[event.sourceType as keyof typeof referralSourceTypeLabels] ??
                            event.sourceType,
                          event.sourceCardSlug ? `card: ${event.sourceCardSlug}` : "",
                          event.sourceEvent ? `event: ${event.sourceEvent}` : "",
                          event.signedUpAt ? "signup attributed" : "",
                          event.activatedAt ? "activated" : "",
                          event.proInterestAt ? "Pro interest" : "",
                          event.teamsInterestAt ? "Teams interest" : ""
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                        href={event.referredUser ? `/admin/members/${event.referredUser.id}` : "/admin/circle-card#referrals"}
                        date={event.activatedAt ?? event.signedUpAt ?? event.clickedAt}
                      />
                    ))
                  ) : (
                    <EmptyState icon={Search} title="No attribution events" description="Matching referral events will appear here." />
                  )}
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border/80 bg-background/20 p-3 text-sm text-muted">
                Enter a referral code to validate the flow end-to-end.
              </p>
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-border/80 bg-background/20">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Referral Test Mode</p>
              <p className="mt-1 text-xs text-muted">Admin-only checklist. This does not create fake referral rows.</p>
            </div>
            <ChevronDown size={17} className="mt-1 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <ol className="grid gap-2 border-t border-border/70 p-4 text-sm text-muted md:grid-cols-2">
            {[
              "Open /r/{code}",
              "Confirm redirect to Circle Card landing",
              "Open /card/{slug}?ref={code}",
              "Spin profile image",
              "Register new account",
              "Complete onboarding",
              "Register Pro interest",
              "Register Teams interest",
              "Confirm admin attribution data updates"
            ].map((item, index) => (
              <li key={item} className="rounded-xl border border-border/80 bg-background/25 p-3">
                <span className="mr-2 text-gold">{index + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </details>

        <details className="group rounded-2xl border border-border/80 bg-background/20">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Filter / Export Readiness</p>
              <p className="mt-1 text-xs text-muted">CSV export can attach to these prepared views later.</p>
            </div>
            <ChevronDown size={17} className="mt-1 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-border/70 p-4 md:grid-cols-2 xl:grid-cols-3">
            {referralEngine.exportViews.map((view) => (
              <div key={view.id} className="rounded-xl border border-border/80 bg-background/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{view.label}</p>
                  <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                    {numberLabel(view.count)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{view.description}</p>
              </div>
            ))}
          </div>
        </details>

        <details open className="group rounded-2xl border border-border/80 bg-background/20">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Top Referrers</p>
              <p className="mt-1 text-xs text-muted">Compact leaderboard for the selected sort.</p>
            </div>
            <ChevronDown size={17} className="mt-1 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-border/70 p-4 xl:grid-cols-2">
            {referralEngine.topReferrers.length ? (
              referralEngine.topReferrers.map((referrer) => (
                <article key={referrer.userId} className="rounded-xl border border-border/80 bg-background/25 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{referrer.name}</p>
                      {referrer.email ? (
                        <p className="mt-1 break-all text-xs text-muted">{referrer.email}</p>
                      ) : null}
                      {referrer.code ? (
                        <p className="mt-1 break-all text-xs text-muted">/r/{referrer.code}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                      {numberLabel(referrer.metricValue)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminLinkButton href={`/admin/members/${referrer.userId}`} label="Member" />
                    {referrer.cardSlug ? (
                      <AdminLinkButton href={`/card/${referrer.cardSlug}`} label="Card" external />
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState icon={Send} title="No referrers yet" description="Referral leaders will appear here." />
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-border/80 bg-background/20">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-sm font-semibold text-foreground">Recent Referrals</p>
              <p className="mt-1 text-xs text-muted">Latest clicks, signups, activations and product interest.</p>
            </div>
            <ChevronDown size={17} className="mt-1 text-silver transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-border/70 p-4">
            {referralEngine.recentReferrals.length ? (
              referralEngine.recentReferrals.map((referral) => (
                <ActivityRow
                  key={referral.id}
                  title={referral.referrer.name}
                  meta={referral.referredUser ? `Referred ${referral.referredUser.email}` : "Pending signup"}
                  detail={[
                    referral.activationStatus,
                    referral.referralSource ? `source: ${referral.referralSource}` : "",
                    referral.sourceCardSlug ? `card: ${referral.sourceCardSlug}` : "",
                    referral.sourceEvent ? `event: ${referral.sourceEvent}` : "",
                    referral.proInterestAt ? "Pro interest" : "",
                    referral.teamsInterestAt ? "Teams interest" : ""
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                  href={`/admin/members/${referral.referrer.id}`}
                  date={referral.activatedAt ?? referral.signedUpAt ?? referral.clickedAt}
                />
              ))
            ) : (
              <EmptyState icon={Send} title="No referral activity" description="Referral activity will appear here." />
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

type PlanCandidate = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["plans"]["likelyProUsers"][number];

type FreeLimitCandidate = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["plans"]["freeLimitUsers"][number];

type ActivationVisibility = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["activation"]["visibility"];

type DiscoverPrivacy = Awaited<
  ReturnType<typeof getAdminCircleCardCommandCentre>
>["discoverPrivacy"];

type ActivationPanelItem = {
  key: string;
  title: string;
  meta: string;
  badge: string;
  href: string;
};

function DiscoverPrivacyPanel({ privacy }: { privacy: DiscoverPrivacy }) {
  const privacyMetrics: MetricItem[] = [
    {
      label: "Discover visible users",
      value: privacy.visibleUsers,
      hint: "Users with at least one published Circle Card opted in to Discover."
    },
    {
      label: "Discover hidden users",
      value: privacy.hiddenUsers,
      hint: "Users with no published Circle Card currently visible in Discover."
    },
    {
      label: "Recently opted in",
      value: privacy.recentlyOptedInCards.length,
      hint: "Newest cards whose owners actively chose Discover visibility."
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Eye size={18} className="text-gold" />
          Discover Privacy
        </CardTitle>
        <CardDescription>
          Discover visibility is opt-in and separate from whether a public card link works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricGrid metrics={privacyMetrics} />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Eye size={16} className="text-gold" />
              Discover visible users
            </p>
            {privacy.recentlyVisibleCards.length ? (
              privacy.recentlyVisibleCards.map((card) => (
                <CardRow
                  key={card.id}
                  name={card.fullName}
                  businessName={card.businessName}
                  slug={card.slug}
                  ownerEmail={card.user.email}
                  ownerId={card.user.id}
                  badge="Visible on Discover"
                  date={card.discoverOptedInAt ?? card.updatedAt}
                />
              ))
            ) : (
              <EmptyState icon={Eye} title="No visible users" description="Opted-in Discover cards will appear here." />
            )}
          </div>

          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <EyeOff size={16} className="text-silver" />
              Discover hidden users
            </p>
            {privacy.recentlyHiddenCards.length ? (
              privacy.recentlyHiddenCards.map((card) => (
                <CardRow
                  key={card.id}
                  name={card.fullName}
                  businessName={card.businessName}
                  slug={card.slug}
                  ownerEmail={card.user.email}
                  ownerId={card.user.id}
                  badge={card.showInDiscover ? "Opted in, unpublished" : "Hidden from Discover"}
                  date={card.updatedAt}
                />
              ))
            ) : (
              <EmptyState icon={EyeOff} title="No hidden users" description="Hidden Discover cards will appear here." />
            )}
          </div>

          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <BadgeCheck size={16} className="text-gold" />
              Recently opted-in users
            </p>
            {privacy.recentlyOptedInCards.length ? (
              privacy.recentlyOptedInCards.map((card) => (
                <CardRow
                  key={card.id}
                  name={card.fullName}
                  businessName={card.businessName}
                  slug={card.slug}
                  ownerEmail={card.user.email}
                  ownerId={card.user.id}
                  badge={card.isPublished ? "Opted in" : "Opted in, unpublished"}
                  date={card.discoverOptedInAt ?? card.updatedAt}
                />
              ))
            ) : (
              <EmptyState icon={BadgeCheck} title="No opt-ins yet" description="Recent Discover opt-ins will appear here." />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivationVisibilityPanel({ visibility }: { visibility: ActivationVisibility }) {
  const sections: Array<{
    title: string;
    description: string;
    items: ActivationPanelItem[];
  }> = [
    {
      title: "Unread activation notifications",
      description: "Users with unread setup guidance.",
      items: visibility.unreadActivationNotifications.map((item) => ({
        key: item.id,
        title: item.fullName || item.ownerName || item.ownerEmail,
        meta: item.title,
        badge: formatDate(item.createdAt),
        href: `/admin/members/${item.userId}`
      }))
    },
    {
      title: "Under 50% completion",
      description: "Cards missing the basics.",
      items: visibility.under50CompletionUsers.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: item.missingItems.slice(0, 3).join(", ") || item.ownerEmail,
        badge: `${item.completionScore}%`,
        href: `/admin/members/${item.userId}`
      }))
    },
    {
      title: "Inactive 7+ days",
      description: "Users with no recent Circle Card action.",
      items: visibility.inactiveUsers.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: item.ownerEmail,
        badge: formatDate(item.lastActiveAt),
        href: `/admin/members/${item.userId}`
      }))
    },
    {
      title: "Views but incomplete",
      description: "Traffic arriving before the profile is strong.",
      items: visibility.viewsButIncompleteProfiles.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: `${item.completionScore}% complete`,
        badge: `${numberLabel(item.viewCount)} views`,
        href: `/card/${item.slug}`
      }))
    },
    {
      title: "Needs weekly nudge",
      description: "Eligible for the service summary foundation.",
      items: visibility.needingWeeklyNudge.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: `Next: ${item.nextBestAction}`,
        badge: `${item.completionScore}%`,
        href: `/admin/members/${item.userId}`
      }))
    },
    {
      title: "Strong Pro readiness",
      description: "Existing trigger system reports high intent.",
      items: visibility.strongProReadiness.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: item.reasons.slice(0, 2).join(", ") || item.ownerEmail,
        badge: `${item.readinessScore}/100`,
        href: `/admin/members/${item.userId}`
      }))
    },
    {
      title: "Strong Teams readiness",
      description: "Company or shared-relationship signals.",
      items: visibility.strongTeamsReadiness.map((item) => ({
        key: item.cardId,
        title: displayCard({ fullName: item.fullName, businessName: item.businessName }),
        meta: item.reasons.slice(0, 2).join(", ") || item.ownerEmail,
        badge: `${item.readinessScore}/100`,
        href: `/admin/members/${item.userId}`
      }))
    }
  ];
  const totalItems = sections.reduce((total, section) => total + section.items.length, 0);

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <CardTitle className="inline-flex items-center gap-2">
              <BadgeCheck size={18} className="text-gold" />
              Activation signals
            </CardTitle>
            <CardDescription className="mt-2">
              Compact view of guidance, completion, inactivity, weekly nudges and readiness.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="normal-case tracking-normal">
              {totalItems}
            </Badge>
            <ChevronDown size={17} className="text-silver transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <CardContent className="grid gap-3 pt-0 xl:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border/80 bg-background/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{section.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                  {section.items.length}
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {section.items.slice(0, 3).map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="block rounded-xl border border-silver/12 bg-card/42 p-3 transition-colors hover:border-gold/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{item.meta}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                        {item.badge}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {!section.items.length ? (
                  <p className="rounded-xl border border-dashed border-silver/14 bg-card/30 p-3 text-xs text-muted">
                    No users in this bucket right now.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </details>
    </Card>
  );
}

function FreeLimitCandidatePanel({ items }: { items: FreeLimitCandidate[] }) {
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <CardTitle className="inline-flex items-center gap-2">
              <Link2 size={18} className="text-gold" />
              Users closest to Free limits
            </CardTitle>
            <CardDescription className="mt-2">
              Featured link usage, wallet growth, profile completion, share activity and views.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="normal-case tracking-normal">
              {items.length}
            </Badge>
            <ChevronDown size={17} className="text-silver transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <CardContent className="grid gap-2 pt-0 lg:grid-cols-2">
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
                  </div>
                  <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                    {item.score}/100
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <span className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Links {item.activeFeaturedLinks}/{item.featuredLinkLimit}
                  </span>
                  <span className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Wallet {numberLabel(item.walletContacts)}
                  </span>
                  <span className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Complete {item.profileCompletion}%
                  </span>
                  <span className="rounded-lg border border-silver/12 bg-card/42 p-2 text-muted">
                    Shares {numberLabel(item.shares)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.reasons.slice(0, 4).map((reason) => (
                    <Badge key={reason} variant="outline" className="normal-case tracking-normal text-muted">
                      {reason}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminLinkButton href={`/card/${item.slug}`} label="Public card" external />
                  <AdminLinkButton href={`/admin/members/${item.userId}`} label="Owner" />
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={Link2}
              title="No Free-limit signals yet"
              description="Users nearing featured link, wallet, completion, share or view thresholds will appear here."
            />
          )}
        </CardContent>
      </details>
    </Card>
  );
}

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
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <CardTitle className="inline-flex items-center gap-2">
              <Crown size={18} className="text-gold" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="normal-case tracking-normal">
              {items.length}
            </Badge>
            <ChevronDown size={17} className="text-silver transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <CardContent className="space-y-2 pt-0">
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
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Badge variant="outline" className="normal-case tracking-normal">
                      Readiness {item.readinessScore}/100 / {item.readinessLabel}
                    </Badge>
                    <Badge variant="outline" className="normal-case tracking-normal text-muted">
                      {item.score} signal{item.score === 1 ? "" : "s"}
                    </Badge>
                  </div>
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
      </details>
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
