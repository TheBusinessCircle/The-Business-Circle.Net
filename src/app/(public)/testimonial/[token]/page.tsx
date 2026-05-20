import type { Metadata } from "next";
import { TestimonialCategory, TestimonialDisplayLocation } from "@prisma/client";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import { PublicTestimonialRequestForm, PublicTestimonialThankYou } from "@/components/testimonials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import {
  getExternalTestimonialRequestByToken,
  externalTestimonialRequestIsAvailable,
  getTestimonialCopyState
} from "@/server/testimonials";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Share a Testimonial",
  description: "Share a testimonial for review by The Business Circle Network.",
  path: "/testimonial"
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function ThankYouState({
  testimonialId,
  testimonialText
}: {
  testimonialId: string;
  testimonialText: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/70">
      <CardHeader>
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/24 bg-primary/10 text-primary">
          <ShieldCheck size={20} />
        </div>
        <CardTitle className="font-display text-3xl">Thank you</CardTitle>
        <CardDescription className="text-base">
          Your testimonial has been sent for review. It will not be displayed publicly unless it is
          approved by an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PublicTestimonialThankYou
          testimonialId={testimonialId}
          testimonialText={testimonialText}
        />
      </CardContent>
    </Card>
  );
}

function UnavailableState() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-3xl">This testimonial link is unavailable</CardTitle>
        <CardDescription>
          The link may have already been completed, archived, or replaced. Please contact The
          Business Circle Network if you need a new request link.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

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

export default async function ExternalTestimonialPage({ params, searchParams }: PageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const submitted = firstValue(query.submitted) === "1";
  const error = firstValue(query.error);
  const testimonialId = firstValue(query.testimonialId);
  const request = await getExternalTestimonialRequestByToken(token);

  if (submitted) {
    const testimonial = testimonialId ? await getTestimonialCopyState(testimonialId) : null;

    if (!testimonial) {
      return (
        <div className="public-page-stack">
          <UnavailableState />
        </div>
      );
    }

    return (
      <div className="public-page-stack">
        <ThankYouState
          testimonialId={testimonialId}
          testimonialText={testimonial.testimonialText || testimonial.quote || ""}
        />
      </div>
    );
  }

  if (!request || !externalTestimonialRequestIsAvailable(request)) {
    return (
      <div className="public-page-stack">
        <UnavailableState />
      </div>
    );
  }

  return (
    <div className="public-page-stack">
      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/60 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
              <MessageSquareQuote size={20} />
            </div>
            <p className="premium-kicker">Testimonial request</p>
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
              Share your experience for review
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              This testimonial will be reviewed before any public display. You choose which name,
              role, and business details can be shown.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Please check the form and confirm permission before submitting.
            </div>
          ) : null}

          <Card>
            <CardContent className="pt-6 sm:pt-7">
              <PublicTestimonialRequestForm
                token={token}
                recipientName={request.recipientName ?? request.submittedByName}
                requestCompanyName={request.companyName ?? request.submittedByCompany}
                category={request.category}
                displayLocation={request.displayLocation}
                categoryOptions={categoryOptions}
                displayLocationOptions={displayLocationOptions}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
