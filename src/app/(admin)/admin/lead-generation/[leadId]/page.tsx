import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LeadStatus } from "@prisma/client";
import { ArrowLeft, ExternalLink, MailCheck, Send, ShieldCheck } from "lucide-react";
import {
  sendLeadFollowUpEmailAction,
  updateLeadGenerationLeadAction
} from "@/actions/admin/lead-generation.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { safeRedirectPath } from "@/lib/auth/utils";
import { getExternalLinkProps } from "@/lib/links";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  buildLeadFollowUpDraft,
  formatLeadConsentStatus,
  formatLeadSourceLabel,
  formatLeadStatusLabel,
  getAdminLeadDetail,
  listLeadFollowUpDraftTypes,
  parseLeadFollowUpDraftType
} from "@/server/lead-generation";

type PageProps = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_OPTIONS = Object.values(LeadStatus);

export const metadata: Metadata = createPageMetadata({
  title: "Lead Detail",
  description: "Review an individual lead and prepare one-to-one follow-up.",
  path: "/admin/lead-generation"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function leadStatusBadgeVariant(status: LeadStatus) {
  if (status === LeadStatus.CONVERTED || status === LeadStatus.QUALIFIED) {
    return "success" as const;
  }

  if (status === LeadStatus.DO_NOT_CONTACT) {
    return "danger" as const;
  }

  if (status === LeadStatus.NOT_READY) {
    return "warning" as const;
  }

  return status === LeadStatus.NEW ? ("premium" as const) : ("outline" as const);
}

function consentBadgeVariant(input: {
  essentialConsent: boolean;
  marketingEmailOptIn: boolean;
}) {
  if (input.marketingEmailOptIn) {
    return "success" as const;
  }

  if (input.essentialConsent) {
    return "outline" as const;
  }

  return "warning" as const;
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "lead-updated": "Lead updated.",
    "follow-up-sent": "Follow-up email sent and timestamp logged."
  };
  const errorMap: Record<string, string> = {
    invalid: "That lead update was invalid.",
    "invalid-email": "That email draft was invalid.",
    "not-found": "That lead could not be found.",
    "email-not-configured": "Resend is not configured, so the email was not sent.",
    "email-send-failed": "Resend could not send that email.",
    "email-send-blocked": "That follow-up email was blocked.",
    "marketing-consent-required": "Marketing follow-up requires marketing opt-in.",
    "do-not-contact": "This lead is marked Do Not Contact."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function DetailItem({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-1 min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

export default async function AdminLeadDetailPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const [{ leadId }, query] = await Promise.all([params, searchParams]);
  const lead = await getAdminLeadDetail(leadId);

  if (!lead) {
    notFound();
  }

  const backPath = safeRedirectPath(firstValue(query.returnTo), "/admin/lead-generation");
  const draftType = parseLeadFollowUpDraftType(firstValue(query.draft));
  const draft = buildLeadFollowUpDraft(lead, draftType);
  const draftTypes = listLeadFollowUpDraftTypes();
  const feedback = feedbackMessage({
    notice: firstValue(query.notice),
    error: firstValue(query.error)
  });
  const detailPath = `/admin/lead-generation/${lead.id}?returnTo=${encodeURIComponent(backPath)}&draft=${draftType}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backPath}
          className="inline-flex items-center rounded-full border border-border/70 px-3 py-1.5 text-sm text-foreground hover:border-gold/35"
        >
          <ArrowLeft size={15} className="mr-2" />
          Back to leads
        </Link>
        <Badge variant={leadStatusBadgeVariant(lead.status)} className="normal-case tracking-normal">
          {formatLeadStatusLabel(lead.status)}
        </Badge>
      </div>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <ShieldCheck size={12} className="mr-1" />
            {formatLeadSourceLabel(lead.source, lead.sourceLabel)}
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">{lead.name}</CardTitle>
          <CardDescription>
            {lead.businessName || "No business recorded"} - {lead.email}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Detail</CardTitle>
              <CardDescription>Captured lead, consent and follow-up context.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Name">{lead.name}</DetailItem>
              <DetailItem label="Email">
                <a href={`mailto:${lead.email}`} className="break-all text-primary hover:underline">
                  {lead.email}
                </a>
              </DetailItem>
              <DetailItem label="Business">{lead.businessName || "N/A"}</DetailItem>
              <DetailItem label="Website">
                {lead.website ? (
                  <Link {...getExternalLinkProps(lead.website)} className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                    {lead.website}
                    <ExternalLink size={13} />
                  </Link>
                ) : (
                  "N/A"
                )}
              </DetailItem>
              <DetailItem label="Source">{formatLeadSourceLabel(lead.source, lead.sourceLabel)}</DetailItem>
              <DetailItem label="Consent source">{lead.consentSource || "N/A"}</DetailItem>
              <DetailItem label="Consent status">
                <Badge variant={consentBadgeVariant(lead)} className="normal-case tracking-normal">
                  {formatLeadConsentStatus(lead)}
                </Badge>
              </DetailItem>
              <DetailItem label="Marketing opt-in">{lead.marketingEmailOptIn ? "Yes" : "No"}</DetailItem>
              <DetailItem label="Score">{typeof lead.score === "number" ? lead.score : "N/A"}</DetailItem>
              <DetailItem label="Created date">{formatDateTime(lead.createdAt)}</DetailItem>
              <DetailItem label="Last emailed">
                {lead.lastEmailedAt ? formatDateTime(lead.lastEmailedAt) : "Not recorded"}
              </DetailItem>
              <DetailItem label="Recommended next step">{lead.recommendedNextStep}</DetailItem>
              <div className="min-w-0 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lead.tags.length ? (
                    lead.tags.map((tag) => (
                      <Badge key={tag} variant="muted" className="normal-case tracking-normal">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">None</span>
                  )}
                </div>
              </div>
              {lead.contactSubmission ? (
                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/25 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Contact submission</p>
                  <p className="mt-2 text-sm text-foreground">{lead.contactSubmission.subject || "No subject"}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{lead.contactSubmission.message}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-Up Tracking</CardTitle>
              <CardDescription>Uses existing Lead fields plus metadata for next step and follow-up date.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateLeadGenerationLeadAction} className="grid gap-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="returnPath" value={detailPath} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" name="status" defaultValue={lead.status}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatLeadStatusLabel(option)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUpDate">Follow-up date</Label>
                    <Input id="followUpDate" name="followUpDate" type="date" defaultValue={lead.followUp.followUpDate ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" name="tags" defaultValue={lead.tags.join(", ")} placeholder="audit, event, sales26" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextStep">Recommended next step</Label>
                  <Input id="nextStep" name="nextStep" defaultValue={lead.followUp.nextStep ?? lead.recommendedNextStep} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={lead.notes ?? ""} className="min-h-[140px]" />
                </div>
                <Button type="submit" variant="outline" className="w-fit">
                  <MailCheck size={14} className="mr-2" />
                  Save follow-up
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Email Draft</CardTitle>
            <CardDescription>Copy-ready draft first. Send is one-to-one only and rechecks consent server-side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="GET" className="space-y-2">
              <input type="hidden" name="returnTo" value={backPath} />
              <Label htmlFor="draft">Draft type</Label>
              <div className="flex gap-2">
                <Select id="draft" name="draft" defaultValue={draftType}>
                  {draftTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="outline">Preview</Button>
              </div>
            </form>

            <div className="rounded-2xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Consent check</p>
              <Badge
                variant={draft.canSend ? "success" : "warning"}
                className="mt-2 normal-case tracking-normal"
              >
                {draft.purpose === "SERVICE_REPLY" ? "Service/reply" : "Marketing"}
              </Badge>
              <p className="mt-2 text-sm text-muted">{draft.consentReason}</p>
            </div>

            <form action={sendLeadFollowUpEmailAction} className="space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="draftType" value={draftType} />
              <input type="hidden" name="returnPath" value={detailPath} />
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" value={draft.to} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" defaultValue={draft.subject} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Preview / copy-ready body</Label>
                <Textarea id="body" name="body" defaultValue={draft.body} className="min-h-[360px]" />
              </div>
              <Button type="submit" disabled={!draft.canSend} className="w-full sm:w-fit">
                <Send size={14} className="mr-2" />
                Send one-to-one follow-up
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
