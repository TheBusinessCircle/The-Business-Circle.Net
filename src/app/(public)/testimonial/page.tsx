import type { Metadata } from "next";
import {
  TestimonialCategory,
  TestimonialDisplayLocation
} from "@prisma/client";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import {
  GoogleReviewCta,
  PublicTestimonialRequestForm,
  ReviewRequestAnalytics
} from "@/components/testimonials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { getReviewSettings, getTestimonialCopyState } from "@/server/testimonials";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Share a Testimonial",
  description: "Share a testimonial for review by The Business Circle Network.",
  path: "/testimonial"
});

const CATEGORY_LABELS: Record<TestimonialCategory, string> = {
  BCN_EXPERIENCE: "The Business Circle Network",
  GROWTH_ARCHITECT: "Growth Architect",
  FOUNDER_AUDIT: "Founder Audit",
  STRATEGY_CALL: "Strategy call",
  COLLABORATION: "Collaboration",
  COMMUNITY: "Community",
  OTHER: "Other"
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function ThankYouState({
  testimonialId,
  testimonialText,
  settings
}: {
  testimonialId: string;
  testimonialText: string;
  settings: Awaited<ReturnType<typeof getReviewSettings>>;
}) {
  return (
    <Card className="mx-auto max-w-2xl border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/70">
      <CardHeader>
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/24 bg-primary/10 text-primary">
          <ShieldCheck size={20} />
        </div>
        <CardTitle className="font-display text-3xl">Thank you</CardTitle>
        <CardDescription className="text-base">
          Your testimonial has been received and will be reviewed before publication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleReviewCta
          testimonialId={testimonialId}
          testimonialText={testimonialText}
          enabled={settings.googleReviewEnabled}
          showButton={settings.showGoogleReviewButton}
          googleReviewUrl={settings.googleReviewUrl}
          label="Copy your words and leave them on Google"
          pendingMessage="The Google review link is being finalised. Your testimonial has still been received and will be reviewed before publication."
        />
      </CardContent>
    </Card>
  );
}

export default async function PublicTestimonialPage({ searchParams }: PageProps) {
  const [params, settings] = await Promise.all([searchParams, getReviewSettings()]);
  const submitted = firstValue(params.submitted) === "1";
  const testimonialId = firstValue(params.testimonialId);
  const error = firstValue(params.error);
  const source = firstValue(params.source);
  const campaign = firstValue(params.campaign);
  const referral = firstValue(params.ref);

  if (submitted) {
    const testimonial = testimonialId ? await getTestimonialCopyState(testimonialId) : null;
    return (
      <div className="public-page-stack">
        <ThankYouState
          testimonialId={testimonialId}
          testimonialText={testimonial?.testimonialText || testimonial?.quote || ""}
          settings={settings}
        />
      </div>
    );
  }

  if (!settings.publicTestimonialFormEnabled) {
    return (
      <div className="public-page-stack">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Testimonials are paused</CardTitle>
            <CardDescription>
              Public testimonial submissions are not open at the moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="public-page-stack">
      <ReviewRequestAnalytics source="public_testimonial" />
      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/60 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
              <MessageSquareQuote size={20} />
            </div>
            <p className="premium-kicker">Testimonial</p>
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
              Share your experience
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              If The Business Circle Network, a founder conversation, or a Growth Architect session
              has helped you gain clarity, confidence, direction, or a useful connection, your words
              can help another business owner understand what this environment is really about.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Please check the required fields and confirm the permission choices.
            </div>
          ) : null}

          <Card>
            <CardContent className="pt-6 sm:pt-7">
              <PublicTestimonialRequestForm
                category="GROWTH_ARCHITECT"
                displayLocation="ANYWHERE"
                categoryOptions={Object.values(TestimonialCategory).map((category) => ({
                  value: category,
                  label: CATEGORY_LABELS[category]
                }))}
                displayLocationOptions={[
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
                ]}
                submittedEmailRequired={false}
                googleReviewUrl={settings.googleReviewUrl}
                showGoogleReviewButton={settings.showGoogleReviewButton && Boolean(settings.googleReviewUrl)}
                trackingSource={source}
                campaign={campaign}
                referral={referral}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
