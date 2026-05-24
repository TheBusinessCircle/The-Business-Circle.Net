import type { Metadata } from "next";
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType,
  TestimonialSource,
  TestimonialStatus
} from "@prisma/client";
import { CheckCircle2, Copy, MessageSquareQuote, Star, XCircle } from "lucide-react";
import {
  approveTestimonialAction,
  archiveTestimonialAction,
  markGoogleReviewConfirmedAction,
  markGoogleReviewIntentAction,
  markTestimonialCopiedToGoogleAction,
  rejectTestimonialAction,
  sendTestimonialRequestEmailAction,
  toggleTestimonialHighlightAction,
  updateAdminTestimonialAction,
  updateReviewSettingsAction
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
import {
  getReviewSettings,
  getTestimonialTrustStats,
  listAdminTestimonials
} from "@/server/testimonials";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Testimonials",
  description: "Review, approve, and manage testimonial proof for BCN and Growth Architect.",
  path: "/admin/testimonials"
});

const CATEGORY_LABELS: Record<TestimonialCategory, string> = {
  BCN_EXPERIENCE: "BCN experience",
  GROWTH_ARCHITECT: "Growth Architect",
  FOUNDER_AUDIT: "Founder Audit",
  STRATEGY_CALL: "Strategy call",
  COLLABORATION: "Collaboration",
  COMMUNITY: "Community",
  OTHER: "Other"
};

const LOCATION_LABELS: Record<TestimonialDisplayLocation, string> = {
  BCN_HOME: "BCN home",
  FOUNDER_PAGE: "Founder page",
  AUDIT_PAGE: "Audit page",
  MEMBERSHIP_PAGE: "Membership page",
  ANYWHERE: "Anywhere"
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseEnum<T extends string>(value: string, values: Record<string, T>) {
  return Object.values(values).includes(value as T) ? (value as T) : undefined;
}

function buildReturnPath(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const suffix = search.toString();
  return suffix ? `/admin/testimonials?${suffix}` : "/admin/testimonials";
}

function feedbackMessage(notice: string, error: string) {
  const notices: Record<string, string> = {
    "settings-updated": "Review settings updated.",
    "testimonial-updated": "Testimonial updated.",
    "testimonial-approved": "Testimonial approved.",
    "testimonial-rejected": "Testimonial rejected.",
    "testimonial-archived": "Testimonial archived.",
    "request-email-sent": "Non-member testimonial request sent.",
    "request-created": "Testimonial request created.",
    "google-intent-marked": "Google review click marked.",
    "google-copy-marked": "Copied to Google marked.",
    "google-confirmed": "Google review confirmed."
  };
  const errors: Record<string, string> = {
    "invalid-settings": "The settings form was invalid.",
    "invalid-update": "The testimonial update was invalid.",
    "invalid-status": "The status update was invalid.",
    "invalid-request": "The testimonial request form was invalid.",
    "email-not-configured": "Email sending is not configured.",
    "email-send-failed": "The testimonial request email could not be sent."
  };

  if (notice && notices[notice]) {
    return { tone: "success" as const, message: notices[notice] };
  }

  if (error && errors[error]) {
    return { tone: "error" as const, message: errors[error] };
  }

  return null;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
        <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function checkbox(name: string, checked: boolean, label: string) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 rounded border-border bg-background accent-primary"
      />
      {label}
    </label>
  );
}

