import { TestimonialStatus } from "@prisma/client";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import { submitMemberTestimonialAction } from "@/actions/testimonial.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

type MemberTestimonialSubmissionProps = {
  latestStatus?: TestimonialStatus | null;
  latestCreatedAt?: Date | null;
  feedback?: "sent" | "invalid" | "";
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
  feedback
}: MemberTestimonialSubmissionProps) {
  return (
    <Card className="border-primary/24 bg-gradient-to-br from-primary/8 via-card/78 to-card/70">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/24 bg-primary/10 text-primary">
              <MessageSquareQuote size={18} />
            </div>
            <CardTitle className="font-display text-2xl">Share your BCN experience</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              If The Business Circle has helped you gain clarity, make a connection, improve
              visibility, or feel less isolated as a business owner, you can leave a short
              testimonial for review.
            </CardDescription>
          </div>
          {latestStatus ? (
            <div className="shrink-0 space-y-2 text-left sm:text-right">
              <StatusPill status={latestStatus} />
              {latestCreatedAt ? (
                <p className="text-xs text-muted">Latest sent {formatDate(latestCreatedAt)}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback === "sent" ? (
          <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
            Thank you. Your testimonial has been sent for review.
          </div>
        ) : null}

        {feedback === "invalid" ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Please add a testimonial and confirm permission before submitting.
          </div>
        ) : null}

        <form action={submitMemberTestimonialAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testimonialQuote">Testimonial quote</Label>
            <Textarea
              id="testimonialQuote"
              name="quote"
              rows={5}
              required
              minLength={20}
              maxLength={1200}
              placeholder="Share what changed, what felt clearer, or what became easier inside BCN."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testimonialOutcome">Outcome, optional</Label>
            <Textarea
              id="testimonialOutcome"
              name="outcome"
              rows={3}
              maxLength={500}
              placeholder="For example: a useful connection, clearer positioning, stronger confidence, or a better decision."
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-background/25 px-4 py-3 text-sm leading-relaxed text-foreground">
            <input
              type="checkbox"
              name="permissionToDisplay"
              required
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            <span>
              I give permission for this testimonial to be reviewed and displayed by The Business
              Circle Network.
            </span>
          </label>

          <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck size={15} className="text-primary" />
              Display options
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="displayPublicName"
                  defaultChecked
                  className="h-4 w-4 rounded border-border bg-background accent-primary"
                />
                Show my name
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="displayBusinessName"
                  defaultChecked
                  className="h-4 w-4 rounded border-border bg-background accent-primary"
                />
                Show my business name
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="displayProfileImage"
                  className="h-4 w-4 rounded border-border bg-background accent-primary"
                />
                Show my profile image
              </label>
            </div>
          </div>

          <Button type="submit">Send for review</Button>
        </form>
      </CardContent>
    </Card>
  );
}
