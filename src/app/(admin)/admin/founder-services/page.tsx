import type { Metadata } from "next";
import Link from "next/link";
import {
  FounderClientStage,
  FounderServiceDiscountTag,
  FounderServicePaymentStatus
} from "@prisma/client";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Clock3,
  Download,
  Layers3,
  ReceiptText,
  Sparkles
} from "lucide-react";
import {
  createFounderServiceDiscountCodeAction,
  syncFounderServiceStripeCatalogAction,
  updateFounderServiceRequestAction
} from "@/actions/admin/founder-service.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  formatFounderClientStageLabel,
  formatFounderDiscountTagLabel,
  formatFounderPaymentStatusLabel,
  formatFounderServicePrice,
  isGrowthArchitectServiceSlug
} from "@/lib/founder";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  listActiveFounderServices,
  listFounderServiceDiscountCodes,
  listFounderServiceRequestsForAdmin
} from "@/server/founder";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CalendarView = "day" | "week";

type ScheduleItem = {
  requestId: string;
  businessName: string;
  fullName: string;
  serviceTitle: string;
  stage: FounderClientStage;
  paymentStatus: FounderServicePaymentStatus;
  type: "Audit Start" | "Audit Deadline" | "Call";
  date: Date;
};

const PAYMENT_FILTER_OPTIONS = Object.values(FounderServicePaymentStatus);
const PIPELINE_FILTER_OPTIONS = Object.values(FounderClientStage);
const DISCOUNT_TAG_OPTIONS = Object.values(FounderServiceDiscountTag);

