import type { Metadata } from "next";
import {
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus
} from "@prisma/client";
import { CheckCircle2, Link2, MessageSquareQuote, Quote, Star, XCircle } from "lucide-react";
import {
  approveTestimonialAction,
  archiveTestimonialAction,
  createExternalTestimonialRequestAction,
  rejectTestimonialAction,
  sendTestimonialRequestEmailAction,
  updateAdminTestimonialAction
} from "@/actions/testimonial.actions";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { listAdminTestimonials } from "@/server/testimonials";

type AdminTestimonial = Awaited<ReturnType<typeof listAdminTestimonials>>[number];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Testimonials",
  description: "Review, approve, and manage testimonial proof for BCN and Growth Architect.",
  path: "/admin/testimonials"
});

const PROOF_TYPE_LABELS: Record<TestimonialProofType, string> = {
  BCN_MEMBER: "BCN Member",
  GROWTH_ARCHITECT: "Growth Architect",
  GENERAL: "General"
};

const STATUS_LABELS: Record<TestimonialStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived"
};

const SOURCE_TYPE_LABELS: Record<TestimonialSourceType, string> = {
  MEMBER_PROFILE: "Member profile",
  EXTERNAL_REQUEST: "External request",
  ADMIN_CREATED: "Admin created"
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseProofType(value: string): TestimonialProofType | undefined {
  return Object.values(TestimonialProofType).includes(value as TestimonialProofType)
    ? (value as TestimonialProofType)
    : undefined;
}

function parseStatus(value: string): TestimonialStatus | undefined {
  return Object.values(TestimonialStatus).includes(value as TestimonialStatus)
    ? (value as TestimonialStatus)
    : undefined;
}

function buildReturnPath(input: {
  proofType?: TestimonialProofType;
  status?: TestimonialStatus;
}) {
  const search = new URLSearchParams();

  if (input.proofType) {
    search.set("proofType", input.proofType);
  }
  if (input.status) {
    search.set("status", input.status);
  }

  const suffix = search.toString();
  return suffix ? `/admin/testimonials?${suffix}` : "/admin/testimonials";
}

function proofBadgeClass(proofType: TestimonialProofType) {
  if (proofType === "GROWTH_ARCHITECT") {
    return "border-gold/35 bg-gold/10 text-gold";
  }

  if (proofType === "BCN_MEMBER") {
    return "border-primary/35 bg-primary/10 text-primary";
  }

  return "border-border/80 bg-background/25 text-muted";
}

function requestStatusLabel(testimonial: AdminTestimonial) {
  if (testimonial.status === TestimonialStatus.APPROVED) {
    return "Approved";
  }

  if (testimonial.status === TestimonialStatus.REJECTED) {
    return "Rejected";
  }

  if (testimonial.status === TestimonialStatus.ARCHIVED) {
    return "Archived";
  }

  if (testimonial.sourceType === TestimonialSourceType.EXTERNAL_REQUEST) {
    return testimonial.quote.trim().length > 0 ? "Submitted" : "Sent";
  }

  return "Pending review";
}

function requestStatusBadgeClass(label: string) {
  if (label === "Approved") {
    return "border-primary/35 bg-primary/10 text-primary";
  }

  if (label === "Rejected") {
    return "border-destructive/35 bg-destructive/10 text-destructive";
  }

  if (label === "Submitted") {
    return "border-gold/35 bg-gold/10 text-gold";
  }

  if (label === "Sent") {
    return "border-silver/20 bg-background/25 text-silver";
  }

  return "border-border/80 bg-background/25 text-muted";
}

function feedbackMessage(input: { notice: string; error: string; token: string }) {
  const notices: Record<string, string> = {
    "request-created": "External testimonial request link created.",
    "request-email-sent": "Testimonial request email sent.",
    "testimonial-updated": "Testimonial updated.",
    "testimonial-approved": "Testimonial approved.",
    "testimonial-rejected": "Testimonial rejected.",
    "testimonial-archived": "Testimonial archived."
  };

  const errors: Record<string, string> = {
    "invalid-request": "The request link form was invalid.",
    "email-not-configured": "The request link was created, but email sending is not configured.",
    "email-send-failed": "The request link was created, but the email could not be sent.",
    "invalid-update": "The testimonial update was invalid.",
    "invalid-status": "The status update was invalid."
  };

  if (input.notice && notices[input.notice]) {
    return {
      tone: "success" as const,
      message: notices[input.notice],
      token: input.token
    };
  }

  if (input.error && errors[input.error]) {
    return {
      tone: "error" as const,
      message: errors[input.error],
      token: input.token
    };
  }

  return null;
}

function previewAuthorName(testimonial: AdminTestimonial) {
  if (testimonial.displayPublicName) {
    return testimonial.authorName;
  }

  return testimonial.proofType === "BCN_MEMBER"
    ? "Business Circle Member"
    : "Business Circle Client";
}

function AdminPublicPreview({ testimonial }: { testimonial: AdminTestimonial }) {
  if (
    testimonial.status !== TestimonialStatus.APPROVED ||
    !testimonial.permissionToDisplay ||
    testimonial.quote.trim().length === 0
  ) {
    return null;
  }

  const authorName = previewAuthorName(testimonial);
  const authorRole = testimonial.displayPublicName ? testimonial.authorRole : null;
  const businessName = testimonial.displayBusinessName ? testimonial.businessName : null;
  const businessWebsite = testimonial.displayBusinessName
    ? testimonial.businessWebsite
    : null;
  const rating =
    testimonial.rating && testimonial.rating >= 1
      ? Math.min(Math.max(Math.round(testimonial.rating), 1), 5)
      : 0;

  return (
    <div className="lg:col-span-2">
      <div className="rounded-[1.7rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/78 to-background/28 p-5 shadow-panel-soft">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
              Public preview
            </p>
            <p className="mt-1 text-xs text-muted">
              This is how the approved testimonial can appear publicly.
            </p>
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <Quote size={16} />
          </span>
        </div>

        {rating ? (
          <div className="mb-3 flex items-center gap-1 text-gold" aria-label={`${rating} out of 5`}>
            {Array.from({ length: rating }).map((_, index) => (
              <Star key={index} size={14} className="fill-current" />
            ))}
          </div>
        ) : null}

        <blockquote className="text-base leading-relaxed text-white/82">
          &quot;{testimonial.quote}&quot;
        </blockquote>

        {testimonial.outcome ? (
          <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Outcome</p>
            <p className="mt-2 text-sm leading-relaxed text-white/78">{testimonial.outcome}</p>
          </div>
        ) : null}

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="font-medium text-foreground">{authorName}</p>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs uppercase tracking-[0.08em] text-silver">
            {authorRole ? <span>{authorRole}</span> : null}
            {authorRole && businessName ? <span>/</span> : null}
            {businessName ? (
              businessWebsite ? (
                <a
                  href={businessWebsite}
                  rel="noreferrer"
                  target="_blank"
                  className="transition-colors hover:text-gold"
                >
                  {businessName}
                </a>
              ) : (
                <span>{businessName}</span>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AdminTestimonialsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const proofType = parseProofType(firstValue(params.proofType));
  const status = parseStatus(firstValue(params.status));
  const notice = firstValue(params.notice);
  const error = firstValue(params.error);
  const token = firstValue(params.token);
  const returnPath = buildReturnPath({ proofType, status });
  const feedback = feedbackMessage({ notice, error, token });

  const [testimonials, sentRequests] = await Promise.all([
    listAdminTestimonials({
      proofType,
      status,
      limit: 100
    }),
    listAdminTestimonials({
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      limit: 25
    })
  ]);

  const testimonialUrl = token ? `${SITE_CONFIG.url}/testimonial/${token}` : "";

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <MessageSquareQuote size={12} className="mr-1" />
            Testimonial engine
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Testimonials</CardTitle>
          <CardDescription className="mt-2 text-base">
            Review member proof, Growth Architect client proof, and general testimonials before
            anything is displayed publicly.
          </CardDescription>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card
          className={
            feedback.tone === "success"
              ? "border-primary/30 bg-primary/10"
              : "border-destructive/30 bg-destructive/10"
          }
        >
          <CardContent className="space-y-3 py-4">
            <p className={feedback.tone === "success" ? "text-primary" : "text-destructive"}>
              {feedback.message}
            </p>
            {feedback.token ? (
              <div className="rounded-2xl border border-border/80 bg-background/30 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted">Request link</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm text-foreground">{testimonialUrl}</p>
                  <CopyLinkButton value={testimonialUrl} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <CardTitle>Send testimonial request</CardTitle>
          <CardDescription>
            Send a secure testimonial submission link to a BCN member, Growth Architect client, or
            non-member contact. The request is created as pending and never publishes automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendTestimonialRequestEmailAction} className="grid gap-4 lg:grid-cols-3">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input id="recipientName" name="recipientName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input id="recipientEmail" name="recipientEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendProofType">Proof type</Label>
              <Select id="sendProofType" name="proofType" defaultValue="GROWTH_ARCHITECT">
                {Object.values(TestimonialProofType).map((type) => (
                  <option key={type} value={type}>
                    {PROOF_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="contextNote">Context note, optional</Label>
              <Textarea
                id="contextNote"
                name="contextNote"
                rows={3}
                maxLength={700}
                placeholder="A short note about the work, membership experience, or result you are asking them to reflect on."
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
              <Button type="submit">
                Send testimonial request
              </Button>
              <p className="text-sm text-muted">
                If email delivery is unavailable, the request link is still created for manual copy.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create external request link</CardTitle>
          <CardDescription>
            Use this for Growth Architect clients or non-member work. The submitted testimonial
            still lands as pending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createExternalTestimonialRequestAction} className="grid gap-4 lg:grid-cols-3">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="requestProofType">Proof type</Label>
              <Select id="requestProofType" name="proofType" defaultValue="GROWTH_ARCHITECT">
                {Object.values(TestimonialProofType).map((type) => (
                  <option key={type} value={type}>
                    {PROOF_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestAuthorName">Name, optional</Label>
              <Input id="requestAuthorName" name="authorName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestSubmittedEmail">Email, optional</Label>
              <Input id="requestSubmittedEmail" name="submittedEmail" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestAuthorRole">Role, optional</Label>
              <Input id="requestAuthorRole" name="authorRole" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestBusinessName">Business name, optional</Label>
              <Input id="requestBusinessName" name="businessName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestBusinessWebsite">Business website, optional</Label>
              <Input id="requestBusinessWebsite" name="businessWebsite" type="url" />
            </div>
            <div className="lg:col-span-3">
              <Button type="submit">
                <Link2 size={15} className="mr-2" />
                Create request link
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent requests</CardTitle>
          <CardDescription>
            Track testimonial request links created by admin action and copy the secure form link if
            email delivery needs a manual follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sentRequests.length ? (
            sentRequests.map((request) => {
              const requestLink = request.requestToken
                ? `${SITE_CONFIG.url}/testimonial/${request.requestToken}`
                : "";
              const statusLabel = requestStatusLabel(request);

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-border/80 bg-background/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={proofBadgeClass(request.proofType)}>
                          {PROOF_TYPE_LABELS[request.proofType]}
                        </Badge>
                        <Badge variant="outline" className={requestStatusBadgeClass(statusLabel)}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{request.authorName}</p>
                      <p className="text-sm text-muted">
                        {request.submittedEmail || "No recipient email stored"}
                      </p>
                      <p className="text-xs text-muted">
                        Created {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    {requestLink ? <CopyLinkButton value={requestLink} /> : null}
                  </div>
                  {requestLink ? (
                    <p className="mt-3 break-all rounded-xl border border-border/70 bg-background/25 px-3 py-2 text-xs text-muted">
                      {requestLink}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted">No testimonial request links have been created yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Filter by proof type or status. Public display still requires approved status and
            permission to display.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form method="GET" className="grid gap-3 md:grid-cols-[220px_220px_auto]">
            <div className="space-y-2">
              <Label htmlFor="proofType">Proof type</Label>
              <Select id="proofType" name="proofType" defaultValue={proofType ?? ""}>
                <option value="">All proof types</option>
                {Object.values(TestimonialProofType).map((type) => (
                  <option key={type} value={type}>
                    {PROOF_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status ?? ""}>
                <option value="">All statuses</option>
                {Object.values(TestimonialStatus).map((nextStatus) => (
                  <option key={nextStatus} value={nextStatus}>
                    {STATUS_LABELS[nextStatus]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">Apply</Button>
            </div>
          </form>

          <div className="space-y-4">
            {testimonials.length ? (
              testimonials.map((testimonial) => {
                const requestLink = testimonial.requestToken
                  ? `${SITE_CONFIG.url}/testimonial/${testimonial.requestToken}`
                  : "";
                const displayStatus = requestStatusLabel(testimonial);

                return (
                  <article
                    key={testimonial.id}
                    className="rounded-[24px] border border-silver/14 bg-background/18 p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={proofBadgeClass(testimonial.proofType)}>
                            {PROOF_TYPE_LABELS[testimonial.proofType]}
                          </Badge>
                          <Badge variant="outline" className={requestStatusBadgeClass(displayStatus)}>
                            {displayStatus}
                          </Badge>
                          <Badge variant="outline" className="text-muted">
                            {SOURCE_TYPE_LABELS[testimonial.sourceType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted">
                          Submitted {formatDateTime(testimonial.createdAt)}
                        </p>
                        {testimonial.member ? (
                          <p className="text-sm text-muted">
                            Member: {testimonial.member.name ?? testimonial.member.email}
                          </p>
                        ) : null}
                        {requestLink && testimonial.quote.trim().length === 0 ? (
                          <p className="break-all text-sm text-primary">Request link: {requestLink}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={approveTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <Button type="submit" size="sm">
                            <CheckCircle2 size={14} className="mr-1" />
                            Approve
                          </Button>
                        </form>
                        <form action={rejectTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <Button type="submit" size="sm" variant="outline">
                            <XCircle size={14} className="mr-1" />
                            Reject
                          </Button>
                        </form>
                        <form action={archiveTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <Button type="submit" size="sm" variant="ghost">
                            Archive
                          </Button>
                        </form>
                      </div>
                    </div>

                    <form action={updateAdminTestimonialAction} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="testimonialId" value={testimonial.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />

                      <div className="space-y-2">
                        <Label htmlFor={`authorName-${testimonial.id}`}>Author name</Label>
                        <Input
                          id={`authorName-${testimonial.id}`}
                          name="authorName"
                          defaultValue={testimonial.authorName}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`authorRole-${testimonial.id}`}>Author role</Label>
                        <Input
                          id={`authorRole-${testimonial.id}`}
                          name="authorRole"
                          defaultValue={testimonial.authorRole ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`businessName-${testimonial.id}`}>Business name</Label>
                        <Input
                          id={`businessName-${testimonial.id}`}
                          name="businessName"
                          defaultValue={testimonial.businessName ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`businessWebsite-${testimonial.id}`}>Business website</Label>
                        <Input
                          id={`businessWebsite-${testimonial.id}`}
                          name="businessWebsite"
                          type="url"
                          defaultValue={testimonial.businessWebsite ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`proofType-${testimonial.id}`}>Proof type</Label>
                        <Select
                          id={`proofType-${testimonial.id}`}
                          name="proofType"
                          defaultValue={testimonial.proofType}
                        >
                          {Object.values(TestimonialProofType).map((type) => (
                            <option key={type} value={type}>
                              {PROOF_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`status-${testimonial.id}`}>Status</Label>
                        <Select
                          id={`status-${testimonial.id}`}
                          name="status"
                          defaultValue={testimonial.status}
                        >
                          {Object.values(TestimonialStatus).map((nextStatus) => (
                            <option key={nextStatus} value={nextStatus}>
                              {STATUS_LABELS[nextStatus]}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor={`quote-${testimonial.id}`}>Quote</Label>
                        <Textarea
                          id={`quote-${testimonial.id}`}
                          name="quote"
                          rows={4}
                          defaultValue={testimonial.quote}
                          required
                        />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor={`outcome-${testimonial.id}`}>Outcome</Label>
                        <Textarea
                          id={`outcome-${testimonial.id}`}
                          name="outcome"
                          rows={3}
                          defaultValue={testimonial.outcome ?? ""}
                        />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor={`adminNotes-${testimonial.id}`}>Admin notes</Label>
                        <Textarea
                          id={`adminNotes-${testimonial.id}`}
                          name="adminNotes"
                          rows={3}
                          defaultValue={testimonial.adminNotes ?? ""}
                        />
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-background/25 p-4 lg:col-span-2">
                        <p className="mb-3 text-sm font-medium text-foreground">Consent and display</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="flex items-center gap-2 text-sm text-muted">
                            <input
                              type="checkbox"
                              name="permissionToDisplay"
                              defaultChecked={testimonial.permissionToDisplay}
                              className="h-4 w-4 rounded border-border bg-background accent-primary"
                            />
                            Permission to display
                          </label>
                          <label className="flex items-center gap-2 text-sm text-muted">
                            <input
                              type="checkbox"
                              name="displayPublicName"
                              defaultChecked={testimonial.displayPublicName}
                              className="h-4 w-4 rounded border-border bg-background accent-primary"
                            />
                            Show name
                          </label>
                          <label className="flex items-center gap-2 text-sm text-muted">
                            <input
                              type="checkbox"
                              name="displayBusinessName"
                              defaultChecked={testimonial.displayBusinessName}
                              className="h-4 w-4 rounded border-border bg-background accent-primary"
                            />
                            Show business
                          </label>
                          <label className="flex items-center gap-2 text-sm text-muted">
                            <input
                              type="checkbox"
                              name="displayProfileImage"
                              defaultChecked={testimonial.displayProfileImage}
                              className="h-4 w-4 rounded border-border bg-background accent-primary"
                            />
                            Show image
                          </label>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                          <p>Submitted email: {testimonial.submittedEmail || "None"}</p>
                          <p>Requested by: {testimonial.requestedByAdmin?.email || "None"}</p>
                          <p>Approved by: {testimonial.approvedByAdmin?.email || "None"}</p>
                          <p>
                            Approved at:{" "}
                            {testimonial.approvedAt ? formatDateTime(testimonial.approvedAt) : "Not approved"}
                          </p>
                        </div>
                      </div>

                      <AdminPublicPreview testimonial={testimonial} />

                      <div className="lg:col-span-2">
                        <Button type="submit" variant="outline">Save display fields</Button>
                      </div>
                    </form>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon={MessageSquareQuote}
                title="No testimonials match this view"
                description="Pending member and external testimonial submissions will appear here for review."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
