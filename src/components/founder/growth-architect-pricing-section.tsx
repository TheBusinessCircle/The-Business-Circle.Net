import Link from "next/link";
import { ArrowRight, Compass, Eye, Target } from "lucide-react";
import { SectionHeading } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFounderServicePrice,
  getFounderServicePricing
} from "@/lib/founder";
import type {
  FounderPricingViewerContext,
  FounderServiceModel
} from "@/types";

type GrowthArchitectPricingSectionProps = {
  services: FounderServiceModel[];
  viewer: FounderPricingViewerContext | null;
};

const METHOD_STEPS = [
  {
    step: "Step 1",
    title: "Audit",
    description:
      "Review the business, website, offer, trust signals, customer journey, and missed growth opportunities.",
    icon: Eye
  },
  {
    step: "Step 2",
    title: "Strategy",
    description:
      "Identify what needs to improve, what should happen first, and where the biggest wins are.",
    icon: Compass
  },
  {
    step: "Step 3",
    title: "Action",
    description:
      "Turn everything into clear next steps, priorities, and implementation direction.",
    icon: Target
  }
] as const;

const TIER_NOTES: Record<
  string,
  {
    positioning: string;
    featured?: boolean;
  }
> = {
  "growth-architect-clarity-audit": {
    positioning:
      "Perfect for businesses that need clear direction before making bigger moves."
  },
  "growth-architect-growth-strategy": {
    positioning:
      "For businesses that want stronger positioning and a roadmap they can actually use.",
    featured: true
  },
  "growth-architect-full-growth-architect": {
    positioning:
      "For founders serious about building the strongest version of their business."
  }
};

const NEXT_STEPS = [
  "Choose the right pathway",
  "Share the business context",
  "Trev reviews the fit",
  "The next step is agreed"
] as const;

function buildGrowthArchitectHref(slug: string) {
  const params = new URLSearchParams({
    sourcePage: "Founder Page",
    sourceSection: "Growth Architect Pricing"
  });

  return `/founder/services/${slug}?${params.toString()}`;
}

export function GrowthArchitectPricingSection({
  services,
  viewer
}: GrowthArchitectPricingSectionProps) {
  if (!services.length) {
    return null;
  }

  return (
    <section id="growth-architect" className="space-y-8">
      <SectionHeading
        label="Work With Trev"
        title="Growth Architect services built around clear strategic steps"
        description="Trev works directly with selected business owners to uncover what is holding the business back, where the strongest opportunities are, and what should happen next."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {METHOD_STEPS.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="border-border/90 bg-card/70 shadow-panel-soft"
            >
              <CardHeader className="space-y-4">
                <Badge variant="outline" className="w-fit border-border text-muted">
                  {item.step}
                </Badge>
                <CardTitle className="flex items-center gap-3 font-display text-2xl">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                    <Icon size={18} />
                  </span>
                  {item.title}
                </CardTitle>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="rounded-3xl border border-border/80 bg-card/55 px-5 py-4 text-sm text-muted shadow-panel-soft sm:px-6">
        {viewer?.hasActiveSubscription ? (
          <p>
            Member pricing is reflected below where eligible for your account.
          </p>
        ) : (
          <p>
            <Link href="/membership" className="text-foreground hover:text-gold">
              Foundation members receive 10% off, Inner Circle members receive 20% off, and Core members receive 30% off.
            </Link>
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {services.map((service) => {
          const pricing = getFounderServicePricing(service, viewer);
          const notes = TIER_NOTES[service.slug];

          return (
            <Card
              key={service.id}
              className={
                notes?.featured
                  ? "border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/72 shadow-panel-soft"
                  : "border-border/90 bg-card/72 shadow-panel-soft"
              }
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">
                      Growth Architect Tier
                    </p>
                    <CardTitle className="mt-3 font-display text-3xl">
                      {service.title}
                    </CardTitle>
                  </div>
                  {notes?.featured ? (
                    <Badge
                      variant="outline"
                      className="border-gold/35 bg-gold/15 text-gold"
                    >
                      Most Popular
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {pricing.isApplicationOnly ? (
                    <p className="font-display text-3xl text-silver">Application / Enquiry</p>
                  ) : null}
                  {!pricing.isApplicationOnly && pricing.discountPercent ? (
                    <p className="text-sm text-muted">
                      Regular rate{" "}
                      {formatFounderServicePrice(pricing.baseAmount, service.currency)}
                    </p>
                  ) : null}
                  {!pricing.isApplicationOnly ? (
                    <p className="font-display text-4xl text-silver">
                      {formatFounderServicePrice(pricing.finalAmount, service.currency)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">
                      Structured application first. Scope and engagement are discussed after review.
                    </p>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-muted">
                  {service.shortDescription}
                </p>
                {notes?.positioning ? (
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {notes.positioning}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4">
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

                <Link href={buildGrowthArchitectHref(service.slug)}>
                  <Button size="lg" className="group w-full">
                    {service.ctaLabel}
                    <ArrowRight
                      size={16}
                      className="ml-2 transition-transform group-hover:translate-x-1"
                    />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {NEXT_STEPS.map((item, index) => (
          <div
            key={item}
            className="rounded-2xl border border-border/80 bg-card/55 px-4 py-4 shadow-panel-soft"
          >
            <p className="text-xs uppercase tracking-[0.08em] text-gold">
              {index + 1}
            </p>
            <p className="mt-2 text-sm text-foreground">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
