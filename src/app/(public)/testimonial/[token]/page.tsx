import type { Metadata } from "next";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
import { submitExternalTestimonialAction } from "@/actions/testimonial.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";
import { getExternalTestimonialRequestByToken } from "@/server/testimonials";

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

function ThankYouState() {
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
    </Card>
  );
}

function UnavailableState({ submitted }: { submitted?: boolean }) {
  if (submitted) {
    return <ThankYouState />;
  }

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
  const request = await getExternalTestimonialRequestByToken(token);

  if (submitted || !request || request.quote.trim().length > 0) {
    return (
      <div className="public-page-stack">
        <UnavailableState submitted={submitted} />
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
                    <Label htmlFor="submittedEmail">Email, optional</Label>
                    <Input
                      id="submittedEmail"
                      name="submittedEmail"
                      type="email"
                      defaultValue={request.submittedEmail ?? ""}
                    />
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
                    name="permissionToDisplay"
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
