import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TrafficTimeline({
  rows,
  timing
}: {
  rows: Array<{ label: string; visits: number; pageViews: number }>;
  timing: {
    busiestHours: Array<{ hour: number; views: number }>;
    busiestDays: Array<{ day: string; views: number }>;
  };
}) {
  const max = Math.max(...rows.map((row) => Math.max(row.visits, row.pageViews)), 1);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>Traffic Timeline</CardTitle>
          <CardDescription>Visits and page views grouped by the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length ? (
            rows.slice(-18).map((row) => (
              <div key={row.label} className="grid gap-2 sm:grid-cols-[8rem_1fr_5rem] sm:items-center">
                <p className="text-xs text-muted">{row.label}</p>
                <div className="space-y-1">
                  <Bar value={row.pageViews} max={max} className="bg-gold/70" />
                  <Bar value={row.visits} max={max} className="bg-silver/50" />
                </div>
                <p className="text-xs text-muted">{row.pageViews} views</p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
              No visitor data has been collected yet. Growth Intelligence will begin populating as people visit the public site.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visitor Timing</CardTitle>
          <CardDescription>Busiest hours and days based on page views.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <TimingList title="Busiest hours" items={timing.busiestHours.map((item) => ({ label: `${item.hour}:00`, value: item.views }))} />
          <TimingList title="Busiest days" items={timing.busiestDays.map((item) => ({ label: item.day, value: item.views }))} />
        </CardContent>
      </Card>
    </section>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-background/60">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
    </div>
  );
}

function TimingList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/20 px-3 py-2 text-sm">
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted">{item.value.toLocaleString("en-GB")}</span>
          </div>
        )) : <p className="text-sm text-muted">No timing pattern yet.</p>}
      </div>
    </div>
  );
}
