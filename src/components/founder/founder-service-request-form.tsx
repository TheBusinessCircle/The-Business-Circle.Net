"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Paperclip } from "lucide-react";
import { FOUNDER_MARKETING_CHANNEL_OPTIONS } from "@/config/founder";
import {
  founderServiceRequestSchema,
  type FounderServiceRequestFormValues
} from "@/lib/validators";
import { formatFounderServicePrice } from "@/lib/founder";
import type {
  FounderServiceModel,
  FounderServicePricingSummary,
  FounderServiceRequestFormPrefill
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FounderRequestApiResponse = {
  ok?: boolean;
  url?: string;
  requestId?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof FounderServiceRequestFormValues, string[]>>;
};

type FounderServiceRequestFormProps = {
  service: FounderServiceModel;
  prefill: FounderServiceRequestFormPrefill;
  pricing: FounderServicePricingSummary;
  notice?: string | null;
  sourcePage?: string | null;
  sourceSection?: string | null;
};

const FOUNDER_FORM_FIELDS: Array<keyof FounderServiceRequestFormValues> = [
  "fullName",
  "email",
  "phone",
  "businessName",
  "website",
  "industry",
  "location",
  "yearsInBusiness",
  "employeeCount",
  "revenueRange",
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
  "otherSocial",
  "businessDescription",
  "targetAudience",
  "productsOrServices",
  "offers",
  "differentiator",
  "mainGoal",
  "biggestChallenge",
  "blockers",
  "pastAttempts",
  "successDefinition",
  "marketingChannels",
  "whyTrev"
] as const;

const REVENUE_OPTIONS = [
  { value: "PRE_REVENUE", label: "Pre-revenue" },
  { value: "UNDER_2000", label: "Under GBP2,000" },
  { value: "BETWEEN_2000_10000", label: "GBP2,000 - GBP10,000" },
  { value: "BETWEEN_10000_50000", label: "GBP10,000 - GBP50,000" },
  { value: "OVER_50000", label: "GBP50,000+" }
] as const;

function billingSuffix(service: FounderServiceModel) {
  return service.billingType === "MONTHLY_RETAINER" ? " / month" : "";
}

export function FounderServiceRequestForm({
  service,
  prefill,
  pricing,
  sourcePage,
  sourceSection,
  notice
}: FounderServiceRequestFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(notice ?? null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const isApplicationOnly = pricing.isApplicationOnly || service.intakeMode === "APPLICATION";

  const form = useForm<FounderServiceRequestFormValues>({
    resolver: zodResolver(founderServiceRequestSchema),
    defaultValues: {
      serviceSlug: service.slug,
      sourcePage: sourcePage ?? "",
      sourceSection: sourceSection ?? "",
      fullName: prefill.fullName,
      email: prefill.email,
      phone: prefill.phone,
      businessName: prefill.businessName,
      website: prefill.website,
      industry: prefill.industry,
      location: prefill.location,
      yearsInBusiness: "",
      employeeCount: "",
      revenueRange: "PRE_REVENUE",
      instagram: "",
      tiktok: "",
      facebook: "",
      linkedin: "",
      otherSocial: "",
      businessDescription: "",
      targetAudience: "",
      productsOrServices: "",
      offers: "",
      differentiator: "",
      mainGoal: "",
      biggestChallenge: "",
      blockers: "",
      pastAttempts: "",
      successDefinition: "",
      marketingChannels: [],
      whyTrev: ""
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("serviceSlug", service.slug);

        for (const [key, value] of Object.entries(values)) {
          if (key === "marketingChannels") {
            for (const item of value as string[]) {
              payload.append("marketingChannels", item);
            }
            continue;
          }

          payload.set(key, String(value ?? ""));
        }

        for (const file of selectedFiles) {
          payload.append("uploads", file);
        }

        const response = await fetch("/api/founder-services/requests", {
          method: "POST",
          body: payload
        });

        const result = (await response.json().catch(() => ({}))) as FounderRequestApiResponse;
        if (!response.ok || !result.ok || !result.url) {
          if (result.fieldErrors) {
            FOUNDER_FORM_FIELDS.forEach((fieldName) => {
              const message = result.fieldErrors?.[fieldName]?.[0];
              if (message) {
                form.setError(fieldName, {
                  type: "server",
                  message
                });
              }
            });
          }

          setSubmitError(
            result.error ??
              (isApplicationOnly
                ? "Unable to submit your application right now."
                : "Unable to continue to payment right now.")
          );
          return;
        }

        window.location.assign(result.url);
      } catch {
        setSubmitError(
          isApplicationOnly
            ? "Unable to submit your application right now."
            : "Unable to continue to payment right now."
        );
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/90 bg-card/78 shadow-panel-soft">
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            {isApplicationOnly ? "Founder Service Application" : "Founder Service Enquiry"}
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">
            Tell Trev about the business properly
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Give enough context for an honest review, a useful conversation, and the right next step for the business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={onSubmit}>
            <input type="hidden" {...form.register("serviceSlug")} />
            <input type="hidden" {...form.register("sourcePage")} />
            <input type="hidden" {...form.register("sourceSection")} />

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Contact details</h2>
                <p className="mt-1 text-sm text-muted">
                  Basic information so Trev knows who he is working with.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="founder-fullName">Full Name</Label>
                  <Input id="founder-fullName" disabled={isPending} {...form.register("fullName")} />
                  {form.formState.errors.fullName ? (
                    <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-email">Email Address</Label>
                  <Input id="founder-email" type="email" disabled={isPending} {...form.register("email")} />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-phone">Phone Number</Label>
                  <Input id="founder-phone" disabled={isPending} {...form.register("phone")} />
                  {form.formState.errors.phone ? (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Business snapshot</h2>
                <p className="mt-1 text-sm text-muted">
                  A clear snapshot of what the business is, where it is, and what
                  shape it is in.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="founder-businessName">Business Name</Label>
                  <Input id="founder-businessName" disabled={isPending} {...form.register("businessName")} />
                  {form.formState.errors.businessName ? (
                    <p className="text-xs text-destructive">{form.formState.errors.businessName.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-website">Business Website</Label>
                  <Input id="founder-website" disabled={isPending} {...form.register("website")} />
                  {form.formState.errors.website ? (
                    <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-industry">Industry / Niche</Label>
                  <Input id="founder-industry" disabled={isPending} {...form.register("industry")} />
                  {form.formState.errors.industry ? (
                    <p className="text-xs text-destructive">{form.formState.errors.industry.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-location">Business Location</Label>
                  <Input id="founder-location" disabled={isPending} {...form.register("location")} />
                  {form.formState.errors.location ? (
                    <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-yearsInBusiness">Years in Business</Label>
                  <Input id="founder-yearsInBusiness" disabled={isPending} {...form.register("yearsInBusiness")} />
                  {form.formState.errors.yearsInBusiness ? (
                    <p className="text-xs text-destructive">{form.formState.errors.yearsInBusiness.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founder-employeeCount">Number of Employees</Label>
                  <Input id="founder-employeeCount" disabled={isPending} {...form.register("employeeCount")} />
                  {form.formState.errors.employeeCount ? (
                    <p className="text-xs text-destructive">{form.formState.errors.employeeCount.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="founder-revenueRange">Monthly Revenue Range</Label>
                  <Select id="founder-revenueRange" disabled={isPending} {...form.register("revenueRange")}>
                    {REVENUE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  {form.formState.errors.revenueRange ? (
                    <p className="text-xs text-destructive">{form.formState.errors.revenueRange.message}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Social links</h2>
                <p className="mt-1 text-sm text-muted">
                  Add the places where your business is being seen online.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="founder-instagram">Instagram</Label>
                  <Input id="founder-instagram" disabled={isPending} {...form.register("instagram")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founder-tiktok">TikTok</Label>
                  <Input id="founder-tiktok" disabled={isPending} {...form.register("tiktok")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founder-facebook">Facebook</Label>
                  <Input id="founder-facebook" disabled={isPending} {...form.register("facebook")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founder-linkedin">LinkedIn</Label>
                  <Input id="founder-linkedin" disabled={isPending} {...form.register("linkedin")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="founder-otherSocial">Other</Label>
                  <Input id="founder-otherSocial" disabled={isPending} {...form.register("otherSocial")} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Business detail</h2>
                <p className="mt-1 text-sm text-muted">
                  Give Trev the real context behind the brand, the offer, and how
                  the business is currently positioned.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    id: "businessDescription",
                    label: "What does your business do?",
                    rows: 4
                  },
                  {
                    id: "targetAudience",
                    label: "Who is your target audience?",
                    rows: 4
                  },
                  {
                    id: "productsOrServices",
                    label: "What services or products do you offer?",
                    rows: 4
                  },
                  {
                    id: "differentiator",
                    label: "What makes your business different?",
                    rows: 4
                  },
                  {
                    id: "offers",
                    label: "What are your current offers?",
                    rows: 4
                  }
                ].map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`founder-${field.id}`}>{field.label}</Label>
                    <Textarea
                      id={`founder-${field.id}`}
                      rows={field.rows}
                      disabled={isPending}
                      {...form.register(field.id as keyof FounderServiceRequestFormValues)}
                    />
                    {form.formState.errors[field.id as keyof FounderServiceRequestFormValues] ? (
                      <p className="text-xs text-destructive">
                        {
                          form.formState.errors[field.id as keyof FounderServiceRequestFormValues]
                            ?.message as string
                        }
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Growth context</h2>
                <p className="mt-1 text-sm text-muted">
                  Trev works best when he can see the business honestly, not just
                  the polished surface.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    id: "mainGoal",
                    label: "What is your main goal right now?"
                  },
                  {
                    id: "biggestChallenge",
                    label: "What is your biggest challenge right now?"
                  },
                  {
                    id: "blockers",
                    label: "What do you feel is holding the business back?"
                  },
                  {
                    id: "pastAttempts",
                    label: "What have you already tried?"
                  },
                  {
                    id: "successDefinition",
                    label: "What would a successful result look like for you?"
                  }
                ].map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`founder-${field.id}`}>{field.label}</Label>
                    <Textarea
                      id={`founder-${field.id}`}
                      rows={4}
                      disabled={isPending}
                      {...form.register(field.id as keyof FounderServiceRequestFormValues)}
                    />
                    {form.formState.errors[field.id as keyof FounderServiceRequestFormValues] ? (
                      <p className="text-xs text-destructive">
                        {
                          form.formState.errors[field.id as keyof FounderServiceRequestFormValues]
                            ?.message as string
                        }
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Marketing channels</h2>
                <p className="mt-1 text-sm text-muted">
                  How are customers currently finding you?
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {FOUNDER_MARKETING_CHANNEL_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-foreground transition-colors hover:border-gold/30"
                  >
                    <input
                      type="checkbox"
                      value={option}
                      disabled={isPending}
                      className="h-4 w-4 rounded border-border bg-background accent-primary"
                      {...form.register("marketingChannels")}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.marketingChannels ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.marketingChannels.message as string}
                </p>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Optional uploads</h2>
                <p className="mt-1 text-sm text-muted">
                  Add anything that gives Trev better context: brand assets,
                  screenshots, pitch decks, business plans, or marketing docs.
                </p>
              </div>

              <div className="rounded-2xl border border-dashed border-gold/30 bg-gold/8 p-4">
                <Label htmlFor="founder-uploads" className="text-sm text-foreground">
                  Upload files
                </Label>
                <Input
                  id="founder-uploads"
                  type="file"
                  multiple
                  disabled={isPending}
                  className="mt-3 h-auto py-3"
                  onChange={(event) => {
                    setSelectedFiles(Array.from(event.target.files ?? []));
                  }}
                />
                <p className="mt-2 text-xs text-muted">
                  Up to 5 files. Supported: images, PDF, DOCX, XLSX, PPTX, TXT.
                </p>
                {selectedFiles.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedFiles.map((file) => (
                      <Badge
                        key={`${file.name}-${file.size}`}
                        variant="outline"
                        className="border-border text-muted normal-case tracking-normal"
                      >
                        <Paperclip size={11} className="mr-1" />
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="founder-whyTrev">Why do you want to work with Trev specifically?</Label>
              <Textarea
                id="founder-whyTrev"
                rows={5}
                disabled={isPending}
                {...form.register("whyTrev")}
              />
              {form.formState.errors.whyTrev ? (
                <p className="text-xs text-destructive">{form.formState.errors.whyTrev.message}</p>
              ) : null}
            </section>

            {submitError ? (
              <div className="rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm text-primary">
                {submitError}
              </div>
            ) : null}

            <Button
              disabled={isPending}
              type="submit"
              size="lg"
              className="group w-full sm:min-w-[220px] sm:w-auto"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {isApplicationOnly ? "Submitting application..." : "Starting payment..."}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {isApplicationOnly ? "Submit Application" : "Continue to Payment"}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
          <CardHeader>
            <CardDescription>{service.title}</CardDescription>
            <CardTitle className="font-display text-3xl">
              {isApplicationOnly
                ? "Application / Enquiry"
                : formatFounderServicePrice(
                    pricing.finalAmount,
                    service.currency,
                    billingSuffix(service)
                  )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isApplicationOnly ? (
              <div className="rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                Scope, fit, and commercial structure are handled after review. This pathway starts with context first.
              </div>
            ) : pricing.discountPercent ? (
              <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Regular rate</p>
                <p className="mt-2 text-sm text-muted">
                  {formatFounderServicePrice(
                    pricing.baseAmount,
                    service.currency,
                    billingSuffix(service)
                  )}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.08em] text-muted">Member rate</p>
                <p className="mt-2 font-display text-2xl text-gold">
                  {formatFounderServicePrice(
                    pricing.finalAmount,
                    service.currency,
                    billingSuffix(service)
                  )}
                </p>
              </div>
            ) : null}
            <p className="text-sm leading-relaxed text-muted">{service.shortDescription}</p>
            {pricing.appliedMessage ? (
              <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
                {pricing.appliedMessage}
              </div>
            ) : pricing.memberBenefitMessage ? (
              <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted">
                {pricing.memberBenefitMessage}
              </div>
            ) : null}
            <div className="space-y-2">
              {service.includes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>
              Trev uses this information to understand the business properly
              before the next step is agreed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            {isApplicationOnly ? (
              <>
                <p>1. You submit the business details.</p>
                <p>2. Trev reviews the context, fit, and current challenge.</p>
                <p>3. If aligned, the next conversation is arranged with more structure.</p>
                <p>4. Scope and engagement are confirmed after that review.</p>
              </>
            ) : (
              <>
                <p>1. You submit the business details.</p>
                <p>2. Payment confirms the booking for this service.</p>
                <p>3. Trev reviews the business context and the next best move.</p>
                <p>4. The work begins with more clarity and less guesswork.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
