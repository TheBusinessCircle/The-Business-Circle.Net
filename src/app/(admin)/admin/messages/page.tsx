import type { Metadata } from "next";
import { Flag, ShieldCheck } from "lucide-react";
import { resolveDirectMessageReportAction } from "@/actions/messages/messages.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { getDirectMessageAdminStats, listAdminDirectMessageReports } from "@/server/messages";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Messages",
  description: "Moderate reported private chats, members, and attachments.",
  path: "/admin/messages"
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AdminMessagesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const status = firstValue(params.status).toUpperCase() as "" | "PENDING" | "RESOLVED" | "DISMISSED";

  const [stats, reports] = await Promise.all([
    getDirectMessageAdminStats(),
    listAdminDirectMessageReports({ query, status })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <ShieldCheck size={12} className="mr-1" />
            Private messaging moderation
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Messages</CardTitle>
          <CardDescription className="mt-2 text-base">
            Review reports, reported messages, and the private chat surfaces that need moderation visibility.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Requests sent</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.requestCount}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Threads created</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.threadCount}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Active chats</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.activeThreadCount}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Pending reports</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.pendingReportCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report queue</CardTitle>
          <CardDescription>
            Search by member, detail, or report status to review private messaging issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input name="q" defaultValue={query} placeholder="Search member or report detail" />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">Apply</Button>
            </div>
          </form>

          <div className="space-y-3">
            {reports.length ? (
              reports.map((report) => (
                <article key={report.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-muted">
                          {report.reason.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-muted">
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        Reporter: {report.reporter.name ?? report.reporter.email}
                      </p>
                      <p className="text-sm text-muted">
                        Reported member: {report.reportedUser?.name ?? report.reportedUser?.email ?? "Not captured"}
                      </p>
                      {report.messagePreview ? (
                        <p className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3 text-sm leading-7 text-foreground/90">
                          {report.messagePreview}
                        </p>
                      ) : null}
                      {report.detail ? <p className="text-sm text-muted">{report.detail}</p> : null}
                      {report.attachmentCount ? (
                        <p className="text-xs text-muted">{report.attachmentCount} attachment(s) on the reported message</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={resolveDirectMessageReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="action" value="resolve" />
                        <input type="hidden" name="returnPath" value="/admin/messages" />
                        <Button type="submit">Resolve</Button>
                      </form>
                      <form action={resolveDirectMessageReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="action" value="dismiss" />
                        <input type="hidden" name="returnPath" value="/admin/messages" />
                        <Button type="submit" variant="outline">
                          <Flag size={14} className="mr-2" />
                          Dismiss
                        </Button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={Flag}
                title="No reports match this view"
                description="Private message reports will appear here when members flag a thread or an individual message."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
