import type { Metadata } from "next";
import Link from "next/link";
import {
  FounderServicePaymentStatus,
  FounderServiceStatus
} from "@prisma/client";
import {
  Briefcase,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  ReceiptText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderServicePrice,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { listActiveFounderServices, listFounderServiceRequestsForAdmin } from "@/server/founder";
import type { FounderServiceRequestListItem } from "@/types";
import { Select } from "@/components/ui/select";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Founder Services",
  description: "Manage Trev founder service enquiries, payments, and delivery status.",
  path: "/admin/founder-services"
});

export const dynamic = "force-dynamic";

const PAYMENT_FILTER_OPTIONS = Object.values(FounderServicePaymentStatus);
const PIPELINE_FILTER_OPTIONS = Object.values(FounderServiceStatus);

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePaymentStatus(
  value: string
): FounderServicePaymentStatus | undefined {
  return PAYMENT_FILTER_OPTIONS.includes(value as FounderServicePaymentStatus)
    ? (value as FounderServicePaymentStatus)
    : undefined;
}

function parseServiceStatus(value: string): FounderServiceStatus | undefined {
  return PIPELINE_FILTER_OPTIONS.includes(value as FounderServiceStatus)
    ? (value as FounderServiceStatus)
    : undefined;
}

function paymentStatusBadge(status: FounderServiceRequestListItem["paymentStatus"]) {
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

function serviceStatusBadge(status: FounderServiceRequestListItem["serviceStatus"]) {
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

export default async function AdminFounderServicesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const selectedServiceSlug = firstValue(params.service);
  const paymentFilter = parsePaymentStatus(firstValue(params.payment));
  const pipelineFilter = parseServiceStatus(firstValue(params.pipeline));
  const [services, requests] = await Promise.all([
    listActiveFounderServices(),
    listFounderServiceRequestsForAdmin({
      serviceSlug: selectedServiceSlug || undefined,
      paymentStatus: paymentFilter,
      serviceStatus: pipelineFilter
    })
  ]);
  const hasFilters = Boolean(
    selectedServiceSlug || paymentFilter || pipelineFilter
  );

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  const totalRevenue = requests
    .filter((request) => request.paymentStatus === "PAID")
    .reduce((sum, request) => sum + request.amount, 0);
  const paidCount = requests.filter((request) => request.paymentStatus === "PAID").length;
  const inProgressCount = requests.filter((request) => request.serviceStatus === "IN_PROGRESS").length;
  const newCount = requests.filter((request) => request.serviceStatus === "NEW").length;

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70 shadow-panel-soft">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Briefcase size={12} className="mr-1" />
                Trev Services Pipeline
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Founder Services</CardTitle>
              <CardDescription className="mt-2 text-base">
                Review incoming founder service enquiries, track payment state,
                and manage how each engagement moves from review to delivery.
              </CardDescription>
            </div>

            <a href="/api/admin/founder-services/export">
              <Button variant="outline">
                <Download size={15} className="mr-1" />
                Export CSV
              </Button>
            </a>
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Filter the pipeline</CardTitle>
          <CardDescription>
            Narrow requests by service tier, payment status, or delivery stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <label htmlFor="service" className="text-sm font-medium text-foreground">
                Tier or service
              </label>
              <Select id="service" name="service" defaultValue={selectedServiceSlug}>
                <option value="">All founder services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.slug}>
                    {service.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="payment" className="text-sm font-medium text-foreground">
                Payment status
              </label>
              <Select
                id="payment"
                name="payment"
                defaultValue={paymentFilter ?? ""}
              >
                <option value="">Any payment state</option>
                {PAYMENT_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatFounderPaymentStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="pipeline" className="text-sm font-medium text-foreground">
                Pipeline status
              </label>
              <Select
                id="pipeline"
                name="pipeline"
                defaultValue={pipelineFilter ?? ""}
              >
                <option value="">Any pipeline stage</option>
                {PIPELINE_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatFounderServiceStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-end gap-3">
              <Button type="submit" variant="outline">
                Apply Filters
              </Button>
              {hasFilters ? (
                <Link href="/admin/founder-services">
                  <Button type="button" variant="ghost">
                    Clear
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Briefcase}
          label="Total Requests"
          value={requests.length.toLocaleString("en-GB")}
          hint={hasFilters ? "Requests matching the current filters." : "All founder service enquiries submitted."}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Paid Requests"
          value={paidCount.toLocaleString("en-GB")}
          hint={hasFilters ? "Paid requests matching the current filters." : "Confirmed founder service payments."}
        />
        <MetricCard
          icon={Clock3}
          label="New Reviews"
          value={newCount.toLocaleString("en-GB")}
          hint={hasFilters ? "Filtered requests still waiting for first review." : "Requests still waiting for first review."}
        />
        <MetricCard
          icon={ReceiptText}
          label="Paid Revenue"
          value={formatFounderServicePrice(totalRevenue)}
          hint={hasFilters ? "Revenue confirmed for the filtered request set." : "Revenue confirmed through founder service payments."}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Founder Service Requests</CardTitle>
          <CardDescription>
            Every founder service submission, from first enquiry through to
            completion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Request ID</th>
                  <th className="px-3 py-2 font-medium">Date submitted</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Business</th>
                  <th className="px-3 py-2 font-medium">Selected tier</th>
                  <th className="px-3 py-2 font-medium">Pricing</th>
                  <th className="px-3 py-2 font-medium">Member rate</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Pipeline</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length ? (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b border-border/70 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.id}</p>
                        <p className="mt-1 text-xs text-muted">
                          Updated {formatDate(request.updatedAt)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-muted">{formatDate(request.createdAt)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.fullName}</p>
                        <p className="mt-1 text-xs text-muted">{request.email}</p>
                        {request.user ? (
                          <p className="mt-1 text-xs text-muted">
                            Linked account: {request.user.name || request.user.email}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">Guest checkout</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.businessName}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.service.title}</p>
                        <p className="mt-1 text-xs text-muted">/{request.service.slug}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">
                          {formatFounderServicePrice(request.amount, request.currency)}
                        </p>
                        {request.membershipDiscountPercent ? (
                          <p className="mt-1 text-xs text-muted">
                            Base {formatFounderServicePrice(request.baseAmount, request.currency)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">
                            Standard rate
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">
                          {formatFounderMembershipTierLabel(request.membershipTierApplied)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {request.membershipDiscountPercent
                            ? `${request.membershipDiscountPercent}% off`
                            : "No member discount"}
                        </p>
                        {request.discountLabel ? (
                          <p className="mt-1 text-xs text-muted">{request.discountLabel}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{paymentStatusBadge(request.paymentStatus)}</td>
                      <td className="px-3 py-3">{serviceStatusBadge(request.serviceStatus)}</td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/founder-services/${request.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={14} className="mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted">
                      No founder service requests have been submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {inProgressCount ? (
            <p className="mt-4 text-xs text-muted">
              {inProgressCount} request{inProgressCount === 1 ? "" : "s"} currently marked as in progress.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription className="inline-flex items-center gap-2">
          <Icon size={15} className="text-gold" />
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}
