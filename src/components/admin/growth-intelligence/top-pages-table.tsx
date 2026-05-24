import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function TopPagesTable({
  pages
}: {
  pages: Array<{
    page: string;
    views: number;
    uniqueVisitors: number;
    averageEvents: number;
    lastViewed: Date;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Pages</CardTitle>
        <CardDescription>Where anonymous visitors are spending attention.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {pages.length ? (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.08em] text-silver">
              <tr className="border-b border-border/70">
                <th className="py-2 pr-3 font-medium">Page</th>
                <th className="py-2 pr-3 font-medium">Views</th>
                <th className="py-2 pr-3 font-medium">Unique visitors</th>
                <th className="py-2 pr-3 font-medium">Average events</th>
                <th className="py-2 pr-3 font-medium">Last viewed</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.page} className="border-b border-border/50 text-muted">
                  <td className="max-w-[22rem] truncate py-3 pr-3 text-foreground">{page.page}</td>
                  <td className="py-3 pr-3">{page.views.toLocaleString("en-GB")}</td>
                  <td className="py-3 pr-3">{page.uniqueVisitors.toLocaleString("en-GB")}</td>
                  <td className="py-3 pr-3">{page.averageEvents.toLocaleString("en-GB")}</td>
                  <td className="py-3 pr-3">{formatDate(page.lastViewed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rounded-2xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
            No visitor data has been collected yet. Growth Intelligence will begin populating as people visit the public site.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
