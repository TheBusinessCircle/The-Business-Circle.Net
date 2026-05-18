import type { Metadata } from "next";
import {
  TestimonialCategory,
  TestimonialDisplayLocation
} from "@prisma/client";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import { submitExternalTestimonialAction } from "@/actions/testimonial.actions";
import { GoogleReviewCta } from "@/components/testimonials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const ref = firstValue(params.ref);

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
              <form action={submitExternalTestimonialAction} className="space-y-4">
                <input type="hidden" name="source" value={source} />
                <input type="hidden" name="campaign" value={campaign} />
                <input type="hidden" name="ref" value={ref} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Name</Label>
                    <Input id="authorName" name="authorName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submittedEmail">Email</Label>
                    <Input id="submittedEmail" name="submittedEmail" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Company</Label>
                    <Input id="businessName" name="businessName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorRole">Role</Label>
                    <Input id="authorRole" name="authorRole" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Website</Label>
                    <Input id="businessWebsite" name="businessWebsite" type="url" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submittedByLinkedIn">LinkedIn</Label>
                    <Input id="submittedByLinkedIn" name="submittedByLinkedIn" type="url" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Experience</Label>
                    <Select id="category" name="category" defaultValue="GROWTH_ARCHITECT">
                      {Object.values(TestimonialCategory).map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayLocation">Display preference</Label>
                    <Select id="displayLocation" name="displayLocation" defaultValue="ANYWHERE">
                      <option value={TestimonialDisplayLocation.BCN_HOME}>
                        The Business Circle Network
                      </option>
                      <option value={TestimonialDisplayLocation.FOUNDER_PAGE}>
                        Growth Architect / Founder Audit
                      </option>
                      <option value={TestimonialDisplayLocation.ANYWHERE}>Either is fine</option>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="rating">Rating, optional</Label>
                    <Select id="rating" name="rating" defaultValue="">
                      <option value="">No rating</option>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} out of 5
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote">Testimonial</Label>
                  <Textarea
                    id="quote"
                    name="quote"
                    rows={6}
                    required
                    minLength={20}
                    maxLength={1600}
                    placeholder="Share what changed, what became clearer, or what felt useful."
                  />
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Permission</p>
                  <div className="grid gap-3">
                    <label className="flex items-start gap-2 text-sm text-muted">
                      <input type="checkbox" name="permissionToFeaturePublicly" required className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary" />
                      I give permission for this testimonial to be featured publicly on The Business Circle Network.
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" name="permissionToUseName" className="h-4 w-4 rounded border-border bg-background accent-primary" />
                      I give permission for my name to be shown.
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" name="permissionToUseCompany" className="h-4 w-4 rounded border-border bg-background accent-primary" />
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
          </Card>
        </div>
      </section>
    </div>
  );
}
