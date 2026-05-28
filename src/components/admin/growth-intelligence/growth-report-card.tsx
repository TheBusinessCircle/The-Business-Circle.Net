import type { ComponentProps, ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { GrowthReportView, GrowthRecommendedAction } from "@/server/admin/growth-report.service";

type GrowthReportCardProps = {
  report: GrowthReportView;
  refreshAction: NonNullable<ComponentProps<"form">["action"]>;
};

function Panel({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/24 p-4">
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TextList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-silver">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function urgencyVariant(urgency: GrowthRecommendedAction["urgency"]) {
  if (urgency === "high") {
    return "danger" as const;
  }
  if (urgency === "medium") {
    return "warning" as const;
  }
  return "muted" as const;
}

function RecommendedActions({ actions }: { actions: GrowthRecommendedAction[] }) {
  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <div key={action.title} className="rounded-xl border border-border/70 bg-card/42 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-gold">
                Priority {index + 1}
              </p>
              <h4 className="mt-1 font-semibold text-foreground">{action.title}</h4>
            </div>
            <Badge variant={urgencyVariant(action.urgency)}>{action.urgency}</Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{action.reason}</p>
          <p className="mt-3 text-sm leading-relaxed text-silver">{action.suggestedNextStep}</p>
          <p className="mt-3 text-xs text-muted">{action.relatedMetric}</p>
        </div>
      ))}
    </div>
  );
}

export function GrowthReportCard({ report, refreshAction }: GrowthReportCardProps) {
  const healthScore = report.healthScore === null ? "Not ready" : `${report.healthScore}/100`;

  return (
    <Card className="overflow-hidden border-gold/35 bg-gradient-to-br from-gold/14 via-card/82 to-background/68 shadow-gold-soft">
      <CardHeader className="space-y-5 border-b border-gold/18">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="premium" className="gap-1">
              <Sparkles size={12} />
              12-Hour Growth Report
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">12-Hour Growth Report</CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-base">
              A practical read on what is happening now and what to do next.
            </CardDescription>
          </div>
          <form action={refreshAction}>
            <Button type="submit" variant="outline" className="gap-2">
              <RefreshCw size={15} />
              Refresh report now
            </Button>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gold/20 bg-background/24 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Momentum</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {report.momentumLabel ?? "Early signal"}
            </p>
          </div>
          <div className="rounded-2xl border border-gold/20 bg-background/24 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Health score</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{healthScore}</p>
          </div>
          <div className="rounded-2xl border border-gold/20 bg-background/24 p-4">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
              <CalendarClock size={13} />
              Last generated
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatDate(report.generatedAt)}</p>
          </div>
          <div className="rounded-2xl border border-gold/20 bg-background/24 p-4">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
              <CalendarClock size={13} />
              Next refresh
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatDate(report.nextRefreshAt)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6 sm:pt-7">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{report.headline}</h2>
          <p className="mt-3 max-w-5xl text-sm leading-relaxed text-silver">{report.summary}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Key Findings" icon={<TrendingUp size={16} className="text-gold" />}>
            <TextList items={report.keyFindings} />
          </Panel>
          <Panel title="Opportunities" icon={<Lightbulb size={16} className="text-gold" />}>
            <TextList items={report.opportunities} />
          </Panel>
          <Panel title="Risks" icon={<AlertTriangle size={16} className="text-amber-300" />}>
            <TextList items={report.risks} />
          </Panel>
        </div>

        <Panel title="Recommended Actions" icon={<Target size={16} className="text-gold" />}>
          <RecommendedActions actions={report.recommendedActions} />
        </Panel>

        {report.priorityAction ? (
          <div className="rounded-2xl border border-gold/28 bg-gold/12 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gold">
              One Priority Move
            </p>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-foreground">
              {report.priorityAction}
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-silver/18 bg-background/24 p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-silver">
            Public narrative suggestion
          </p>
          <p className="mt-3 text-base font-semibold leading-relaxed text-foreground">
            {report.publicNarrativeSuggestion}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Deterministic guidance from first-party signals only. No external AI is used.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
