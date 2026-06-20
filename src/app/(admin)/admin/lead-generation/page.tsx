import type { Metadata } from "next";
import Link from "next/link";
import { LeadSource, LeadStatus } from "@prisma/client";
import { Eye, MailCheck, Search, UsersRound } from "lucide-react";
import { updateLeadGenerationLeadAction } from "@/actions/admin/lead-generation.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  formatLeadConsentStatus,
  formatLeadSourceLabel,
  formatLeadStatusLabel,
  getLeadGenerationStats,
  listAdminLeads,
  parseLeadMarketingFilter,
  parseLeadSegmentFilter,
  parseLeadSource,
  parseLeadStatus
} from "@/server/lead-generation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 25;
const SOURCE_OPTIONS = Object.values(LeadSource);
const STATUS_OPTIONS = Object.values(LeadStatus);
const SEGMENT_OPTIONS = [
  { value: "ALL", label: "All leads" },
  { value: "NEW_THIS_WEEK", label: "New this week" },
  { value: "AUDIT", label: "Audit leads" },
  { value: "EVENT", label: "Event leads" },
  { value: "CIRCLE_CARD", label: "Circle Card leads" },
  { value: "SALES26", label: "sales26" }
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Lead Generation",
  description: "Review lead capture, consent status, and follow-up readiness.",
  path: "/admin/lead-generation"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildReturnPath(input: {
  query: string;
  source: LeadSource | "ALL";
  status: LeadStatus | "ALL";
  marketing: "ANY" | "OPTED_IN" | "NOT_OPTED_IN";
  segment: string;
  page: number;
}) {
  const search = new URLSearchParams();
  if (input.query) {
    search.set("q", input.query);
  }
  if (input.source !== "ALL") {
    search.set("source", input.source);
  }
  if (input.status !== "ALL") {
    search.set("status", input.status);
  }
  if (input.marketing !== "ANY") {
    search.set("marketing", input.marketing);
  }
  if (input.segment !== "ALL") {
    search.set("segment", input.segment);
  }
  if (input.page > 1) {
    search.set("page", String(input.page));
  }

  const suffix = search.toString();
  return suffix ? `/admin/lead-generation?${suffix}` : "/admin/lead-generation";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "lead-updated": "Lead updated.",
    "follow-up-sent": "Follow-up email sent."
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

  return status === LeadStatus.NEW ? "premium" as const : "outline" as const;
}

export default async function AdminLeadGenerationPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const source = parseLeadSource(firstValue(params.source));
  const status = parseLeadStatus(firstValue(params.status));
  const marketing = parseLeadMarketingFilter(firstValue(params.marketing));
  const segment = parseLeadSegmentFilter(firstValue(params.segment));
  const page = parsePage(firstValue(params.page));
  const returnPath = buildReturnPath({ query, source, status, marketing, segment, page });
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  const [stats, leads] = await Promise.all([
    getLeadGenerationStats(),
    listAdminLeads({
      query,
      source,
      status,
      marketing,
      segment,
      page,
      pageSize: PAGE_SIZE
    })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <UsersRound size={12} className="mr-1" />
            Lead Generation
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Lead Generation</CardTitle>
          <CardDescription className="mt-2 text-base">
            Lead capture across Circle Card, BCN join, audit, contact and tracked event sources with consent clearly separated from service emails.
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted">Total leads</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted">New</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted">Marketing opt-in</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">{stats.optedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted">Last 7 days</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats.recent}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Marketing emails require recorded opt-in. Service emails remain limited to account, membership, contact or audit operation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_190px_190px_190px_190px_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={query} placeholder="Name, email, business, website or tag" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">View</Label>
              <Select id="segment" name="segment" defaultValue={segment}>
                {SEGMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select id="source" name="source" defaultValue={source}>
                <option value="ALL">All sources</option>
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatLeadSourceLabel(option)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="ALL">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatLeadStatusLabel(option)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing">Consent</Label>
              <Select id="marketing" name="marketing" defaultValue={marketing}>
                <option value="ANY">Any consent</option>
                <option value="OPTED_IN">Marketing opt-in</option>
                <option value="NOT_OPTED_IN">No marketing opt-in</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                <Search size={14} className="mr-2" />
                Apply
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {SEGMENT_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
              <Link
                key={option.value}
                href={buildReturnPath({
                  query,
                  source: "ALL",
                  status,
                  marketing,
                  segment: option.value,
                  page: 1
                })}
                className={
                  option.value === segment
                    ? "rounded-full border border-gold/40 bg-gold/14 px-3 py-1.5 text-xs font-medium text-gold"
                    : "rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold/35"
                }
              >
                {option.label}
              </Link>
            ))}
          </div>

          {leads.items.length ? (
            <>
            <div className="grid gap-3 lg:hidden">
              {leads.items.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-border/70 bg-background/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <a href={`mailto:${lead.email}`} className="break-all text-sm text-primary hover:underline">
                        {lead.email}
                      </a>
                    </div>
                    <Badge variant={leadStatusBadgeVariant(lead.status)} className="shrink-0 normal-case tracking-normal">
                      {formatLeadStatusLabel(lead.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted">
                    <p>{lead.businessName || "No business recorded"}</p>
                    <p>{formatLeadSourceLabel(lead.source, lead.sourceLabel)}</p>
                    <p>{formatLeadConsentStatus(lead)}</p>
                    <p>Score: {typeof lead.score === "number" ? lead.score : "N/A"}</p>
                    <p>Last emailed: {lead.lastEmailedAt ? formatDateTime(lead.lastEmailedAt) : "Not recorded"}</p>
                  </div>
                  {lead.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {lead.tags.slice(0, 5).map((tag) => (
                        <Badge key={tag} variant="muted" className="normal-case tracking-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <Link
                    href={`/admin/lead-generation/${lead.id}?returnTo=${encodeURIComponent(returnPath)}`}
                    className="mt-4 inline-flex items-center rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold/35"
                  >
                    <Eye size={14} className="mr-2" />
                    Open detail
                  </Link>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[1.35rem] border border-border/70 lg:block">
              <table className="min-w-[1320px] divide-y divide-border/70 text-left text-sm">
                <thead className="bg-background/35 text-xs uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Business</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Consent status</th>
                    <th className="px-4 py-3 font-medium">Created date</th>
                    <th className="px-4 py-3 font-medium">Tags</th>
                    <th className="px-4 py-3 font-medium">Score/status</th>
                    <th className="px-4 py-3 font-medium">Last emailed</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leads.items.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-4 py-4 text-foreground">{lead.name}</td>
                      <td className="px-4 py-4">
                        <a href={`mailto:${lead.email}`} className="break-all text-primary hover:underline">
                          {lead.email}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-muted">{lead.businessName || "N/A"}</td>
                      <td className="px-4 py-4">
                        {lead.website ? (
                          <Link href={lead.website} className="break-all text-primary hover:underline" target="_blank">
                            {lead.website}
                          </Link>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <Badge variant="outline" className="normal-case tracking-normal">
                            {formatLeadSourceLabel(lead.source, lead.sourceLabel)}
                          </Badge>
                          {lead.consentSource ? (
                            <p className="text-xs text-muted">Consent: {lead.consentSource}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <Badge variant={consentBadgeVariant(lead)} className="normal-case tracking-normal">
                            {formatLeadConsentStatus(lead)}
                          </Badge>
                          {lead.marketingConsentAt ? (
                            <p className="text-xs text-muted">
                              Opted in {formatDateTime(lead.marketingConsentAt)}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted">{formatDateTime(lead.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[220px] flex-wrap gap-1.5">
                          {lead.tags.length ? (
                            lead.tags.map((tag) => (
                              <Badge key={tag} variant="muted" className="normal-case tracking-normal">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <Badge variant={leadStatusBadgeVariant(lead.status)} className="normal-case tracking-normal">
                            {formatLeadStatusLabel(lead.status)}
                          </Badge>
                          <p className="text-xs text-muted">
                            Score: {typeof lead.score === "number" ? lead.score : "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {lead.lastEmailedAt ? formatDateTime(lead.lastEmailedAt) : "Not recorded"}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/lead-generation/${lead.id}?returnTo=${encodeURIComponent(returnPath)}`}
                          className="inline-flex items-center rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground hover:border-gold/35"
                        >
                          <Eye size={14} className="mr-2" />
                          Open
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <form action={updateLeadGenerationLeadAction} className="w-[260px] space-y-2">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <Select name="status" defaultValue={lead.status} aria-label="Lead status">
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {formatLeadStatusLabel(option)}
                              </option>
                            ))}
                          </Select>
                          <Textarea
                            name="notes"
                            defaultValue={lead.notes ?? ""}
                            className="min-h-[80px]"
                            placeholder="Admin notes"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            <MailCheck size={14} className="mr-2" />
                            Save
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No leads found"
              description="No lead records match the current filters."
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              Page {leads.page} of {leads.totalPages} - {leads.total} lead{leads.total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              {leads.page > 1 ? (
                <Link
                  href={buildReturnPath({ query, source, status, marketing, segment, page: leads.page - 1 })}
                  className="rounded-full border border-border/70 px-3 py-1.5 text-foreground hover:border-gold/30"
                >
                  Previous
                </Link>
              ) : null}
              {leads.page < leads.totalPages ? (
                <Link
                  href={buildReturnPath({ query, source, status, marketing, segment, page: leads.page + 1 })}
                  className="rounded-full border border-border/70 px-3 py-1.5 text-foreground hover:border-gold/30"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
