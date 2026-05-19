import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialStatus
} from "@prisma/client";
import { ChevronDown, MessageSquareQuote } from "lucide-react";
import { GoogleReviewCta } from "@/components/testimonials";
import { MemberTestimonialSubmissionForm } from "@/components/profile/member-testimonial-submission-form";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
  googleReviewButtonLabel?: string;
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
  googleReviewButtonLabel = "Leave a Google review",
  googleReviewPendingMessage = "Google review link coming soon"
}: MemberTestimonialSubmissionProps) {
  const testimonialPanelDefaultOpen = feedback === "sent" || feedback === "invalid";
  const postSubmitTestimonialText = latestText ?? "";
  const categoryOptions = [
    {
      value: TestimonialCategory.BCN_EXPERIENCE,
      label: "The Business Circle Network"
    },
    {
      value: TestimonialCategory.GROWTH_ARCHITECT,
      label: "Growth Architect"
    },
    {
      value: TestimonialCategory.FOUNDER_AUDIT,
      label: "Founder Audit"
    },
    {
      value: TestimonialCategory.STRATEGY_CALL,
      label: "Strategy call"
    },
    {
      value: TestimonialCategory.COLLABORATION,
      label: "Collaboration"
    },
    {
      value: TestimonialCategory.COMMUNITY,
      label: "Community"
    },
    {
      value: TestimonialCategory.OTHER,
      label: "Other"
    }
  ];
  const displayLocationOptions = [
    {
      value: TestimonialDisplayLocation.BCN_HOME,
      label: "The Business Circle Network"
    },
    {
      value: TestimonialDisplayLocation.FOUNDER_PAGE,
      label: "Growth Architect / Founder Audit"
    },
    {
      value: TestimonialDisplayLocation.ANYWHERE,
      label: "Either is fine"
    }
  ];

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
                testimonialText={postSubmitTestimonialText}
                googleReviewUrl={googleReviewUrl}
                enabled={googleReviewEnabled}
                showButton={showGoogleReviewButton}
                label={googleReviewButtonLabel}
                pendingMessage={googleReviewPendingMessage}
              />
            </div>
          ) : null}

          {feedback === "invalid" ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Please add a testimonial and confirm permission before submitting.
            </div>
          ) : null}

          <MemberTestimonialSubmissionForm
            categoryOptions={categoryOptions}
            displayLocationOptions={displayLocationOptions}
            googleReviewUrl={googleReviewUrl}
            googleReviewEnabled={googleReviewEnabled}
            showGoogleReviewButton={showGoogleReviewButton}
            googleReviewButtonLabel={googleReviewButtonLabel}
            googleReviewPendingMessage={googleReviewPendingMessage}
            googleIntentTestimonialId={feedback === "sent" ? submittedTestimonialId : null}
          />
        </CardContent>
      </details>
    </Card>
  );
}
