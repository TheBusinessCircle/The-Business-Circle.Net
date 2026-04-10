import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FounderClientStage,
  FounderServicePaymentStatus,
  FounderServiceStatus
} from "@prisma/client";
import { ArrowLeft, ExternalLink, Link2, UserRound } from "lucide-react";
import {
  createFounderServiceCheckoutLinkAction,
  updateFounderServiceRequestAction
} from "@/actions/admin/founder-service.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatFounderClientStageLabel,
  formatFounderDiscountTagLabel,
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderServicePrice,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { getExternalLinkProps, normalizeExternalHref } from "@/lib/links";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  getFounderServiceRequestDetailsForAdmin,
  listFounderServiceDiscountCodes
} from "@/server/founder";

type PageProps = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAYMENT_STATUS_OPTIONS = Object.values(FounderServicePaymentStatus);
const SERVICE_STATUS_OPTIONS = Object.values(FounderServiceStatus);
const PIPELINE_STAGE_OPTIONS = Object.values(FounderClientStage);

export const metadata: Metadata = createPageMetadata({
  title: "Founder Service Request",
  description: "Review a founder client record in full and manage delivery.",
  path: "/admin/founder-services"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function optionalValue(value: string | null | undefined) {
  return value?.trim() ? value : "Not provided";
}

function externalHref(value: string) {
  return normalizeExternalHref(value);
}

function toDateTimeInputValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatBusinessStageValue(value: FounderClientStage | string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  return value.charAt(0) + value.slice(1).toLowerCase();
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "request-updated": "Founder client record updated successfully.",
    "checkout-link-created": "Manual checkout link generated successfully."
  };

  const errorMap: Record<string, string> = {
    invalid: "The founder client update payload was invalid.",
    "not-found": "That founder client record no longer exists.",
    "checkout-link-invalid": "The checkout link request was invalid.",
    "checkout-link-failed": "Unable to generate a checkout link for that client."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

export default async function AdminFounderServiceDetailsPage({
  params,
  searchParams
}: PageProps) {
  await requireAdmin();
  const [{ requestId }, parsedSearchParams] = await Promise.all([params, searchParams]);
  const [request, discountCodes] = await Promise.all([
    getFounderServiceRequestDetailsForAdmin(requestId),
    listFounderServiceDiscountCodes()
  ]);

  if (!request) {
    notFound();
  }

  const returnPath = `/admin/founder-services/${request.id}`;
  const feedback = feedbackMessage({
    notice: firstValue(parsedSearchParams.notice),
    error: firstValue(parsedSearchParams.error)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/founder-services"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back to Founder Services
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">Founder Client</h1>
          <p className="text-sm text-muted">
            Full client record, scheduling control, Stripe context, and internal notes.
          </p>
        </div>
        {request.user ? (
          <Link href={`/admin/members/${request.user.id}`}>
            <Button variant="outline">
              View Linked Member
              <ExternalLink size={14} className="ml-1" />
            </Button>
          </Link>
        ) : null}
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

      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
                Founder Client
              </Badge>
              <CardTitle className="font-display text-3xl">{request.businessName}</CardTitle>
              <CardDescription className="text-base">
                {request.fullName} · {request.service.title}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border text-muted">
                {formatFounderPaymentStatusLabel(request.paymentStatus)}
              </Badge>
              <Badge variant="outline" className="border-border text-muted">
                {formatFounderServiceStatusLabel(request.serviceStatus)}
              </Badge>
              <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                {formatFounderClientStageLabel(request.pipelineStage)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <InfoStat label="Request ID" value={request.id} />
          <InfoStat label="Submitted" value={formatDate(request.createdAt)} />
          <InfoStat label="Updated" value={formatDate(request.updatedAt)} />
          <InfoStat label="Final Price" value={formatFounderServicePrice(request.amount, request.currency)} />
          <InfoStat
            label="Member Rate"
            value={
              request.membershipDiscountPercent
                ? `${request.membershipDiscountPercent}% off`
                : "Standard"
            }
          />
          <InfoStat
            label="Checkout Link"
            value={request.checkoutUrl ? "Generated" : "Not generated"}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client control</CardTitle>
            <CardDescription>
              Update pipeline, payment state, dates, tasks, notes, and the manual discount selection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateFounderServiceRequestAction} className="space-y-4">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment status</Label>
                  <Select id="paymentStatus" name="paymentStatus" defaultValue={request.paymentStatus}>
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatFounderPaymentStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceStatus">Service status</Label>
                  <Select id="serviceStatus" name="serviceStatus" defaultValue={request.serviceStatus}>
                    {SERVICE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatFounderServiceStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pipelineStage">Pipeline stage</Label>
                  <Select id="pipelineStage" name="pipelineStage" defaultValue={request.pipelineStage}>
                    {PIPELINE_STAGE_OPTIONS.map((stage) => (
                      <option key={stage} value={stage}>
                        {formatFounderClientStageLabel(stage)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auditStartAt">Audit start</Label>
                  <Input
                    id="auditStartAt"
                    name="auditStartAt"
                    type="datetime-local"
                    defaultValue={toDateTimeInputValue(request.auditStartAt)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auditDueAt">Audit deadline</Label>
                  <Input
                    id="auditDueAt"
                    name="auditDueAt"
                    type="datetime-local"
                    defaultValue={toDateTimeInputValue(request.auditDueAt)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="callScheduledAt">Call date</Label>
                  <Input
                    id="callScheduledAt"
                    name="callScheduledAt"
                    type="datetime-local"
                    defaultValue={toDateTimeInputValue(request.callScheduledAt)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="adminDiscountCodeId">Assigned discount code</Label>
                  <Select
                    id="adminDiscountCodeId"
                    name="adminDiscountCodeId"
                    defaultValue={request.adminDiscountCode?.id ?? ""}
                  >
                    <option value="">No manual discount</option>
                    {discountCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.code} · {formatFounderDiscountTagLabel(code.tag)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="rounded-2xl border border-border/80 bg-background/22 p-4 text-sm text-foreground">
                  <input type="hidden" name="taskAuditChecklistComplete" value="false" />
                  <input
                    type="checkbox"
                    name="taskAuditChecklistComplete"
                    value="true"
                    defaultChecked={request.taskAuditChecklistComplete}
                    className="mr-2"
                  />
                  Audit checklist complete
                </label>
                <label className="rounded-2xl border border-border/80 bg-background/22 p-4 text-sm text-foreground">
                  <input type="hidden" name="taskCallCompleted" value="false" />
                  <input
                    type="checkbox"
                    name="taskCallCompleted"
                    value="true"
                    defaultChecked={request.taskCallCompleted}
                    className="mr-2"
                  />
                  Call completed
                </label>
                <label className="rounded-2xl border border-border/80 bg-background/22 p-4 text-sm text-foreground">
                  <input type="hidden" name="taskFollowUpSent" value="false" />
                  <input
                    type="checkbox"
                    name="taskFollowUpSent"
                    value="true"
                    defaultChecked={request.taskFollowUpSent}
                    className="mr-2"
                  />
                  Follow-up sent
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Internal notes</Label>
                <Textarea
                  id="adminNotes"
                  name="adminNotes"
                  rows={8}
                  defaultValue={request.adminNotes ?? ""}
                  placeholder="Private notes, delivery context, next moves, and decisions."
                />
              </div>

              <Button type="submit" variant="outline">
                Save Client Record
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual checkout</CardTitle>
              <CardDescription>
                Generate or refresh a Stripe checkout link after you have approved the work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.checkoutUrl ? (
                <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4 text-sm text-gold">
                  <p>Checkout link ready.</p>
                  <a
                    href={request.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-foreground hover:underline"
                  >
                    Open checkout link
                    <ExternalLink size={12} />
                  </a>
                  <p className="mt-2 text-xs text-muted">
                    Last generated {request.checkoutLinkSentAt ? formatDateTime(request.checkoutLinkSentAt) : "recently"}.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/80 bg-background/22 p-4 text-sm text-muted">
                  No checkout link has been generated for this client yet.
                </div>
              )}

              <form action={createFounderServiceCheckoutLinkAction} className="space-y-3">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <div className="space-y-2">
                  <Label htmlFor="checkout-discount">Discount code for checkout</Label>
                  <Select
                    id="checkout-discount"
                    name="adminDiscountCodeId"
                    defaultValue={request.adminDiscountCode?.id ?? ""}
                  >
                    <option value="">No manual discount</option>
                    {discountCodes.map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.code} · {formatFounderDiscountTagLabel(code.tag)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" variant="outline">
                  Generate Checkout Link
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing and Stripe context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <p>Base price: {formatFounderServicePrice(request.baseAmount, request.currency)}</p>
              <p>Final price: {formatFounderServicePrice(request.amount, request.currency)}</p>
              <p>
                Membership tier: {formatFounderMembershipTierLabel(request.membershipTierApplied)}
              </p>
              <p>
                Member discount:{" "}
                {request.membershipDiscountPercent
                  ? `${request.membershipDiscountPercent}%`
                  : "No member discount"}
              </p>
              <p>Manual discount: {request.adminDiscountCode?.code ?? "No manual discount"}</p>
              <p>Checkout session: {optionalValue(request.stripeCheckoutSessionId)}</p>
              <p>Payment intent: {optionalValue(request.stripePaymentIntentId)}</p>
              <p>Subscription: {optionalValue(request.stripeSubscriptionId)}</p>
              <p>Invoice: {optionalValue(request.stripeInvoiceId)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client profile</CardTitle>
          <CardDescription>
            The practical information Trevor needs before the work starts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailBlock label="Contact" value={`${request.fullName} | ${request.email}`} />
          <DetailBlock label="Business stage" value={formatBusinessStageValue(request.businessStage)} />
          <DetailBlock label="Service" value={request.service.title} />
          <DetailBlock label="Website or link" value={request.website} />
          <DetailBlock label="Source page" value={optionalValue(request.sourcePage)} />
          <DetailBlock label="Source section" value={optionalValue(request.sourceSection)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What they need help with</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/80 bg-background/25 p-5 text-sm leading-relaxed text-muted">
              {request.helpSummary}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned dates and task state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>Audit start: {request.auditStartAt ? formatDateTime(request.auditStartAt) : "Not set"}</p>
            <p>Audit deadline: {request.auditDueAt ? formatDateTime(request.auditDueAt) : "Not set"}</p>
            <p>Call date: {request.callScheduledAt ? formatDateTime(request.callScheduledAt) : "Not set"}</p>
            <p>Audit checklist complete: {request.taskAuditChecklistComplete ? "Yes" : "No"}</p>
            <p>Call completed: {request.taskCallCompleted ? "Yes" : "No"}</p>
            <p>Follow-up sent: {request.taskFollowUpSent ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linked account and website</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UserRound size={15} className="text-gold" />
              Linked account
            </p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              {request.user ? (
                <>
                  <p>{request.user.name || "Unnamed member"}</p>
                  <p>{request.user.email}</p>
                  <Link href={`/admin/members/${request.user.id}`} className="text-primary hover:underline">
                    Open member profile
                  </Link>
                </>
              ) : (
                <p>Guest submission. No member account linked to this request.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 size={15} className="text-gold" />
              Website
            </p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>{request.website}</p>
              <a
                {...getExternalLinkProps(externalHref(request.website))}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Visit link
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