export default async function AdminTestimonialsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const status = parseEnum(firstValue(params.status), TestimonialStatus);
  const category = parseEnum(firstValue(params.category), TestimonialCategory);
  const displayLocation = parseEnum(firstValue(params.displayLocation), TestimonialDisplayLocation);
  const source = parseEnum(firstValue(params.source), TestimonialSource);
  const rating = Number(firstValue(params.rating)) || undefined;
  const highlighted = firstValue(params.highlighted);
  const search = firstValue(params.search);
  const testimonialId = firstValue(params.testimonialId);
  const detailsOpen = firstValue(params.details) === "1";
  const returnPath = buildReturnPath({
    status,
    category,
    displayLocation,
    source,
    rating: rating ? String(rating) : undefined,
    highlighted,
    search,
    testimonialId,
    details: detailsOpen ? "1" : undefined
  });

  const [settings, stats, rawTestimonials] = await Promise.all([
    getReviewSettings(),
    getTestimonialTrustStats(),
    listAdminTestimonials({
      status,
      category,
      displayLocation,
      source,
      rating,
      highlighted: highlighted ? highlighted === "true" : undefined,
      search,
      limit: 150
    })
  ]);
  const testimonials = status
    ? rawTestimonials
    : rawTestimonials.filter((testimonial) => testimonial.status !== TestimonialStatus.ARCHIVED);
  const selectedTestimonial =
    testimonials.find((testimonial) => testimonial.id === testimonialId) ?? testimonials[0] ?? null;
  const selectedReturnPath = buildReturnPath({
    status,
    category,
    displayLocation,
    source,
    rating: rating ? String(rating) : undefined,
    highlighted,
    search,
    testimonialId: selectedTestimonial?.id,
    details: "1"
  });
  const collapsedReturnPath = buildReturnPath({
    status,
    category,
    displayLocation,
    source,
    rating: rating ? String(rating) : undefined,
    highlighted,
    search,
    testimonialId: selectedTestimonial?.id
  });
  const feedback = feedbackMessage(firstValue(params.notice), firstValue(params.error));
  const testimonialPageLink = `${SITE_CONFIG.url}/testimonial`;
  const reviewRequestUrl = testimonialPageLink;
  const reviewRequestMessage = `Hi, thank you again for supporting The Business Circle Network.

If you'd be happy to leave a quick review, I've made a simple page here:

${reviewRequestUrl}

You can write it once, submit it to the site, then copy and paste the same review into Google.

It would genuinely help build trust while BCN is still in its early stage.`;
  const googleReviewConfigured = Boolean(settings.googleReviewUrl?.trim());
  const memberTemplate = `Hi [Name],

I just wanted to say thank you for being part of the early stages of The Business Circle Network.

If the environment, conversations, insights, or support have helped you in any way, would you be open to sharing a few honest words about your experience?

You can leave it here:
${testimonialPageLink}

Your testimonial helps other business owners understand what BCN is really trying to build: a calmer, more trusted place for serious founders to connect, think clearly, and grow properly.

Thank you,
Trev`;
  const growthTemplate = `Hi [Name],

Thank you again for giving me the chance to look at your business.

If the audit, strategy, or advice gave you clarity or helped you see what to improve next, would you be open to leaving a short testimonial?

You can leave it here:
${testimonialPageLink}

Once the Google review link is live, you will also be able to copy the same words across so you do not need to write it twice.

Thank you,
Trev`;

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <MessageSquareQuote size={12} className="mr-1" />
            Trust proof
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Testimonials</CardTitle>
          <CardDescription className="mt-2 text-base">
            Review submissions, control Google review routing, and choose what can be shown publicly.
          </CardDescription>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.tone === "success" ? "border-primary/30 bg-primary/10" : "border-destructive/30 bg-destructive/10"}>
          <CardContent className="py-4">
            <p className={feedback.tone === "success" ? "text-primary" : "text-destructive"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Pending testimonials" value={stats.pending} />
        <StatCard label="Approved testimonials" value={stats.approved} />
        <StatCard label="Featured testimonials" value={stats.featured} />
        <StatCard label="Google review clicks" value={stats.googleClicks} />
        <StatCard label="Google confirmed" value={stats.googleConfirmed} />
      </div>

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <CardTitle>Review Request Link</CardTitle>
          <CardDescription>
            Send this link to someone when you want them to leave a review or testimonial. They can
            write it once, submit it to BCN for approval, then copy and paste the same review into Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/24 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted">Public review request URL</p>
            <p className="mt-2 break-all font-mono text-sm text-foreground">{reviewRequestUrl}</p>
          </div>
          {!googleReviewConfigured ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Google review link is not configured.
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Pending</p>
              <p className="mt-1 font-display text-2xl text-foreground">{stats.pending}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Approved</p>
              <p className="mt-1 font-display text-2xl text-foreground">{stats.approved}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Google clicks</p>
              <p className="mt-1 font-display text-2xl text-foreground">{stats.googleClicks}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton value={reviewRequestUrl} label="Copy link" />
            <CopyLinkButton value={reviewRequestMessage} label="Copy suggested message" />
          </div>
          <Textarea readOnly rows={8} value={reviewRequestMessage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review settings</CardTitle>
          <CardDescription>
            Paste the Google review URL here when Google Business Profile enables it. Empty or disabled settings keep public buttons safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateReviewSettingsAction} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="googleReviewUrl">Google Review URL</Label>
              <Input id="googleReviewUrl" name="googleReviewUrl" type="url" defaultValue={settings.googleReviewUrl ?? ""} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleReviewButtonLabel">Google button label</Label>
              <Input id="googleReviewButtonLabel" name="googleReviewButtonLabel" defaultValue={settings.googleReviewButtonLabel} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleReviewPendingMessage">Pending message</Label>
              <Input id="googleReviewPendingMessage" name="googleReviewPendingMessage" defaultValue={settings.googleReviewPendingMessage} />
            </div>
            <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/25 p-4 lg:col-span-2 md:grid-cols-2">
              {checkbox("googleReviewEnabled", settings.googleReviewEnabled, "Enable Google review routing")}
              {checkbox("showGoogleReviewButton", settings.showGoogleReviewButton, "Show Google review button publicly")}
              {checkbox("internalTestimonialsEnabled", settings.internalTestimonialsEnabled, "Internal testimonial submissions enabled")}
              {checkbox("publicTestimonialFormEnabled", settings.publicTestimonialFormEnabled, "Public testimonial form enabled")}
              {checkbox("requireAdminApproval", settings.requireAdminApproval, "Require admin approval")}
              {checkbox("homepageTestimonialsEnabled", settings.homepageTestimonialsEnabled, "Homepage testimonials enabled")}
              {checkbox("founderPageTestimonialsEnabled", settings.founderPageTestimonialsEnabled, "Founder page testimonials enabled")}
              {checkbox("auditPageTestimonialsEnabled", settings.auditPageTestimonialsEnabled, "Audit page testimonials enabled")}
            </div>
            <div className="lg:col-span-2">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader>
          <CardTitle>Send Non-Member Testimonial Request</CardTitle>
          <CardDescription>
            Send a secure public link to an audit client or Growth Architect recipient. They can
            submit once, choose display permissions, and copy the same words into Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendTestimonialRequestEmailAction} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="proofType" value={TestimonialProofType.GROWTH_ARCHITECT} />
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input id="recipientName" name="recipientName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input id="recipientEmail" name="recipientEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name, optional</Label>
              <Input id="companyName" name="companyName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditBusinessName">Audit/business name, optional</Label>
              <Input id="auditBusinessName" name="auditBusinessName" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="contextNote">Context/message, optional</Label>
              <Textarea
                id="contextNote"
                name="contextNote"
                rows={3}
                placeholder="Add a short note about the audit, strategy work, or area you would value feedback on."
              />
            </div>
            <div className="lg:col-span-2">
              <Button type="submit">Send non-member request</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Member request template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea readOnly rows={12} value={memberTemplate} />
            <CopyLinkButton value={memberTemplate} label="Copy template" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Growth Architect request template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea readOnly rows={12} value={growthTemplate} />
            <CopyLinkButton value={growthTemplate} label="Copy template" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Public display requires approved status and permission to feature publicly. Archived
            testimonials are hidden by default. Choose archived in the status filter to review them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form method="GET" className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {Object.values(TestimonialStatus).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
            <Select name="category" defaultValue={category ?? ""}>
              <option value="">All categories</option>
              {Object.values(TestimonialCategory).map((value) => (
                <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
              ))}
            </Select>
            <Select name="displayLocation" defaultValue={displayLocation ?? ""}>
              <option value="">All locations</option>
              {Object.values(TestimonialDisplayLocation).map((value) => (
                <option key={value} value={value}>{LOCATION_LABELS[value]}</option>
              ))}
            </Select>
            <Select name="source" defaultValue={source ?? ""}>
              <option value="">All sources</option>
              {Object.values(TestimonialSource).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
            <Select name="highlighted" defaultValue={highlighted}>
              <option value="">Highlighted or not</option>
              <option value="true">Highlighted</option>
              <option value="false">Not highlighted</option>
            </Select>
            <Input name="search" defaultValue={search} placeholder="Search name, company, email, text" />
            <div className="xl:col-span-6">
              <Button type="submit" variant="outline">Apply filters</Button>
            </div>
          </form>

          <div className="space-y-4">
            {testimonials.length ? (
              <>
                <form method="GET" className="rounded-2xl border border-border/80 bg-background/25 p-4">
                  {status ? <input type="hidden" name="status" value={status} /> : null}
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {displayLocation ? (
                    <input type="hidden" name="displayLocation" value={displayLocation} />
                  ) : null}
                  {source ? <input type="hidden" name="source" value={source} /> : null}
                  {rating ? <input type="hidden" name="rating" value={rating} /> : null}
                  {highlighted ? <input type="hidden" name="highlighted" value={highlighted} /> : null}
                  {search ? <input type="hidden" name="search" value={search} /> : null}
                  <input type="hidden" name="details" value="1" />
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="testimonialId">Open testimonial</Label>
                      <Select
                        id="testimonialId"
                        name="testimonialId"
                        defaultValue={selectedTestimonial?.id ?? ""}
                      >
                        {testimonials.map((testimonial) => (
                          <option key={testimonial.id} value={testimonial.id}>
                            {testimonial.authorName}
                            {testimonial.businessName ? ` / ${testimonial.businessName}` : ""}
                            {` / ${testimonial.status}`}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button type="submit" variant="outline">Open</Button>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Showing 1 of {testimonials.length} matching testimonials. Archived testimonials
                    are hidden unless the archived status filter is selected.
                  </p>
                </form>

                {selectedTestimonial && !detailsOpen ? (
                  <div className="rounded-[20px] border border-silver/14 bg-background/18 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedTestimonial.status}</Badge>
                          <Badge variant="outline">{CATEGORY_LABELS[selectedTestimonial.category]}</Badge>
                          <Badge variant="outline">
                            {LOCATION_LABELS[selectedTestimonial.displayLocation]}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground">{selectedTestimonial.authorName}</p>
                        <p className="text-sm text-muted">
                          {selectedTestimonial.businessName || "No company"} /{" "}
                          {selectedTestimonial.submittedEmail ||
                            selectedTestimonial.submittedByEmail ||
                            "No email"}
                        </p>
                      </div>
                      <form method="GET">
                        {status ? <input type="hidden" name="status" value={status} /> : null}
                        {category ? <input type="hidden" name="category" value={category} /> : null}
                        {displayLocation ? (
                          <input type="hidden" name="displayLocation" value={displayLocation} />
                        ) : null}
                        {source ? <input type="hidden" name="source" value={source} /> : null}
                        {rating ? <input type="hidden" name="rating" value={rating} /> : null}
                        {highlighted ? (
                          <input type="hidden" name="highlighted" value={highlighted} />
                        ) : null}
                        {search ? <input type="hidden" name="search" value={search} /> : null}
                        <input type="hidden" name="testimonialId" value={selectedTestimonial.id} />
                        <input type="hidden" name="details" value="1" />
                        <Button type="submit" variant="outline">Expand details</Button>
                      </form>
                    </div>
                  </div>
                ) : null}

                {selectedTestimonial && detailsOpen ? [selectedTestimonial].map((testimonial) => {
                const text = testimonial.testimonialText || testimonial.quote;
                const permissions = [
                  testimonial.permissionToFeaturePublicly ? "Feature" : null,
                  testimonial.permissionToUseName ? "Name" : null,
                  testimonial.permissionToUseCompany ? "Company" : null,
                  testimonial.permissionToUseImage ? "Image" : null,
                  testimonial.permissionToUseInMarketing ? "Marketing" : null
                ].filter(Boolean).join(", ") || "No public permissions";

                return (
                  <article key={testimonial.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{testimonial.status}</Badge>
                          <Badge variant="outline">{CATEGORY_LABELS[testimonial.category]}</Badge>
                          <Badge variant="outline">{LOCATION_LABELS[testimonial.displayLocation]}</Badge>
                          {testimonial.isHighlighted ? <Badge variant="premium">Highlighted</Badge> : null}
                        </div>
                        <p className="font-medium text-foreground">{testimonial.authorName}</p>
                        <p className="text-sm text-muted">{testimonial.businessName || "No company"} / {testimonial.submittedEmail || testimonial.submittedByEmail || "No email"}</p>
                        <p className="text-xs text-muted">Submitted {formatDateTime(testimonial.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form method="GET">
                          {status ? <input type="hidden" name="status" value={status} /> : null}
                          {category ? <input type="hidden" name="category" value={category} /> : null}
                          {displayLocation ? (
                            <input type="hidden" name="displayLocation" value={displayLocation} />
                          ) : null}
                          {source ? <input type="hidden" name="source" value={source} /> : null}
                          {rating ? <input type="hidden" name="rating" value={rating} /> : null}
                          {highlighted ? (
                            <input type="hidden" name="highlighted" value={highlighted} />
                          ) : null}
                          {search ? <input type="hidden" name="search" value={search} /> : null}
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <Button type="submit" size="sm" variant="outline">Collapse</Button>
                        </form>
                        <form action={approveTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={selectedReturnPath} />
                          <Button type="submit" size="sm"><CheckCircle2 size={14} className="mr-1" />Approve</Button>
                        </form>
                        <form action={rejectTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={selectedReturnPath} />
                          <Button type="submit" size="sm" variant="outline"><XCircle size={14} className="mr-1" />Reject</Button>
                        </form>
                        <form action={archiveTestimonialAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={collapsedReturnPath} />
                          <Button type="submit" size="sm" variant="ghost">Archive</Button>
                        </form>
                        <form action={toggleTestimonialHighlightAction}>
                          <input type="hidden" name="testimonialId" value={testimonial.id} />
                          <input type="hidden" name="returnPath" value={selectedReturnPath} />
                          <input type="hidden" name="enabled" value={testimonial.isHighlighted ? "false" : "true"} />
                          <Button type="submit" size="sm" variant="outline">{testimonial.isHighlighted ? "Unhighlight" : "Highlight"}</Button>
                        </form>
                      </div>
                    </div>

                    <form action={updateAdminTestimonialAction} className="grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="testimonialId" value={testimonial.id} />
                      <input type="hidden" name="returnPath" value={selectedReturnPath} />
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input name="authorName" defaultValue={testimonial.authorName} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input name="businessName" defaultValue={testimonial.businessName ?? ""} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input name="authorRole" defaultValue={testimonial.authorRole ?? ""} />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input name="businessWebsite" type="url" defaultValue={testimonial.businessWebsite ?? ""} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select name="category" defaultValue={testimonial.category}>
                          {Object.values(TestimonialCategory).map((value) => (
                            <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Display location</Label>
                        <Select name="displayLocation" defaultValue={testimonial.displayLocation}>
                          {Object.values(TestimonialDisplayLocation).map((value) => (
                            <option key={value} value={value}>{LOCATION_LABELS[value]}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select name="status" defaultValue={testimonial.status}>
                          {Object.values(TestimonialStatus).map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rating</Label>
                        <Select name="rating" defaultValue={testimonial.rating ? String(testimonial.rating) : ""}>
                          <option value="">No rating</option>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value} out of 5</option>
                          ))}
                        </Select>
                      </div>
                      <input type="hidden" name="proofType" value={testimonial.proofType} />
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Testimonial</Label>
                        <Textarea name="quote" rows={4} defaultValue={text} required />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Outcome</Label>
                        <Textarea name="outcome" rows={2} defaultValue={testimonial.outcome ?? ""} />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Admin notes</Label>
                        <Textarea name="adminNotes" rows={3} defaultValue={testimonial.adminNotes ?? ""} />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Rejection reason</Label>
                        <Textarea name="rejectionReason" rows={2} defaultValue={testimonial.rejectionReason ?? ""} />
                      </div>
                      <div className="rounded-2xl border border-border/80 bg-background/25 p-4 lg:col-span-2">
                        <p className="mb-3 text-sm font-medium text-foreground">Permissions: {permissions}</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {checkbox("permissionToDisplay", testimonial.permissionToDisplay, "Legacy display permission")}
                          {checkbox("permissionToFeaturePublicly", testimonial.permissionToFeaturePublicly, "Feature publicly")}
                          {checkbox("permissionToUseName", testimonial.permissionToUseName, "Use name")}
                          {checkbox("permissionToUseCompany", testimonial.permissionToUseCompany, "Use company")}
                          {checkbox("permissionToUseImage", testimonial.permissionToUseImage, "Use image")}
                          {checkbox("permissionToUseInMarketing", testimonial.permissionToUseInMarketing, "Use in marketing")}
                          {checkbox("allowDisplayName", testimonial.allowDisplayName, "Allow display name")}
                          {checkbox("allowDisplayCompany", testimonial.allowDisplayCompany, "Allow display company")}
                          {checkbox("allowDisplayRole", testimonial.allowDisplayRole, "Allow display role")}
                          {checkbox("allowDisplayTestimonial", testimonial.allowDisplayTestimonial, "Allow display testimonial")}
                          {checkbox("allowMarketingUse", testimonial.allowMarketingUse, "Allow marketing use")}
                          {checkbox("displayPublicName", testimonial.displayPublicName, "Legacy show name")}
                          {checkbox("displayBusinessName", testimonial.displayBusinessName, "Legacy show company")}
                          {checkbox("displayProfileImage", testimonial.displayProfileImage, "Legacy show image")}
                          {checkbox("isHighlighted", testimonial.isHighlighted, "Highlighted")}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:col-span-2">
                        <Button type="submit" variant="outline">Save testimonial</Button>
                        <CopyLinkButton value={text} label="Copy testimonial text" />
                      </div>
                    </form>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                      <form action={markGoogleReviewIntentAction}>
                        <input type="hidden" name="testimonialId" value={testimonial.id} />
                        <input type="hidden" name="returnPath" value={selectedReturnPath} />
                        <Button type="submit" size="sm" variant="outline"><Star size={14} className="mr-1" />Mark Google click</Button>
                      </form>
                      <form action={markTestimonialCopiedToGoogleAction}>
                        <input type="hidden" name="testimonialId" value={testimonial.id} />
                        <input type="hidden" name="returnPath" value={selectedReturnPath} />
                        <Button type="submit" size="sm" variant="outline"><Copy size={14} className="mr-1" />Mark copied</Button>
                      </form>
                      <form action={markGoogleReviewConfirmedAction}>
                        <input type="hidden" name="testimonialId" value={testimonial.id} />
                        <input type="hidden" name="returnPath" value={selectedReturnPath} />
                        <Button type="submit" size="sm" variant="outline">Confirm Google review</Button>
                      </form>
                      <p className="w-full text-xs text-muted">
                        Source: {testimonial.source} / {testimonial.sourceType}. Google intent: {testimonial.googleReviewIntentClickedAt ? formatDateTime(testimonial.googleReviewIntentClickedAt) : "None"}. Confirmed: {testimonial.googleReviewConfirmedAt ? formatDateTime(testimonial.googleReviewConfirmedAt) : "No"}.
                      </p>
                    </div>
                  </article>
                );
                }) : null}
              </>
            ) : (
              <EmptyState
                icon={MessageSquareQuote}
                title="No testimonials match this view"
                description="Pending member and public testimonial submissions will appear here for review."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
