import type { Metadata } from "next";
import { TestimonialCategory, TestimonialDisplayLocation } from "@prisma/client";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import { submitExternalTestimonialAction } from "@/actions/testimonial.actions";
import { GoogleReviewCta } from "@/components/testimonials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import {
  getExternalTestimonialRequestByToken,
  getReviewSettings,
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

async function ThankYouState({ testimonialId }: { testimonialId: string }) {
  const [settings, testimonial] = await Promise.all([
    getReviewSettings(),
    testimonialId ? getTestimonialCopyState(testimonialId) : null
  ]);

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
        <GoogleReviewCta
          testimonialId={testimonialId}
          testimonialText={testimonial?.testimonialText || testimonial?.quote || ""}
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

export default async function ExternalTestimonialPage({ params, searchParams }: PageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const submitted = firstValue(query.submitted) === "1";
  const error = firstValue(query.error);
  const testimonialId = firstValue(query.testimonialId);
  const request = await getExternalTestimonialRequestByToken(token);

  if (submitted) {
    return (
      <div className="public-page-stack">
        <ThankYouState testimonialId={testimonialId} />
      </div>
    );
  }

  if (!request || request.quote.trim().length > 0) {
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
              This testimonial will be reviewed before any public display. You choose which name
              and business details can be shown.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Please check the form and confirm permission before submitting.
            </div>
          ) : null}

          <Card>
            <CardContent className="pt-6 sm:pt-7">
              <form action={submitExternalTestimonialAction} className="space-y-4">
                <input type="hidden" name="requestToken" value={token} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Name</Label>
                    <Input
                      id="authorName"
                      name="authorName"
                      required
                      defaultValue={request.authorName === "Client testimonial request" ? "" : request.authorName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorRole">Role</Label>
                    <Input id="authorRole" name="authorRole" defaultValue={request.authorRole ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input id="businessName" name="businessName" defaultValue={request.businessName ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Business website</Label>
                    <Input
                      id="businessWebsite"
                      name="businessWebsite"
                      type="url"
                      defaultValue={request.businessWebsite ?? ""}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="submittedEmail">Email</Label>
                    <Input
                      id="submittedEmail"
                      name="submittedEmail"
                      type="email"
                      required
                      defaultValue={request.submittedEmail ?? ""}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="submittedByLinkedIn">LinkedIn</Label>
                    <Input id="submittedByLinkedIn" name="submittedByLinkedIn" type="url" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Experience</Label>
                    <Select id="category" name="category" defaultValue={request.category}>
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
                    <Label htmlFor="displayLocation">Display preference</Label>
                    <Select id="displayLocation" name="displayLocation" defaultValue={request.displayLocation}>
                      <option value={TestimonialDisplayLocation.BCN_HOME}>The Business Circle Network</option>
                      <option value={TestimonialDisplayLocation.FOUNDER_PAGE}>Growth Architect / Founder Audit</option>
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
                  <Label htmlFor="quote">Testimonial quote</Label>
                  <Textarea
                    id="quote"
                    name="quote"
                    rows={5}
                    required
                    minLength={20}
                    maxLength={1600}
                    placeholder="Share what changed, what became clearer, or what the work helped you move through."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome, optional</Label>
                  <Textarea
                    id="outcome"
                    name="outcome"
                    rows={3}
                    maxLength={600}
                    placeholder="A result, decision, connection, or clarity point that came from the work."
                  />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-background/25 px-4 py-3 text-sm leading-relaxed text-foreground">
                  <input
                    type="checkbox"
                    name="permissionToFeaturePublicly"
                    required
                    className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
                  />
                  <span>
                    I confirm I am happy for this testimonial to be reviewed and potentially
                    displayed publicly on {SITE_CONFIG.name}.
                  </span>
                </label>

                <div className="rounded-2xl border border-border/80 bg-background/22 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Public display preference</p>
                  <div className="grid gap-3">
                    {[
                      ["full", "Use my name and business"],
                      ["first_business", "Use my first name and business"],
                      ["business_only", "Use business name only"],
                      ["initials_only", "Use initials only"]
                    ].map(([value, label], index) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-muted">
                        <input
                          type="radio"
                          name="displayPreference"
                          value={value}
                          defaultChecked={index === 0}
                          className="h-4 w-4 border-border bg-background accent-primary"
                        />
                        {label}
                      </label>
                    ))}
                    <input type="hidden" name="displayPublicName" value="true" />
                    <input type="hidden" name="displayBusinessName" value="true" />
                    <input type="hidden" name="permissionToUseName" value="true" />
                    <input type="hidden" name="permissionToUseCompany" value="true" />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        name="permissionToUseInMarketing"
                        className="h-4 w-4 rounded border-border bg-background accent-primary"
                      />
                      I give permission for this testimonial to be used in marketing material.
                    </label>
                    <span className="text-xs leading-relaxed text-muted">
                      Trevor reviews every testimonial before anything is published.
                    </span>
                  </div>
                </div>

                <Button type="submit">Send testimonial for review</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