export const metadata: Metadata = createPageMetadata({
  title: "Founder Services",
  description: "Manage founder applications, schedule work manually, and control Stripe and discounts.",
  path: "/admin/founder-services"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePaymentStatus(value: string): FounderServicePaymentStatus | undefined {
  return PAYMENT_FILTER_OPTIONS.includes(value as FounderServicePaymentStatus)
    ? (value as FounderServicePaymentStatus)
    : undefined;
}

function parsePipelineStage(value: string): FounderClientStage | undefined {
  return PIPELINE_FILTER_OPTIONS.includes(value as FounderClientStage)
    ? (value as FounderClientStage)
    : undefined;
}

function parseCalendarView(value: string): CalendarView {
  return value === "day" ? "day" : "week";
}

function parseCalendarDate(value: string): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function buildReturnPath(input: {
  service?: string;
  payment?: FounderServicePaymentStatus;
  pipeline?: FounderClientStage;
  calendarView: CalendarView;
  date: string;
}) {
  const search = new URLSearchParams();

  if (input.service) {
    search.set("service", input.service);
  }
  if (input.payment) {
    search.set("payment", input.payment);
  }
  if (input.pipeline) {
    search.set("pipeline", input.pipeline);
  }

  search.set("calendar", input.calendarView);
  search.set("date", input.date);
  return `/admin/founder-services?${search.toString()}`;
}

function collectScheduleItems(
  requests: Awaited<ReturnType<typeof listFounderServiceRequestsForAdmin>>
): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  for (const request of requests) {
    if (request.auditStartAt) {
      items.push({
        requestId: request.id,
        businessName: request.businessName,
        fullName: request.fullName,
        serviceTitle: request.service.title,
        stage: request.pipelineStage,
        paymentStatus: request.paymentStatus,
        type: "Audit Start",
        date: request.auditStartAt
      });
    }

    if (request.auditDueAt) {
      items.push({
        requestId: request.id,
        businessName: request.businessName,
        fullName: request.fullName,
        serviceTitle: request.service.title,
        stage: request.pipelineStage,
        paymentStatus: request.paymentStatus,
        type: "Audit Deadline",
        date: request.auditDueAt
      });
    }

    if (request.callScheduledAt) {
      items.push({
        requestId: request.id,
        businessName: request.businessName,
        fullName: request.fullName,
        serviceTitle: request.service.title,
        stage: request.pipelineStage,
        paymentStatus: request.paymentStatus,
        type: "Call",
        date: request.callScheduledAt
      });
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "request-updated": "Founder client record updated successfully.",
    "discount-created": "Discount code created and linked to Stripe successfully.",
    "stripe-sync-complete": "Founder Stripe catalog synced successfully.",
    "checkout-link-created": "Manual checkout link generated successfully."
  };

  const errorMap: Record<string, string> = {
    invalid: "The founder client update payload was invalid.",
    "not-found": "That founder client record no longer exists.",
    "discount-invalid": "The discount form was incomplete or invalid.",
    "discount-create-failed": "Unable to create that discount code in Stripe.",
    "stripe-sync-failed": "Unable to sync the founder Stripe catalog.",
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

function pipelineCardTone(stage: FounderClientStage) {
  switch (stage) {
    case "APPROVED":
      return "border-sky-500/25 bg-sky-500/10";
    case "AUDIT_SCHEDULED":
      return "border-primary/30 bg-primary/10";
    case "AUDIT_IN_PROGRESS":
      return "border-gold/28 bg-gold/10";
    case "CALL_SCHEDULED":
      return "border-violet-500/25 bg-violet-500/10";
    case "ONGOING_CLIENT":
    case "COMPLETED":
      return "border-emerald-500/25 bg-emerald-500/10";
    default:
      return "border-border/80 bg-background/22";
  }
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

export default async function AdminFounderServicesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const selectedServiceSlug = firstValue(params.service);
  const paymentFilter = parsePaymentStatus(firstValue(params.payment));
  const pipelineFilter = parsePipelineStage(firstValue(params.pipeline));
  const calendarView = parseCalendarView(firstValue(params.calendar));
  const calendarDate = parseCalendarDate(firstValue(params.date));

  const [allServices, requests, discountCodes] = await Promise.all([
    listActiveFounderServices(),
    listFounderServiceRequestsForAdmin({
      serviceSlug: selectedServiceSlug || undefined,
      paymentStatus: paymentFilter,
      pipelineStage: pipelineFilter
    }),
    listFounderServiceDiscountCodes()
  ]);
  const services = allServices.filter((service) => isGrowthArchitectServiceSlug(service.slug));

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const returnPath = buildReturnPath({
    service: selectedServiceSlug || undefined,
    payment: paymentFilter,
    pipeline: pipelineFilter,
    calendarView,
    date: toDateInputValue(calendarDate)
  });
  const hasFilters = Boolean(selectedServiceSlug || paymentFilter || pipelineFilter);

  const activeClients = requests.filter((request) => request.pipelineStage !== "COMPLETED").length;
  const totalRevenue = requests
    .filter((request) => request.paymentStatus === "PAID")
    .reduce((sum, request) => sum + request.amount, 0);
  const scheduleItems = collectScheduleItems(requests);
  const now = new Date();
  const upcomingWindowEnd = addDays(new Date(), 7);
  const upcomingTasks = scheduleItems.filter(
    (item) => item.date >= now && item.date <= upcomingWindowEnd
  ).length;
  const nextScheduledAction = scheduleItems.find((item) => item.date >= now) ?? scheduleItems[0] ?? null;
  const calendarStart = startOfDay(calendarDate);
  const calendarEnd =
    calendarView === "day" ? endOfDay(calendarDate) : endOfDay(addDays(calendarDate, 6));
  const visibleScheduleItems = scheduleItems.filter(
    (item) => item.date >= calendarStart && item.date <= calendarEnd
  );
  const pipelineGroups = PIPELINE_FILTER_OPTIONS.map((stage) => ({
    stage,
    items: requests.filter((request) => request.pipelineStage === stage)
  }));

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/82 to-card/70 shadow-panel-soft">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <Briefcase size={12} className="mr-1" />
                Founder Client System
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Founder Services</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Application-first founder workflow for intake, approval, manual scheduling,
                Stripe control, discount management, and low-volume delivery.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={syncFounderServiceStripeCatalogAction}>
                <input type="hidden" name="returnPath" value={returnPath} />
                <Button type="submit" variant="outline">
                  <Sparkles size={15} className="mr-1" />
                  Sync Stripe Products
                </Button>
              </form>
              <a href="/api/admin/founder-services/export">
                <Button variant="outline">
                  <Download size={15} className="mr-1" />
                  Export CSV
                </Button>
              </a>
            </div>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Layers3}
          label="Active clients"
          value={activeClients.toLocaleString("en-GB")}
          hint="Open applications, approved work, and ongoing engagements."
        />
        <MetricCard
          icon={Clock3}
          label="Upcoming tasks"
          value={upcomingTasks.toLocaleString("en-GB")}
          hint="Audit, deadline, or call actions inside the next 7 days."
        />
        <MetricCard
          icon={CalendarDays}
          label="Next scheduled action"
          value={nextScheduledAction ? formatDateTime(nextScheduledAction.date) : "None set"}
          hint={
            nextScheduledAction
              ? `${nextScheduledAction.type} for ${nextScheduledAction.businessName}.`
              : "Add dates to start populating the manual calendar."
          }
        />
        <MetricCard
          icon={ReceiptText}
          label="Paid revenue"
          value={formatFounderServicePrice(totalRevenue)}
          hint="Confirmed founder-service revenue from paid requests."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Keep the pipeline clean without losing context.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
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
              <Label htmlFor="payment">Payment</Label>
              <Select id="payment" name="payment" defaultValue={paymentFilter ?? ""}>
                <option value="">Any payment state</option>
                {PAYMENT_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatFounderPaymentStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pipeline">Pipeline</Label>
              <Select id="pipeline" name="pipeline" defaultValue={pipelineFilter ?? ""}>
                <option value="">Any pipeline stage</option>
                {PIPELINE_FILTER_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatFounderClientStageLabel(stage)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <input type="hidden" name="calendar" value={calendarView} />
              <input type="hidden" name="date" value={toDateInputValue(calendarDate)} />
              <Button type="submit" variant="outline">
                Apply Filters
              </Button>
              {hasFilters ? (
                <Link href={buildReturnPath({ calendarView, date: toDateInputValue(calendarDate) })}>
                  <Button type="button" variant="ghost">
                    Clear
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline board</CardTitle>
            <CardDescription>
              Status updates are manual so Trevor stays in control of workload and timing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 xl:grid-cols-3">
              {pipelineGroups.map((group) => (
                <div key={group.stage} className="space-y-3">
                  <div className="rounded-2xl border border-border/80 bg-background/22 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                      {formatFounderClientStageLabel(group.stage)}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {group.items.length} client{group.items.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  {group.items.length ? (
                    group.items.map((request) => (
                      <div
                        key={request.id}
                        className={`rounded-[1.45rem] border p-4 ${pipelineCardTone(request.pipelineStage)}`}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-foreground">{request.businessName}</p>
                            <p className="mt-1 text-xs text-muted">
                              {request.fullName} · {request.service.title}
                            </p>
                          </div>
                          <div className="space-y-1 text-xs text-muted">
                            <p>{formatFounderPaymentStatusLabel(request.paymentStatus)}</p>
                            {request.auditStartAt ? <p>Audit start {formatDateTime(request.auditStartAt)}</p> : null}
                            {request.auditDueAt ? <p>Audit due {formatDateTime(request.auditDueAt)}</p> : null}
                            {request.callScheduledAt ? <p>Call {formatDateTime(request.callScheduledAt)}</p> : null}
                          </div>
                          <form action={updateFounderServiceRequestAction} className="space-y-3">
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <div className="space-y-2">
                              <Label htmlFor={`pipelineStage-${request.id}`}>Update stage</Label>
                              <Select
                                id={`pipelineStage-${request.id}`}
                                name="pipelineStage"
                                defaultValue={request.pipelineStage}
                              >
                                {PIPELINE_FILTER_OPTIONS.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {formatFounderClientStageLabel(stage)}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Button type="submit" variant="outline" size="sm">
                                Save
                              </Button>
                              <Link href={`/admin/founder-services/${request.id}`}>
                                <Button type="button" variant="ghost" size="sm">
                                  Open client
                                  <ArrowRight size={14} className="ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </form>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-background/18 px-4 py-6 text-sm text-muted">
                      No clients in this stage.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe catalog</CardTitle>
              <CardDescription>The three founder offers and their linked Stripe records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="rounded-[1.2rem] border border-border/80 bg-background/22 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{service.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatFounderServicePrice(service.price, service.currency)}
                        {service.billingType === "MONTHLY_RETAINER" ? "/month" : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={service.stripePriceId ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200" : "border-gold/35 bg-gold/10 text-gold"}>
                      {service.stripePriceId ? "Linked" : "Needs sync"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted">
                    <p>Product: {service.stripeProductId ?? "Not linked yet"}</p>
                    <p>Price: {service.stripePriceId ?? "Not linked yet"}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create discount code</CardTitle>
              <CardDescription>
                Generate a Stripe-backed code Trevor can apply to outreach, member offers, or manual exceptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createFounderServiceDiscountCodeAction} className="space-y-4">
                <input type="hidden" name="returnPath" value={returnPath} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input id="code" name="code" placeholder="INNER10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Internal name</Label>
                    <Input id="name" name="name" placeholder="Member discount" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Discount type</Label>
                    <Select id="type" name="type" defaultValue="PERCENT">
                      <option value="PERCENT">Percent</option>
                      <option value="FIXED">Fixed amount</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag">Tag</Label>
                    <Select id="tag" name="tag" defaultValue="MANUAL">
                      {DISCOUNT_TAG_OPTIONS.map((tag) => (
                        <option key={tag} value={tag}>
                          {formatFounderDiscountTagLabel(tag)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentOff">Percent off</Label>
                    <Input id="percentOff" name="percentOff" type="number" min="1" max="100" placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountOff">Fixed off in pence</Label>
                    <Input id="amountOff" name="amountOff" type="number" min="1" placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Usage limit</Label>
                    <Input id="usageLimit" name="usageLimit" type="number" min="1" placeholder="20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiry</Label>
                    <Input id="expiresAt" name="expiresAt" type="datetime-local" />
                  </div>
                </div>
                <Button type="submit" variant="outline">
                  Create Discount Code
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Manual calendar</CardTitle>
              <CardDescription>
                Daily and weekly view across audit starts, audit deadlines, and scheduled calls.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildReturnPath({
                  service: selectedServiceSlug || undefined,
                  payment: paymentFilter,
                  pipeline: pipelineFilter,
                  calendarView: "day",
                  date: toDateInputValue(calendarDate)
                })}
              >
                <Button variant={calendarView === "day" ? "default" : "outline"} size="sm">
                  Day
                </Button>
              </Link>
              <Link
                href={buildReturnPath({
                  service: selectedServiceSlug || undefined,
                  payment: paymentFilter,
                  pipeline: pipelineFilter,
                  calendarView: "week",
                  date: toDateInputValue(calendarDate)
                })}
              >
                <Button variant={calendarView === "week" ? "default" : "outline"} size="sm">
                  Week
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="service" value={selectedServiceSlug} />
            <input type="hidden" name="payment" value={paymentFilter ?? ""} />
            <input type="hidden" name="pipeline" value={pipelineFilter ?? ""} />
            <input type="hidden" name="calendar" value={calendarView} />
            <div className="space-y-2">
              <Label htmlFor="date">Anchor date</Label>
              <Input id="date" name="date" type="date" defaultValue={toDateInputValue(calendarDate)} />
            </div>
            <Button type="submit" variant="outline">
              Refresh Calendar
            </Button>
          </form>

          <div className="rounded-[1.3rem] border border-border/80 bg-background/20 px-4 py-3 text-sm text-muted">
            Showing {calendarView === "day" ? "one day" : "one week"} from {formatDate(calendarStart)}
            {" "}to {formatDate(calendarEnd)}.
          </div>

          {visibleScheduleItems.length ? (
            <div className="grid gap-3">
              {visibleScheduleItems.map((item) => (
                <Link
                  key={`${item.requestId}-${item.type}-${item.date.toISOString()}`}
                  href={`/admin/founder-services/${item.requestId}`}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 p-4 transition-colors hover:border-gold/30 hover:bg-background/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.businessName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.type} · {item.serviceTitle} · {item.fullName}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted">
                      <p>{formatDateTime(item.date)}</p>
                      <p className="mt-1">{formatFounderClientStageLabel(item.stage)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-background/18 px-4 py-8 text-sm text-muted">
              No founder work is scheduled in this window yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount code library</CardTitle>
          <CardDescription>Every Stripe-backed code available for founder work.</CardDescription>
        </CardHeader>
        <CardContent>
          {discountCodes.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {discountCodes.map((code) => (
                <div key={code.id} className="rounded-[1.3rem] border border-border/80 bg-background/22 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{code.code}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatFounderDiscountTagLabel(code.tag)}
                        {code.name ? ` · ${code.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={code.active ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200" : "border-border text-muted"}>
                      {code.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted">
                    <p>
                      Value:{" "}
                      {code.type === "PERCENT"
                        ? `${code.percentOff}%`
                        : formatFounderServicePrice(code.amountOff ?? 0, code.currency)}
                    </p>
                    <p>Usage: {code.timesRedeemed}{code.usageLimit ? ` / ${code.usageLimit}` : ""}</p>
                    <p>Expiry: {code.expiresAt ? formatDateTime(code.expiresAt) : "No expiry"}</p>
                    <p>Promotion code: {code.stripePromotionCodeId ?? "Not linked"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No founder discount codes have been created yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client list</CardTitle>
          <CardDescription>Quick access to every founder client record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Pipeline</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Pricing</th>
                  <th className="px-3 py-2 font-medium">Next date</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length ? (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b border-border/70 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.businessName}</p>
                        <p className="mt-1 text-xs text-muted">{request.fullName}</p>
                        <p className="mt-1 text-xs text-muted">{request.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{request.service.title}</p>
                        <p className="mt-1 text-xs text-muted">{request.helpSummary}</p>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {formatFounderClientStageLabel(request.pipelineStage)}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {formatFounderPaymentStatusLabel(request.paymentStatus)}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">
                          {formatFounderServicePrice(request.amount, request.currency)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {request.membershipDiscountPercent
                            ? `${request.membershipDiscountPercent}% member rate`
                            : "Standard rate"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {request.callScheduledAt
                          ? formatDateTime(request.callScheduledAt)
                          : request.auditDueAt
                            ? formatDateTime(request.auditDueAt)
                            : request.auditStartAt
                              ? formatDateTime(request.auditStartAt)
                              : "Not scheduled"}
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/founder-services/${request.id}`}>
                          <Button variant="outline" size="sm">
                            Open Client
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-muted">
                      No founder client records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
