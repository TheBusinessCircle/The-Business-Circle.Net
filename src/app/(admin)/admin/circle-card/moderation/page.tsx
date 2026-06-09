import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileWarning,
  MessageSquareWarning,
  ShieldAlert
} from "lucide-react";
import { updateCircleCardReportModerationAction } from "@/actions/admin/circle-card-moderation.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_REPORT_STATUSES,
  circleCardReportReasonLabel,
  circleCardReportStatusLabel,
  type CircleCardReportStatusValue
} from "@/lib/circle-card/reports";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { listCircleCardReportsForAdmin } from "@/server/circle-card/moderation.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const NOTICE_MESSAGES: Record<string, string> = {
  "report-reviewing": "Report marked as reviewing.",
  "report-resolved": "Report resolved.",
  "report-dismissed": "Report dismissed.",
  "report-notes-saved": "Admin notes saved."
};

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-report-action": "Check the report action and try again.",
  "report-not-found": "That report could not be found."
};

export const metadata: Metadata = createPageMetadata({
  title: "Circle Card Moderation",
  description: "Admin moderation queue for Circle Card reports.",
  path: "/admin/circle-card/moderation"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseStatus(value: string): CircleCardReportStatusValue | "ALL" | undefined {
  if (value === "ALL") {
    return "ALL";
  }

  return CIRCLE_CARD_REPORT_STATUSES.includes(value as CircleCardReportStatusValue)
    ? (value as CircleCardReportStatusValue)
    : undefined;
}

function displayUser(user: { name: string | null; email: string | null } | null) {
  if (!user) {
    return "Anonymous";
  }

  return user.name || user.email || "Unknown user";
}

export default async function AdminCircleCardModerationPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const status = parseStatus(firstValue(params.status));
  const notice = firstValue(params.notice);
  const error = firstValue(params.error);
  const reports = await listCircleCardReportsForAdmin({ status });
  const returnPath = status
    ? `/admin/circle-card/moderation?status=${encodeURIComponent(status)}`
    : "/admin/circle-card/moderation";

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <ShieldAlert size={12} className="mr-1" />
                Human Review
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">
                Circle Card Moderation
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Review reported Circle Cards calmly. Reports do not automatically ban accounts or
                remove content.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                {reports.openCount} open or reviewing
              </Badge>
              <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
                {reports.total} in filter
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {notice && NOTICE_MESSAGES[notice] ? (
        <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          {NOTICE_MESSAGES[notice]}
        </p>
      ) : null}

      {error && ERROR_MESSAGES[error] ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Clock size={17} />
            Queue Filter
          </CardTitle>
          <CardDescription>
            Defaults to open and reviewing reports. Resolved and dismissed reports remain available
            through the filter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full space-y-2 sm:max-w-xs">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status ?? ""}>
                <option value="">Open and reviewing</option>
                <option value="ALL">All statuses</option>
                {CIRCLE_CARD_REPORT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {circleCardReportStatusLabel(item)}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
            <Link href="/admin/circle-card/moderation">
              <Button type="button" variant="ghost" size="sm">
                Reset
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <MessageSquareWarning size={17} />
            Open Reports
          </CardTitle>
          <CardDescription>
            Showing up to {reports.limit} reports for the current filter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.items.length ? (
            reports.items.map((report) => (
              <article key={report.id} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        {circleCardReportStatusLabel(report.status)}
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {circleCardReportReasonLabel(report.reason)}
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {formatDate(report.createdAt)}
                      </Badge>
                    </div>

                    <div>
                      <h2 className="font-display text-xl text-foreground">
                        {report.card
                          ? [report.card.fullName, report.card.businessName].filter(Boolean).join(" / ")
                          : "Deleted Circle Card"}
                      </h2>
                      {report.detailsPreview ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {report.detailsPreview}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-muted">No extra details supplied.</p>
                      )}
                    </div>

                    <dl className="grid gap-3 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-foreground">Card</dt>
                        <dd>
                          {report.card ? (
                            <Link
                              href={`/card/${report.card.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              /card/{report.card.slug}
                              <ExternalLink size={12} />
                            </Link>
                          ) : (
                            "Not available"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Reported user</dt>
                        <dd>{displayUser(report.reportedUser)}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Reporter</dt>
                        <dd>{displayUser(report.reporterUser)}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Reviewed</dt>
                        <dd>
                          {report.reviewedAt
                            ? `${formatDate(report.reviewedAt)} by ${displayUser(report.reviewedBy)}`
                            : "Not yet"}
                        </dd>
                      </div>
                    </dl>

                    {report.card?.customLinks.length ? (
                      <div className="rounded-2xl border border-silver/14 bg-white/[0.035] p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-silver">
                          <FileWarning size={13} />
                          File metadata on this card
                        </p>
                        <div className="mt-3 grid gap-2">
                          {report.card.customLinks.map((link) => (
                            <div key={link.id} className="rounded-xl border border-border/70 bg-background/25 px-3 py-2 text-xs text-muted">
                              <p className="font-medium text-foreground">{link.label}</p>
                              <p className="mt-1 break-all">
                                {link.fileName || "Unnamed file"} {link.fileMimeType ? `(${link.fileMimeType})` : ""}
                              </p>
                              {link.fileUrl ? <p className="mt-1 break-all">{link.fileUrl}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <form action={updateCircleCardReportModerationAction} className="space-y-3 rounded-2xl border border-border/80 bg-card/62 p-4">
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <div className="space-y-2">
                      <Label htmlFor={`admin-notes-${report.id}`}>Admin notes</Label>
                      <Textarea
                        id={`admin-notes-${report.id}`}
                        name="adminNotes"
                        defaultValue={report.adminNotes ?? ""}
                        maxLength={2400}
                        className="min-h-[128px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Button type="submit" name="intent" value="notes" variant="outline" size="sm">
                        Save notes
                      </Button>
                      <Button type="submit" name="intent" value="review" variant="outline" size="sm">
                        Mark reviewing
                      </Button>
                      <Button type="submit" name="intent" value="resolve" size="sm">
                        <CheckCircle2 size={14} className="mr-1" />
                        Resolve
                      </Button>
                      <Button type="submit" name="intent" value="dismiss" variant="ghost" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={MessageSquareWarning}
              title="No reports in this queue"
              description="Circle Card reports that match the selected filter will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
