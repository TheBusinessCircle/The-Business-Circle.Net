import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Summary = {
  visitorsToday: number;
  visitorsThisWeek: number;
  uniqueVisitorsThisMonth: number;
  pageViewsThisMonth: number;
  auditsCompleted: number;
  averageAuditScore: number;
  joinIntentEvents: number;
  membershipPageVisits: number;
};

const metrics: Array<{ key: keyof Summary; label: string; hint: string }> = [
  { key: "visitorsToday", label: "Visitors today", hint: "Unique visitors since midnight" },
  { key: "visitorsThisWeek", label: "Visitors this week", hint: "Unique visitors in the last 7 days" },
  { key: "uniqueVisitorsThisMonth", label: "Unique visitors this month", hint: "Distinct anonymous visitors" },
  { key: "pageViewsThisMonth", label: "Page views this month", hint: "Public site page views" },
  { key: "auditsCompleted", label: "Audits completed", hint: "Founder Audit completions" },
  { key: "averageAuditScore", label: "Average audit score", hint: "Mean score from completions" },
  { key: "joinIntentEvents", label: "Join intent events", hint: "Audit, tier, and join click intent" },
  { key: "membershipPageVisits", label: "Membership page visits", hint: "Membership route page views" }
];

export function GrowthIntelligenceSummaryCards({ summary }: { summary: Summary }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.key} className="interactive-card border-gold/18 bg-card/72">
          <CardHeader className="space-y-1 pb-2">
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="text-3xl">{summary[metric.key].toLocaleString("en-GB")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted">{metric.hint}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
