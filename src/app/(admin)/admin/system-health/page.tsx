import type { Metadata } from "next";
import { Activity, Database, Gauge, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getAdminSystemHealthSnapshot } from "@/server/admin";

export const metadata: Metadata = createPageMetadata({
  title: "Admin System Health",
  description: "System health, publishing rhythm, and operational readiness across the Business Circle platform.",
  path: "/admin/system-health",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function AdminSystemHealthPage() {
  await requireAdmin();
  const health = await getAdminSystemHealthSnapshot();

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Gauge size={12} className="mr-1" />
                System Health
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Operational status and publishing readiness</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                A calm view of the platform’s current health, database posture, billing readiness, and content automation rhythm.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                health.warnings.length
                  ? "border-gold/35 bg-gold/12 text-gold"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }
            >
              {health.warnings.length ? `${health.warnings.length} warnings` : "Operating normally"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          icon={Activity}
          label="App status"
          value={health.appStatus === "healthy" ? "Healthy" : "Attention"}
          description="High-level application readiness."
          tone={health.appStatus === "healthy" ? "healthy" : "attention"}
        />
        <HealthCard
          icon={Database}
          label="Database"
          value={health.databaseStatus === "healthy" ? "Connected" : "Degraded"}
          description="Connectivity check against the primary database."
          tone={health.databaseStatus === "healthy" ? "healthy" : "attention"}
        />
        <HealthCard
          icon={Sparkles}
          label="Billing"
          value={health.billingEnabled ? "Enabled" : "Disabled"}
          description="Stripe billing availability in this environment."
          tone={health.billingEnabled ? "healthy" : "default"}
        />
        <HealthCard
          icon={Gauge}
          label="Rate limiting"
          value={health.rateLimitLabel}
          description={health.rateLimitDescription}
          tone={health.rateLimitBackend === "upstash" ? "healthy" : "attention"}
        />
      </section>

      {health.warnings.length ? (
        <Card className="border-gold/30 bg-gold/10">
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
            <CardDescription>Operational issues currently worth checking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-gold/24 bg-background/20 px-4 py-3 text-sm text-foreground">
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Publishing pipeline</CardTitle>
            <CardDescription>Visibility into scheduled resources and whether the rhythm is staying clean.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoPanel
              label="Scheduled resources due"
              value={health.scheduledResourcesDue.toLocaleString("en-GB")}
              description="Resources whose scheduled publish time has already passed."
            />
            <InfoPanel
              label="Next scheduled resource"
              value={health.nextScheduledResourceAt ? formatDate(health.nextScheduledResourceAt) : "None scheduled"}
              description="The next upcoming scheduled publication."
            />
            <InfoPanel
              label="Last published resource"
              value={health.lastPublishedResourceAt ? formatDate(health.lastPublishedResourceAt) : "Not yet published"}
              description="Most recent successful resource publication."
            />
            <InfoPanel
              label="Last quiet prompt"
              value={health.lastCommunityPromptAt ? formatDate(health.lastCommunityPromptAt) : "Not yet published"}
              description="Latest automated quiet-time community prompt."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating notes</CardTitle>
            <CardDescription>Simple checks that help keep the platform stable as more systems are layered in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <NoteCard title="Near-live monitoring" description="The admin sidebar now polls for live platform activity, system status, and security signals at a gentle interval." />
            <NoteCard title="Safe defaults" description="Shared Redis is the production path for request throttling. If the platform falls back locally, that state is surfaced here clearly instead of being hidden." />
            <NoteCard title="Publishing stability" description="Scheduled content checks are visible here so overdue resources can be addressed before the experience feels stale." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default"
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  description: string;
  tone?: "default" | "healthy" | "attention";
}) {
  const toneClassName =
    tone === "healthy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "attention"
        ? "border-gold/35 bg-gold/12 text-gold"
        : "border-silver/16 bg-background/20 text-foreground";

  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription className="inline-flex items-center gap-2">
          <Icon size={14} />
          {label}
        </CardDescription>
        <div className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-sm ${toneClassName}`}>
          {value}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

function InfoPanel({
  label,
  value,
  description
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function NoteCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-silver/16 bg-background/20 px-4 py-4">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}
