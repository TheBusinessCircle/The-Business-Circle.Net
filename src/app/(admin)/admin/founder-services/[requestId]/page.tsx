import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FounderServicePaymentStatus,
  FounderServiceStatus
} from "@prisma/client";
import {
  ArrowLeft,
  ExternalLink,
  Link2,
  ReceiptText,
  UserRound
} from "lucide-react";
import { updateFounderServiceRequestAction } from "@/actions/admin/founder-service.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderRevenueRangeLabel,
  formatFounderServicePrice,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { getExternalLinkProps, normalizeExternalHref } from "@/lib/links";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getFounderServiceRequestDetailsForAdmin } from "@/server/founder";
import type { FounderServiceRequestDetailModel } from "@/types";

type PageProps = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAYMENT_STATUS_OPTIONS = Object.values(FounderServicePaymentStatus);
const SERVICE_STATUS_OPTIONS = Object.values(FounderServiceStatus);

export const metadata: Metadata = createPageMetadata({
  title: "Founder Service Request",
  description: "Review a founder service request in full and update delivery status.",
  path: "/admin/founder-services"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function paymentStatusBadge(status: FounderServiceRequestDetailModel["paymentStatus"]) {
  switch (status) {
    case "PAID":
      return (
        <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
          {formatFounderPaymentStatusLabel(status)}
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-red-500/35 bg-red-500/10 text-red-200">
          {formatFounderPaymentStatusLabel(status)}
        </Badge>
      );
    case "REFUNDED":
      return (
        <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 text-sky-200">
          {formatFounderPaymentStatusLabel(status)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
          {formatFounderPaymentStatusLabel(status)}
        </Badge>
      );
  }
}

function serviceStatusBadge(status: FounderServiceRequestDetailModel["serviceStatus"]) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
          {formatFounderServiceStatusLabel(status)}
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
          {formatFounderServiceStatusLabel(status)}
        </Badge>
      );
    case "WAITING_ON_CLIENT":
      return (
        <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 text-sky-200">
          {formatFounderServiceStatusLabel(status)}
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="border-red-500/35 bg-red-500/10 text-red-200">
          {formatFounderServiceStatusLabel(status)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-border text-muted">
          {formatFounderServiceStatusLabel(status)}
        </Badge>
      );
  }
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "request-updated": "Founder service request updated successfully."
  };

  const errorMap: Record<string, string> = {
    invalid: "The founder service update payload was invalid.",
    "not-found": "That founder service request no longer exists."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function optionalValue(value: string | null | undefined) {
  return value?.trim() ? value : "Not provided";
}

function externalHref(value: string) {
  return normalizeExternalHref(value);
}

export default async function AdminFounderServiceDetailsPage({
  params,
  searchParams
}: PageProps) {
  await requireAdmin();
  const [{ requestId }, parsedSearchParams] = await Promise.all([params, searchParams]);
  const request = await getFounderServiceRequestDetailsForAdmin(requestId);

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
          <h1 className="mt-2 font-display text-3xl font-semibold">Founder Service Request</h1>
          <p className="text-sm text-muted">
            Full enquiry detail, uploads, payment trail, and delivery management.
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
                Founder Service Request
              </Badge>
              <CardTitle className="font-display text-3xl">{request.service.title}</CardTitle>
              <CardDescription className="text-base">
                Submitted by {request.fullName} for {request.businessName}.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {paymentStatusBadge(request.paymentStatus)}
              {serviceStatusBadge(request.serviceStatus)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <InfoStat label="Request ID" value={request.id} />
          <InfoStat label="Submitted" value={formatDate(request.createdAt)} />
          <InfoStat label="Updated" value={formatDate(request.updatedAt)} />
          <InfoStat
            label="Base Price"
            value={formatFounderServicePrice(request.baseAmount, request.currency)}
          />
          <InfoStat
            label="Final Price"
            value={formatFounderServicePrice(request.amount, request.currency)}
          />
          <InfoStat
            label="Member Rate"
            value={
              request.membershipDiscountPercent
                ? `${request.membershipDiscountPercent}% off`
                : "Standard rate"
            }
          />
          <InfoStat
            label="Payment"
            value={formatFounderPaymentStatusLabel(request.paymentStatus)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Request management</CardTitle>
            <CardDescription>
              Update payment and delivery state, then leave any working notes for Trev.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateFounderServiceRequestAction} className="space-y-4">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

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

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin notes</Label>
                <Textarea
                  id="adminNotes"
                  name="adminNotes"
                  rows={10}
                  defaultValue={request.adminNotes ?? ""}
                  placeholder="Internal notes, delivery context, client follow-up, or strategic observations."
                />
              </div>

              <Button type="submit" variant="outline">
                Save Founder Request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer, pricing, and payment context</CardTitle>
            <CardDescription>
              Core contact details, member pricing trace, source context, and Stripe references.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserRound size={15} className="text-gold" />
                Contact
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>{request.fullName}</p>
                <p>{request.email}</p>
                <p>{request.phone}</p>
                <p>{request.businessName}</p>
                {request.website ? (
                  <a
                    {...getExternalLinkProps(externalHref(request.website))}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Visit website
                    <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ReceiptText size={15} className="text-gold" />
                Pricing trace
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>Service owner: {request.serviceOwner}</p>
                <p>Selected tier: {request.service.title}</p>
                <p>
                  Base price:{" "}
                  {formatFounderServicePrice(request.baseAmount, request.currency)}
                </p>
                <p>
                  Final price:{" "}
                  {formatFounderServicePrice(request.amount, request.currency)}
                </p>
                <p>
                  Membership tier:{" "}
                  {formatFounderMembershipTierLabel(request.membershipTierApplied)}
                </p>
                <p>
                  Discount applied:{" "}
                  {request.membershipDiscountPercent
                    ? `${request.membershipDiscountPercent}%`
                    : "No member discount"}
                </p>
                <p>Discount label: {optionalValue(request.discountLabel)}</p>
                <p>Source page: {optionalValue(request.sourcePage)}</p>
                <p>Source section: {optionalValue(request.sourceSection)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 size={15} className="text-gold" />
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
                <ReceiptText size={15} className="text-gold" />
                Stripe references
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>Checkout session: {optionalValue(request.stripeCheckoutSessionId)}</p>
                <p>Payment intent: {optionalValue(request.stripePaymentIntentId)}</p>
                <p>Subscription: {optionalValue(request.stripeSubscriptionId)}</p>
                <p>Invoice: {optionalValue(request.stripeInvoiceId)}</p>
                <p>Paid at: {request.paidAt ? formatDate(request.paidAt) : "Not paid yet"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business snapshot</CardTitle>
          <CardDescription>
            The high-level context Trev needs before he starts the deeper strategic review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailBlock label="Industry / Niche" value={request.industry} />
          <DetailBlock label="Business location" value={request.location} />
          <DetailBlock label="Years in business" value={request.yearsInBusiness} />
          <DetailBlock label="Employees" value={request.employeeCount} />
          <DetailBlock label="Monthly revenue range" value={formatFounderRevenueRangeLabel(request.revenueRange)} />
          <DetailBlock label="Marketing channels" value={request.marketingChannels.join(", ")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
          <CardDescription>
            Where the business is currently showing up online.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailBlock label="Instagram" value={optionalValue(request.instagram)} />
          <DetailBlock label="TikTok" value={optionalValue(request.tiktok)} />
          <DetailBlock label="Facebook" value={optionalValue(request.facebook)} />
          <DetailBlock label="LinkedIn" value={optionalValue(request.linkedin)} />
          <DetailBlock label="Other" value={optionalValue(request.otherSocial)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <LongformCard title="What the business does" value={request.businessDescription} />
        <LongformCard title="Target audience" value={request.targetAudience} />
        <LongformCard title="Products or services" value={request.productsOrServices} />
        <LongformCard title="Current offers" value={request.offers} />
        <LongformCard title="What makes the business different" value={request.differentiator} />
        <LongformCard title="Main goal right now" value={request.mainGoal} />
        <LongformCard title="Biggest challenge" value={request.biggestChallenge} />
        <LongformCard title="What is holding the business back" value={request.blockers} />
        <LongformCard title="What they have already tried" value={request.pastAttempts} />
        <LongformCard title="What success looks like" value={request.successDefinition} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why Trev</CardTitle>
          <CardDescription>
            Their final reason for wanting Trev specifically involved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/80 bg-background/25 p-5 text-sm leading-relaxed text-muted">
            {request.whyTrev}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploads</CardTitle>
          <CardDescription>
            Optional materials attached to support the review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {request.uploads.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {request.uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="rounded-2xl border border-border/80 bg-background/25 p-4"
                >
                  <p className="text-sm font-medium text-foreground">{upload.fileName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {upload.mimeType || "Unknown file type"} | Uploaded {formatDate(upload.createdAt)}
                  </p>
                  <a
                    href={`/api/admin/founder-services/uploads/${upload.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Download file
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No files were uploaded with this request.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
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

function LongformCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/80 bg-background/25 p-5 text-sm leading-relaxed text-muted">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
