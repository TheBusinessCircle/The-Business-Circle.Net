import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFounderMembershipTierLabel,
  formatFounderPaymentStatusLabel,
  formatFounderServicePrice,
  isGrowthArchitectServiceSlug,
  formatFounderServiceStatusLabel
} from "@/lib/founder";
import { createPageMetadata } from "@/lib/seo";
import { getFounderServiceRequestSummary } from "@/server/founder";
import { notFound } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Founder Service Confirmation",
  description: "Your founder service request has been received.",
  path: "/founder/thanks"
});

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function FounderThanksPage({ searchParams }: PageProps) {
  const parsedSearchParams = await searchParams;
  const requestId = firstValue(parsedSearchParams.request);
  const request = requestId ? await getFounderServiceRequestSummary(requestId) : null;

  if (!request) {
    notFound();
  }

  const paid = request.paymentStatus === "PAID";
  const growthArchitectRequest = isGrowthArchitectServiceSlug(request.service.slug);
  const isApplicationOnly = request.service.intakeMode === "APPLICATION";

  return (
    <div className="space-y-8 pb-16">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/15 text-gold">
            Founder Services
          </Badge>
          <CardTitle className="mt-3 font-display text-4xl">
            {isApplicationOnly ? "Application received." : paid ? "You're booked in." : "Request received."}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {isApplicationOnly
              ? "Your application has been received. Trev now has the business context he needs to review fit and decide the next conversation."
              : paid
              ? growthArchitectRequest
                ? "Your Growth Architect request has been received. The details are now in the pipeline and the next step will be sent to you by email."
                : "Your payment was confirmed and Trev now has your business information ready for review."
              : growthArchitectRequest
                ? "Your Growth Architect request has been received. Payment is still pending, so the work has not moved into review yet."
                : "Your request has been saved. Payment is still pending, so Trev has not started work yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Service</p>
              <p className="mt-2 font-medium text-foreground">{request.service.title}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">
                {isApplicationOnly ? "Engagement" : "Final Price"}
              </p>
              {isApplicationOnly ? (
                <p className="mt-2 font-medium text-foreground">Application / Enquiry</p>
              ) : (
                <>
                  <p className="mt-2 font-medium text-foreground">
                    {formatFounderServicePrice(request.amount, request.currency)}
                  </p>
                  {request.membershipDiscountPercent ? (
                    <p className="mt-1 text-xs text-muted">
                      Regular rate {formatFounderServicePrice(request.baseAmount, request.currency)}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Payment Status</p>
              <p className="mt-2 font-medium text-foreground">
                {formatFounderPaymentStatusLabel(request.paymentStatus)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Service Status</p>
              <p className="mt-2 font-medium text-foreground">
                {formatFounderServiceStatusLabel(request.serviceStatus)}
              </p>
            </div>
          </div>

          {request.membershipDiscountPercent ? (
            <div className="rounded-2xl border border-gold/25 bg-gold/10 px-5 py-4 text-sm text-gold">
              {request.discountLabel} applied at {request.membershipDiscountPercent}% for{" "}
              {formatFounderMembershipTierLabel(request.membershipTierApplied)}.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-background/25 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 size={16} className="text-gold" />
                What happens next
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>1. Trev reviews the business information you submitted.</p>
                <p>2. He looks for what is missing, what is being overlooked, and what needs to happen next.</p>
                <p>
                  {isApplicationOnly
                    ? "3. If the fit is right, the next conversation is arranged with clearer structure."
                    : "3. The next step arrives with more clarity and less guesswork."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/25 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock3 size={16} className="text-gold" />
                Submitted for
              </p>
              <p className="mt-3 text-sm text-muted">
                {request.fullName}
              </p>
              {request.paidAt ? (
                <p className="mt-2 text-sm text-muted">
                  Payment confirmed and ready for review.
                </p>
              ) : isApplicationOnly ? (
                <p className="mt-2 text-sm text-muted">
                  No payment is taken at this stage. This route starts with review and fit.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Payment is still pending. If this does not look right, you can
                  return to the founder page and start again.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/founder">
              <Button>Back to Founder Page</Button>
            </Link>
            <Link href={`/founder/services/${request.service.slug}`}>
              <Button variant="outline">View Service Details</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
