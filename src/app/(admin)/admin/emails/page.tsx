import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Inbox, MailOpen, MailWarning, Paperclip, Search, Send } from "lucide-react";
import { InboundEmailStatus } from "@prisma/client";
import { updateInboundEmailStatusAction } from "@/actions/admin/inbound-email.actions";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  extractSenderEmail,
  formatEmailRecipients,
  getInboundEmailAdminStats,
  inboundEmailSourceLabel,
  listInboundEmailsForAdmin,
  parseInboundEmailStatus
} from "@/server/inbound-email";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Emails",
  description: "Review inbound emails received by The Business Circle Network.",
  path: "/admin/emails"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusBadgeVariant(status: InboundEmailStatus) {
  if (status === InboundEmailStatus.UNREAD) {
    return "premium" as const;
  }

  if (status === InboundEmailStatus.ARCHIVED) {
    return "muted" as const;
  }

  return "outline" as const;
}

function getAttachmentCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function buildReturnPath(input: { query: string; status: InboundEmailStatus | "ALL" }) {
  const search = new URLSearchParams();
  if (input.query) {
    search.set("q", input.query);
  }
  if (input.status !== "ALL") {
    search.set("status", input.status);
  }
  const suffix = search.toString();
  return suffix ? `/admin/emails?${suffix}` : "/admin/emails";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "status-updated": "Email status updated.",
    "reply-sent": "Reply sent successfully."
  };
  const errorMap: Record<string, string> = {
    invalid: "That email action could not be processed.",
    "not-found": "That email could not be found.",
    "reply-invalid": "Add a subject and reply message before sending.",
    "reply-failed": "The reply could not be sent. Check the email detail for the latest error."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminEmailsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const status = parseInboundEmailStatus(firstValue(params.status).toUpperCase());
  const returnPath = buildReturnPath({ query, status });
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  const [stats, emails] = await Promise.all([
    getInboundEmailAdminStats(),
    listInboundEmailsForAdmin({ query, status })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <Inbox size={12} className="mr-1" />
            Contact inbox
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Emails</CardTitle>
          <CardDescription className="mt-2 text-base">
            Inbound messages sent to the public BCN contact address. This inbox is admin-only and separate from member messaging.
          </CardDescription>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Total received</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Unread</p><p className="mt-2 text-2xl font-semibold text-gold">{stats.unread}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted">Archived</p><p className="mt-2 text-2xl font-semibold text-foreground">{stats.archived}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox queue</CardTitle>
          <CardDescription>
            Search sender, subject, body, or preview text. Attachments are shown as metadata only for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={query} placeholder="Search sender, subject, or email body" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="ALL">All</option>
                <option value={InboundEmailStatus.UNREAD}>Unread</option>
                <option value={InboundEmailStatus.READ}>Read</option>
                <option value={InboundEmailStatus.ARCHIVED}>Archived</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                <Search size={14} className="mr-2" />
                Apply
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {emails.length ? (
              emails.map((email) => {
                const senderEmail = extractSenderEmail(email.from);
                const recipients = formatEmailRecipients(email.to);
                const attachmentCount = getAttachmentCount(email.attachments);

                return (
                  <article key={email.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusBadgeVariant(email.status)}>{email.status}</Badge>
                          <Badge variant="outline" className="text-muted">{inboundEmailSourceLabel(email)}</Badge>
                          {attachmentCount ? (
                            <Badge variant="outline" className="text-muted">
                              <Paperclip size={12} className="mr-1" />
                              {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                          {email.forwardedAt ? (
                            <Badge variant="success">Forwarded</Badge>
                          ) : email.forwardError ? (
                            <Badge variant="warning">Forward issue</Badge>
                          ) : null}
                          {email.lastRepliedAt ? <Badge variant="success">Replied</Badge> : null}
                        </div>
                        <Link href={`/admin/emails/${email.id}`} className="block">
                          <h2 className="truncate font-display text-xl text-foreground hover:text-gold">
                            {email.subject || "No subject"}
                          </h2>
                        </Link>
                        <p className="break-words text-sm text-foreground">{email.from}</p>
                        <p className="text-xs text-muted">
                          To: {recipients.length ? recipients.join(", ") : "Not captured"} · {formatDateTime(email.receivedAt)}
                        </p>
                        <p className="line-clamp-2 text-sm leading-6 text-muted">{email.snippet}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <CopyLinkButton value={senderEmail} label="Copy sender" />
                        <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={`/admin/emails/${email.id}#reply`}>
                          <Send size={14} className="mr-1" />
                          Reply
                        </Link>
                        <form action={updateInboundEmailStatusAction}>
                          <input type="hidden" name="emailId" value={email.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input
                            type="hidden"
                            name="status"
                            value={email.status === InboundEmailStatus.UNREAD ? InboundEmailStatus.READ : InboundEmailStatus.UNREAD}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            {email.status === InboundEmailStatus.UNREAD ? <MailOpen size={14} className="mr-1" /> : <Inbox size={14} className="mr-1" />}
                            {email.status === InboundEmailStatus.UNREAD ? "Mark read" : "Mark unread"}
                          </Button>
                        </form>
                        <form action={updateInboundEmailStatusAction}>
                          <input type="hidden" name="emailId" value={email.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="status" value={InboundEmailStatus.ARCHIVED} />
                          <Button type="submit" size="sm" variant="outline">
                            <Archive size={14} className="mr-1" />
                            Archive
                          </Button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon={MailWarning}
                title="No inbound emails match this view"
                description="Emails sent to the public contact address will appear here once Resend Receiving is connected to the webhook."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
