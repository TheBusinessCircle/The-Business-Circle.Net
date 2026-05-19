import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Inbox, MailOpen, Paperclip, Send } from "lucide-react";
import { InboundEmailStatus } from "@prisma/client";
import {
  replyToInboundEmailAction,
  updateInboundEmailStatusAction
} from "@/actions/admin/inbound-email.actions";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  emailBodyToPlainText,
  extractSenderEmail,
  formatEmailRecipients,
  getInboundEmailForAdmin,
  inboundEmailSourceLabel
} from "@/server/inbound-email";

type PageProps = {
  params: Promise<{ emailId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Email Detail",
  description: "Review an inbound BCN contact email.",
  path: "/admin/emails"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function attachmentMetadata(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      filename: typeof item.filename === "string" ? item.filename : "Attachment",
      contentType: typeof item.content_type === "string" ? item.content_type : "Unknown type",
      size: typeof item.size === "number" ? item.size : null
    }));
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

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "status-updated": "Email status updated.",
    "reply-sent": "Reply sent successfully."
  };
  const errorMap: Record<string, string> = {
    invalid: "That email action could not be processed.",
    "not-found": "That email could not be found.",
    "reply-invalid": "Add a subject and reply message before sending.",
    "reply-failed": "The reply could not be sent. Review the reply status below."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminEmailDetailPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { emailId } = await params;
  const parsedSearchParams = await searchParams;
  const email = await getInboundEmailForAdmin(emailId);

  if (!email) {
    notFound();
  }

  const senderEmail = extractSenderEmail(email.from);
  const recipients = formatEmailRecipients(email.to);
  const cc = formatEmailRecipients(email.cc);
  const bcc = formatEmailRecipients(email.bcc);
  const body = emailBodyToPlainText(email);
  const attachments = attachmentMetadata(email.attachments);
  const mailtoSubject = email.subject ? `Re: ${email.subject}` : "Re: BCN enquiry";
  const feedback = feedbackMessage({
    notice: firstValue(parsedSearchParams.notice),
    error: firstValue(parsedSearchParams.error)
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/emails" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
          <ArrowLeft size={14} className="mr-2" />
          Back to emails
      </Link>

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(email.status)}>{email.status}</Badge>
            <Badge variant="outline" className="text-muted">{inboundEmailSourceLabel(email)}</Badge>
            {attachments.length ? (
              <Badge variant="outline" className="text-muted">
                <Paperclip size={12} className="mr-1" />
                {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {email.forwardedAt ? <Badge variant="success">Forwarded</Badge> : null}
            {email.forwardError ? <Badge variant="warning">Forward issue</Badge> : null}
            {email.lastRepliedAt ? <Badge variant="success">Replied</Badge> : null}
          </div>
          <CardTitle className="mt-3 break-words font-display text-3xl">
            {email.subject || "No subject"}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Received {formatDateTime(email.receivedAt)} from {email.from}
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Email body</CardTitle>
            <CardDescription>
              Rendered as safe plain text. Original HTML is stored but not injected into the admin page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {body ? (
              <pre className="max-h-[760px] whitespace-pre-wrap break-words rounded-2xl border border-silver/14 bg-background/24 p-4 text-sm leading-7 text-foreground/90">
                {body}
              </pre>
            ) : (
              <p className="rounded-2xl border border-silver/14 bg-background/24 p-4 text-sm text-muted">
                No readable body was returned by Resend for this email.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <CopyLinkButton value={senderEmail} label="Copy sender" />
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={`mailto:${encodeURIComponent(senderEmail)}?subject=${encodeURIComponent(mailtoSubject)}`}
              >
                  Open mail app
              </a>
              <form action={updateInboundEmailStatusAction}>
                <input type="hidden" name="emailId" value={email.id} />
                <input type="hidden" name="returnPath" value={`/admin/emails/${email.id}`} />
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
                <input type="hidden" name="returnPath" value={`/admin/emails/${email.id}`} />
                <input type="hidden" name="status" value={InboundEmailStatus.ARCHIVED} />
                <Button type="submit" size="sm" variant="outline">
                  <Archive size={14} className="mr-1" />
                  Archive
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card id="reply">
            <CardHeader>
              <CardTitle>Reply from inbox</CardTitle>
              <CardDescription>
                Send a direct reply through Resend while keeping the latest reply state on this email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={replyToInboundEmailAction} className="space-y-4">
                <input type="hidden" name="emailId" value={email.id} />
                <input type="hidden" name="returnPath" value={`/admin/emails/${email.id}#reply`} />
                <div className="space-y-2">
                  <Label htmlFor="reply-subject">Subject</Label>
                  <Input id="reply-subject" name="subject" defaultValue={mailtoSubject} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply-message">Message</Label>
                  <Textarea
                    id="reply-message"
                    name="message"
                    rows={8}
                    required
                    placeholder="Write your reply"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Send size={14} className="mr-2" />
                  Send reply
                </Button>
              </form>

              {email.lastRepliedAt ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  Last replied to {email.lastReplyTo || senderEmail} at {formatDateTime(email.lastRepliedAt)}.
                </div>
              ) : null}
              {email.lastReplyError ? (
                <p className="rounded-2xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-100">
                  Last reply issue: {email.lastReplyError}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Envelope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="text-muted">From:</span> <span className="break-words text-foreground">{email.from}</span></p>
              <p><span className="text-muted">To:</span> <span className="break-words text-foreground">{recipients.join(", ") || "Not captured"}</span></p>
              {cc.length ? <p><span className="text-muted">CC:</span> <span className="break-words text-foreground">{cc.join(", ")}</span></p> : null}
              {bcc.length ? <p><span className="text-muted">BCC:</span> <span className="break-words text-foreground">{bcc.join(", ")}</span></p> : null}
              <p><span className="text-muted">Message ID:</span> <span className="break-words text-foreground">{email.messageId || "Not captured"}</span></p>
              <p><span className="text-muted">Source:</span> <span className="break-words text-foreground">{inboundEmailSourceLabel(email)}</span></p>
              <p><span className="text-muted">Resend email ID:</span> <span className="break-words text-foreground">{email.resendEmailId}</span></p>
              <p><span className="text-muted">Forwarded to:</span> <span className="break-words text-foreground">{email.forwardedTo || "Not forwarded yet"}</span></p>
              {email.forwardedAt ? <p><span className="text-muted">Forwarded at:</span> <span className="text-foreground">{formatDateTime(email.forwardedAt)}</span></p> : null}
              {email.lastRepliedAt ? <p><span className="text-muted">Last reply:</span> <span className="text-foreground">{formatDateTime(email.lastRepliedAt)}</span></p> : null}
              {email.forwardError ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">{email.forwardError}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>Metadata only. File retrieval can be added later if needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {attachments.length ? (
                attachments.map((attachment) => (
                  <div key={`${attachment.id}-${attachment.filename}`} className="rounded-2xl border border-silver/14 bg-background/22 p-3 text-sm">
                    <p className="break-words text-foreground">{attachment.filename}</p>
                    <p className="mt-1 text-xs text-muted">
                      {attachment.contentType}
                      {attachment.size ? ` · ${attachment.size} bytes` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No attachments were reported by Resend.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
