import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function RecentActivityFeed({
  activity
}: {
  activity: Array<{
    id: string;
    time: Date;
    event: string;
    page: string;
    source: string;
    device: string;
    auditResult: string | null;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity Feed</CardTitle>
        <CardDescription>Anonymous operational activity. No names, emails, IP addresses, or payment details are shown.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {activity.length ? (
          activity.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-2xl border border-border/70 bg-background/22 p-4 text-sm lg:grid-cols-[10rem_12rem_1fr_8rem_8rem] lg:items-center">
              <p className="text-muted">{formatDate(item.time)}</p>
              <p className="font-medium text-foreground">{item.event}</p>
              <p className="truncate text-muted">{item.page}</p>
              <p className="text-muted">{item.source}</p>
              <p className="text-muted">{item.auditResult || item.device}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
            No visitor data has been collected yet. Growth Intelligence will begin populating as people visit the public site.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
