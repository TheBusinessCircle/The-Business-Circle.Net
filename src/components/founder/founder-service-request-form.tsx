"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";

import { formatFounderServicePrice } from "@/lib/founder";
import type {
  FounderServiceModel,
  FounderServicePricingSummary,
  FounderServiceRequestFormPrefill,
} from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const BUSINESS_STAGE_VALUES = [
  "IDEA",
  "STARTUP",
  "GROWTH",
  "SCALE",
  "ESTABLISHED",
] as const;

type BusinessStageValue = (typeof BUSINESS_STAGE_VALUES)[number];

const founderServiceRequestSchema = z.object({
  serviceSlug: z.string().trim().min(3).max(120),
  sourcePage: z.string().trim().max(120).optional().or(z.literal("")),
  sourceSection: z.string().trim().max(120).optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  businessName: z.string().trim().min(2).max(140),
  businessStage: z.enum(BUSINESS_STAGE_VALUES),
  website: z.string().trim().min(3).max(2048),
  helpSummary: z.string().trim().min(10).max(2000),
});

type FounderServiceRequestFormValues = z.infer<
  typeof founderServiceRequestSchema
>;

type FounderRequestApiResponse = {
  ok?: boolean;
  url?: string;
  requestId?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<keyof FounderServiceRequestFormValues, string[]>
  >;
};

type FounderServiceRequestFormProps = {
  service: FounderServiceModel;
  prefill: FounderServiceRequestFormPrefill;
  pricing: FounderServicePricingSummary;
  notice?: string | null;
  sourcePage?: string | null;
  sourceSection?: string | null;
  experience?: "public" | "member";
};

const FOUNDER_FORM_FIELDS: Array<keyof FounderServiceRequestFormValues> = [
  "fullName",
  "email",
  "businessName",
  "businessStage",
  "website",
  "helpSummary",
];

const BUSINESS_STAGE_OPTIONS: Array<{
  value: BusinessStageValue;
  label: string;
}> = [
  { value: "IDEA", label: "Idea" },
  { value: "STARTUP", label: "Startup" },
  { value: "GROWTH", label: "Growth" },
  { value: "SCALE", label: "Scale" },
  { value: "ESTABLISHED", label: "Established" },
];

function billingSuffix(service: FounderServiceModel) {
  return service.billingType === "MONTHLY_RETAINER" ? " / month" : "";
}

export function FounderServiceRequestForm({
  service,
  prefill,
  pricing,
  sourcePage,
  sourceSection,
  notice,
  experience = "public",
}: FounderServiceRequestFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(notice ?? null);
  const [isPending, startTransition] = useTransition();
  const isMemberExperience = experience === "member";

  const form = useForm<FounderServiceRequestFormValues>({
    resolver: zodResolver(founderServiceRequestSchema),
    defaultValues: {
      serviceSlug: service.slug,
      sourcePage: sourcePage ?? "",
      sourceSection: sourceSection ?? "",
      fullName: prefill.fullName,
      email: prefill.email,
      businessName: prefill.businessName,
      businessStage: "GROWTH",
      website: prefill.website,
      helpSummary: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const payload = new FormData();

        for (const [key, value] of Object.entries(values)) {
          payload.set(key, String(value ?? ""));
        }
        payload.set("experience", experience);

        const response = await fetch("/api/founder-services/requests", {
          method: "POST",
          body: payload,
        });

        const result = (await response.json().catch(() => ({}))) as FounderRequestApiResponse;

        if (!response.ok || !result.ok || !result.url) {
          if (result.fieldErrors) {
            FOUNDER_FORM_FIELDS.forEach((fieldName) => {
              const message = result.fieldErrors?.[fieldName]?.[0];
              if (message) {
                form.setError(fieldName, {
                  type: "server",
                  message,
                });
              }
            });
          }

          setSubmitError(
            result.error ?? "Unable to submit your application right now.",
          );
          return;
        }

        window.location.assign(result.url);
      } catch {
        setSubmitError("Unable to submit your application right now.");
      }
    });
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <Card className="border-border/90 bg-card/72 shadow-panel-soft">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            {isMemberExperience ? "Member Request" : "Apply To Work With Me"}
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">
            {isMemberExperience ? "Start a member request" : "Start with a clear application"}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {isMemberExperience
              ? "Share the business context from inside your member workspace. I review the request, confirm the right next step, and keep the journey connected to your Circle account."
              : "I review every application myself. No booking system. No rushed fit call. Just enough context to understand the business properly before I confirm the next step."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  {...form.register("fullName")}
                />
                {form.formState.errors.fullName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  autoComplete="organization"
                  {...form.register("businessName")}
                />
                {form.formState.errors.businessName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.businessName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessStage">Business Stage</Label>
                <Select id="businessStage" {...form.register("businessStage")}>
                  {BUSINESS_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.businessStage ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.businessStage.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website Or Best Link</Label>
              <p className="text-sm text-muted">
                This can be your website, LinkedIn, Instagram, or wherever I
                should start.
              </p>
              <Input
                id="website"
                autoComplete="url"
                placeholder="https://"
                {...form.register("website")}
              />
              {form.formState.errors.website ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.website.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpSummary">What do you need help with?</Label>
              <Textarea
                id="helpSummary"
                rows={6}
                placeholder="Give me the business context, what you need, and what outcome you want."
                {...form.register("helpSummary")}
              />
              {form.formState.errors.helpSummary ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.helpSummary.message}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <div className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={isPending} className="group">
                {isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    {isMemberExperience ? "Start Member Request" : "Submit Application"}
                    <ArrowRight
                      size={16}
                      className="ml-2 transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </Button>

              <p className="text-sm text-muted">
                {isMemberExperience
                  ? "Member preferred rates are applied where eligible."
                  : "I review the business first, then confirm fit and timing."}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/72 shadow-panel-soft">
          <CardHeader>
            <Badge
              variant="outline"
              className="w-fit border-gold/35 bg-gold/12 text-gold"
            >
              {isMemberExperience ? "Selected Member Service" : "Selected Service"}
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">
              {service.title}
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              {service.shortDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
                Starting price
              </p>

              <p className="mt-2 font-display text-4xl text-gold">
                {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                {formatFounderServicePrice(
                  pricing.finalAmount,
                  service.currency,
                  billingSuffix(service),
                )}
              </p>

              {pricing.discountPercent ? (
                <p className="mt-2 text-sm text-muted">
                  Member rate applied from{" "}
                  {formatFounderServicePrice(
                    pricing.baseAmount,
                    service.currency,
                    billingSuffix(service),
                  )}
                  .
                </p>
              ) : null}

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isMemberExperience
                  ? "Your request stays connected to your Business Circle account. Checkout or follow-up steps use the same secure service flow."
                  : "No payment is taken at this stage. I review the application first, confirm fit, then send the right next step manually."}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                Included
              </p>

              <ul className="space-y-2">
                {service.includes.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <CardTitle>How this works</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-muted">
            {isMemberExperience ? (
              <>
                <p>1. Choose the support level that fits the next move.</p>
                <p>2. Share the member request context.</p>
                <p>3. I review fit, timing, and priority access.</p>
                <p>4. We confirm the cleanest route forward.</p>
              </>
            ) : (
              <>
                <p>1. You apply with the business context I need.</p>
                <p>2. I review the business and the fit.</p>
                <p>3. I confirm availability and the right next step.</p>
                <p>4. We start properly, with structure around the work.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
