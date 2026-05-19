import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialStatus
} from "@prisma/client";
import { ChevronDown, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { submitMemberTestimonialAction } from "@/actions/testimonial.actions";
import { GoogleReviewCta } from "@/components/testimonials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

type MemberTestimonialSubmissionProps = {
  latestStatus?: TestimonialStatus | null;
  latestCreatedAt?: Date | null;
  latestText?: string | null;
  submittedTestimonialId?: string | null;
  feedback?: "sent" | "invalid" | "";
  googleReviewUrl?: string | null;
  googleReviewEnabled?: boolean;
  showGoogleReviewButton?: boolean;
  googleReviewPendingMessage?: string;
};

const STATUS_LABELS: Record<TestimonialStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived"
};

function StatusPill({ status }: { status: TestimonialStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
        status === "APPROVED"
          ? "border-primary/35 bg-primary/10 text-primary"
          : status === "PENDING"
            ? "border-gold/35 bg-gold/10 text-gold"
            : "border-border/80 bg-background/30 text-muted"
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function MemberTestimonialSubmission({
  latestStatus,
  latestCreatedAt,
  latestText,
  submittedTestimonialId,
  feedback,
  googleReviewUrl,
  googleReviewEnabled = false,
  showGoogleReviewButton = false,
  googleReviewPendingMessage = "Google review link coming soon"
}: MemberTestimonialSubmissionProps) {
  const testimonialPanelDefaultOpen = feedback === "sent" || feedback === "invalid";

  return (
    <Card className="overflow-hidden border-primary/24 bg-gradient-to-br from-primary/8 via-card/78 to-card/70">
      <details className="group" open={testimonialPanelDefaultOpen}>
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/80 sm:p-6 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/24 bg-primary/10 text-primary shadow-inner-surface">
                <MessageSquareQuote size={18} />
              </span>
              <div className="min-w-0">
                <CardTitle className="font-display text-lg sm:text-xl">
                  Share your experience
                </CardTitle>
                <CardDescription className="mt-1 truncate">
                  Leave a review when BCN has helped you gain clarity, confidence, or a useful connection.
                </CardDescription>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
              {latestStatus ? (
                <div className="min-w-0 shrink space-y-1 text-left sm:shrink-0 sm:text-right">
                  <StatusPill status={latestStatus} />
                  {latestCreatedAt ? (
                    <p className="truncate text-xs text-muted">
                      Latest sent {formatDate(latestCreatedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/24 bg-background/28 text-primary shadow-inner-surface transition-colors group-open:bg-primary/10">
                <span className="sr-only">Toggle testimonial form</span>
                <ChevronDown
                  size={18}
                  className="transition-transform duration-200 group-open:rotate-180"
                />
              </span>
            </div>
          </div>
        </summary>

        <CardContent className="space-y-4 border-t border-primary/16 p-5 pt-4 sm:p-6 sm:pt-5">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            If The Business Circle Network, a founder conversation, or a Growth Architect session
            has helped you gain clarity, confidence, direction, or a useful connection, your
            words can help another business owner understand what this environment is really
            about.
          </p>

          {feedback === "sent" ? (
            <div className="space-y-4 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
              <p>Thank you. Your testimonial has been sent for review.</p>
              <GoogleReviewCta
                testimonialId={submittedTestimonialId}
                testimonialText={latestText ?? ""}
                googleReviewUrl={googleReviewUrl}
                enabled={googleReviewEnabled}
                showButton={showGoogleReviewButton}
                label="Copy your words and leave them on Google"
                pendingMessage={googleReviewPendingMessage}
              />
            </div>
          ) : null}

          {feedback === "invalid" ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Please add a testimonial and confirm permission before submitting.
            </div>
          ) : null}

          <form action={submitMemberTestimonialAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testimonialQuote">Testimonial</Label>
              <Textarea
                id="testimonialQuote"
                name="quote"
                rows={5}
                required
                minLength={20}
                maxLength={1200}
                placeholder="Share what changed, what felt clearer, or what became easier."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="testimonialCategory">Experience</Label>
                <Select id="testimonialCategory" name="category" defaultValue="BCN_EXPERIENCE">
                  <option value={TestimonialCategory.BCN_EXPERIENCE}>The Business Circle Network</option>
                  <option value={TestimonialCategory.GROWTH_ARCHITECT}>Growth Architect</option>
                  <option value={TestimonialCategory.FOUNDER_AUDIT}>Founder Audit</option>
                  <option value={TestimonialCategory.STRATEGY_CALL}>Strategy call</option>
                  <option value={TestimonialCategory.COLLABORATION}>Collaboration</option>
                  <option value={TestimonialCategory.COMMUNITY}>Community</option>
                  <option value={TestimonialCategory.OTHER}>Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonialDisplayLocation">Display preference</Label>
                <Select id="testimonialDisplayLocation" name="displayLocation" defaultValue="ANYWHERE">
                  <option value={TestimonialDisplayLocation.BCN_HOME}>The Business Circle Network</option>
                  <option value={TestimonialDisplayLocation.FOUNDER_PAGE}>Growth Architect / Founder Audit</option>
                  <option value={TestimonialDisplayLocation.ANYWHERE}>Either is fine</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonialRating">Rating, optional</Label>
                <Select id="testimonialRating" name="rating" defaultValue="">
                  <option value="">No rating</option>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} out of 5
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="submittedByCompany">Company, optional</Label>
                <Input id="submittedByCompany" name="submittedByCompany" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submittedByRole">Role, optional</Label>
                <Input id="submittedByRole" name="submittedByRole" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submittedByWebsite">Website, optional</Label>
                <Input id="submittedByWebsite" name="submittedByWebsite" type="url" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="submittedByLinkedIn">LinkedIn, optional</Label>
                <Input id="submittedByLinkedIn" name="submittedByLinkedIn" type="url" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck size={15} className="text-primary" />
                Permission
              </div>
              <div className="grid gap-3">
                <label className="flex items-start gap-2 text-sm text-muted">
                  <input type="checkbox" name="permissionToFeaturePublicly" required className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary" />
                  I give permission for this testimonial to be featured publicly on The Business Circle Network.
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="permissionToUseName" defaultChecked className="h-4 w-4 rounded border-border bg-background accent-primary" />
                  I give permission for my name to be shown.
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="permissionToUseCompany" defaultChecked className="h-4 w-4 rounded border-border bg-background accent-primary" />
                  I give permission for my company name to be shown.
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="permissionToUseImage" className="h-4 w-4 rounded border-border bg-background accent-primary" />
                  I give permission for my profile image/logo to be shown.
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="permissionToUseInMarketing" className="h-4 w-4 rounded border-border bg-background accent-primary" />
                  I give permission for this testimonial to be used in marketing material.
                </label>
              </div>
            </div>

            <Button type="submit">Submit testimonial</Button>
          </form>
        </CardContent>
      </details>
    </Card>
  );
}
