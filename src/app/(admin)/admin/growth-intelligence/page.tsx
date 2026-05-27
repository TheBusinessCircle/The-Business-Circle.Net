import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import {
  AuditIntelligencePanel,
  ConversionSignalsPanel,
  DeviceBreakdown,
  GrowthReportCard,
  GrowthInsightsPanel,
  GrowthIntelligenceSummaryCards,
  RecentActivityFeed,
  TopPagesTable,
  TrafficSourceBreakdown,
  TrafficTimeline
} from "@/components/admin/growth-intelligence";
import { refreshGrowthReportNowAction } from "@/actions/admin/growth-report.actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import {
  getGrowthIntelligenceDashboard,
  type GrowthIntelligenceRange
} from "@/server/admin/growth-intelligence.service";
import { getCurrentGrowthReport } from "@/server/admin/growth-report.service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Growth Intelligence",
  description: "Private website traffic, Founder Audit, and conversion signal dashboard.",
  path: "/admin/growth-intelligence",
  noIndex: true
});

export const dynamic = "force-dynamic";

const rangeOptions: Array<{ label: string; value: GrowthIntelligenceRange }> = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" }
];

function readRange(value: string | string[] | undefined): GrowthIntelligenceRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return rangeOptions.some((option) => option.value === candidate)
    ? (candidate as GrowthIntelligenceRange)
    : "30d";
}

export default async function AdminGrowthIntelligencePage({
  searchParams
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range = readRange(params.range);
  const [growthReport, dashboard] = await Promise.all([
    getCurrentGrowthReport(),
    getGrowthIntelligenceDashboard(range)
  ]);

  return (
    <div className="space-y-6">
      <GrowthReportCard report={growthReport} refreshAction={refreshGrowthReportNowAction} />

      <Card className="overflow-hidden border-gold/40 bg-gradient-to-br from-gold/16 via-card/84 to-card/70 shadow-gold-soft">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Activity size={12} className="mr-1" />
                Private Admin Dashboard
              </Badge>
              <CardTitle className="mt-3 font-display text-4xl">Growth Intelligence</CardTitle>
              <CardDescription className="mt-2 max-w-4xl text-base">
                Track visitor activity, audit demand, conversion signals, and the movement building around The Business Circle Network.
              </CardDescription>
            </div>
            <div className="rounded-2xl border border-gold/22 bg-background/24 p-4 text-sm text-muted">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck size={15} className="text-gold" />
                Privacy-safe by design
              </p>
              <p className="mt-2 max-w-sm">
                Anonymous IDs only. No raw IP addresses, payment details, passwords, or private messages are collected here.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <Link
            key={option.value}
            href={`/admin/growth-intelligence?range=${option.value}`}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm transition-colors",
              range === option.value
                ? "border-gold/45 bg-gold/14 text-gold"
                : "border-border/70 bg-background/20 text-muted hover:border-gold/30 hover:text-foreground"
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {!dashboard.hasVisitorData ? (
        <p className="rounded-2xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
          No visitor data has been collected yet. Growth Intelligence will begin populating as people visit the public site.
        </p>
      ) : null}

      <GrowthIntelligenceSummaryCards summary={dashboard.summary} />
      <TrafficTimeline rows={dashboard.trafficTimeline} timing={dashboard.visitorTiming} />
      <TopPagesTable pages={dashboard.topPages} />

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <TrafficSourceBreakdown sources={dashboard.trafficSources} />
        <DeviceBreakdown devices={dashboard.deviceBreakdown} />
      </section>

      <AuditIntelligencePanel
        summary={dashboard.auditSummary}
        distributions={dashboard.auditDistributions}
        hasAuditData={dashboard.hasAuditData}
      />
      <ConversionSignalsPanel signals={dashboard.conversionSignals} />
      <GrowthInsightsPanel insights={dashboard.insights} />
      <RecentActivityFeed activity={dashboard.recentActivity} />
    </div>
  );
}
