import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Inbox, MailOpen, Paperclip } from "lucide-react";
import { InboundEmailStatus } from "@prisma/client";
import { updateInboundEmailStatusAction } from "@/actions/admin/inbound-email.actions";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  emailBodyToPlainText,
  extractSenderEmail,
  formatEmailRecipients,
  getInboundEmailForAdmin
} from "@/server/inbound-email";

type PageProps = {
  params: Promise<{ emailId: string }>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Email Detail",
  description: "Review an inbound BCN contact email.",
  path: "/admin/emails"
});

export const dynamic = "force-dynamic";

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

export default async function AdminEmailDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { emailId } = await params;
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
            {attachments.length ? (
              <Badge variant="outline" className="text-muted">
                <Paperclip size={12} className="mr-1" />
                {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {email.forwardedAt ? <Badge variant="success">Forwarded</Badge> : null}
            {email.forwardError ? <Badge variant="warning">Forward issue</Badge> : null}
          </div>
          <CardTitle className="mt-3 break-words font-display text-3xl">
            {email.subject || "No subject"}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Received {formatDateTime(email.receivedAt)} from {email.from}
          </CardDescription>
        </CardHeader>
      </Card>

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
                  Reply
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
              <p><span className="text-muted">Resend email ID:</span> <span className="break-words text-foreground">{email.resendEmailId}</span></p>
              <p><span className="text-muted">Forwarded to:</span> <span className="break-words text-foreground">{email.forwardedTo || "Not forwarded yet"}</span></p>
              {email.forwardedAt ? <p><span className="text-muted">Forwarded at:</span> <span className="text-foreground">{formatDateTime(email.forwardedAt)}</span></p> : null}
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
