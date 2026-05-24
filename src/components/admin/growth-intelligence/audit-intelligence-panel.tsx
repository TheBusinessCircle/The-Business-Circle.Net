import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Distribution = Array<{ label: string; count: number }>;

export function AuditIntelligencePanel({
  summary,
  distributions,
  hasAuditData
}: {
  summary: {
    started: number;
    completed: number;
    completionRate: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
  distributions: {
    scoreDistribution: Array<{ bucket: string; count: number }>;
    resultTypes: Distribution;
    recommendedTiers: Distribution;
    weakAreas: Distribution;
    strongAreas: Distribution;
    auditsByDay: Distribution;
    auditsByTrafficSource: Distribution;
  };
  hasAuditData: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Founder Audit Intelligence</CardTitle>
        <CardDescription>Completion, score, fit, and common constraint signals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasAuditData ? (
          <p className="rounded-2xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
            No Founder Audit completions yet. Results will appear here once visitors complete the audit.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <AuditMetric label="Audits started" value={summary.started} />
          <AuditMetric label="Audits completed" value={summary.completed} />
          <AuditMetric label="Completion rate" value={`${summary.completionRate}%`} />
          <AuditMetric label="Average score" value={summary.averageScore} />
          <AuditMetric label="Highest score" value={summary.highestScore} />
          <AuditMetric label="Lowest score" value={summary.lowestScore} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <MiniDistribution title="Score distribution" rows={distributions.scoreDistribution.map((row) => ({ label: row.bucket, count: row.count }))} />
          <MiniDistribution title="Result types" rows={distributions.resultTypes} />
          <MiniDistribution title="Recommended tiers" rows={distributions.recommendedTiers} />
          <MiniDistribution title="Weak areas" rows={distributions.weakAreas} />
          <MiniDistribution title="Strong areas" rows={distributions.strongAreas} />
          <MiniDistribution title="Audits by source" rows={distributions.auditsByTrafficSource} />
        </div>
      </CardContent>
    </Card>
  );
}

function AuditMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/22 p-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{typeof value === "number" ? value.toLocaleString("en-GB") : value}</p>
    </div>
  );
}

function MiniDistribution({ title, rows }: { title: string; rows: Distribution }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 6).map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{row.label}</span>
              <span className="text-muted">{row.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
              <div className="h-full rounded-full bg-gold/70" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        )) : <p className="text-sm text-muted">No data yet.</p>}
      </div>
    </div>
  );
}
