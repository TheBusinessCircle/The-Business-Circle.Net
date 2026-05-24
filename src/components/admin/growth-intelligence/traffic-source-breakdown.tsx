import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TrafficSourceBreakdown({
  sources
}: {
  sources: Array<{ source: string; visits: number }>;
}) {
  const total = sources.reduce((sum, source) => sum + source.visits, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Referrer and campaign parsing across public visits.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sources.map((source) => (
          <div key={source.source} className="rounded-2xl border border-border/70 bg-background/22 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground">{source.source}</p>
              <p className="text-sm text-muted">{total ? Math.round((source.visits / total) * 100) : 0}%</p>
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{source.visits.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-xs text-muted">Visits</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
