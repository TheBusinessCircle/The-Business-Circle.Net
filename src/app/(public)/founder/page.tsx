import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import {
  ArrowRight,
  Compass,
  Eye,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import {
  CTASection,
  JsonLd,
  SectionHeading
} from "@/components/public";
import { GrowthArchitectPricingSection } from "@/components/founder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isGrowthArchitectServiceSlug } from "@/lib/founder";
import { createPageMetadata } from "@/lib/seo";
import { buildFounderSchema } from "@/lib/structured-data";
import { listActiveFounderServices, formatFounderServicePrice } from "@/server/founder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Trev Newton | Business Growth Architect",
  description:
    "Meet Trev Newton, Business Growth Architect, helping businesses find what is missing, strengthen trust, and move with clearer next steps.",
  path: "/founder"
});

const methodIcons = [Eye, ShieldCheck, TrendingUp] as const;
const blindSpotIcons = [Eye, ShieldCheck, Target] as const;
const approachIcons = [Compass, Sparkles, TrendingUp] as const;

function billingSuffix(billingType: "ONE_TIME" | "MONTHLY_RETAINER") {
  return billingType === "MONTHLY_RETAINER" ? " / month" : "";
}

export default async function FounderPage() {
  const [allServices, session] = await Promise.all([
    listActiveFounderServices(),
    auth()
  ]);
  const pricingViewer = session?.user
    ? {
        role: session.user.role,
        membershipTier: session.user.membershipTier,
        hasActiveSubscription: session.user.hasActiveSubscription
      }
    : null;
  const growthArchitectServices = allServices.filter((service) =>
    isGrowthArchitectServiceSlug(service.slug)
  );
  const services = allServices.filter(
    (service) => !isGrowthArchitectServiceSlug(service.slug)
  );

  return (
    <div className="space-y-16 pb-16">
      <JsonLd data={buildFounderSchema()} />

      <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/55 p-8 shadow-panel sm:p-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-15" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-gold/20 blur-[110px]" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative space-y-6">
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              Trev Newton | Business Growth Architect
            </Badge>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Strategic clarity for businesses that need to see what others miss
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-muted">
                {TREV_FOUNDER_CONTENT.title}
              </p>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-muted">
              {TREV_FOUNDER_CONTENT.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#services">
                <Button size="lg" className="group">
                  View Service Pathways
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact The Team
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <Card className="h-full border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-gold/35 bg-background/35 font-display text-3xl text-silver shadow-inner-surface">
                      TN
                    </div>
                    <div className="space-y-2">
                      <p className="font-display text-2xl text-foreground">Trev Newton</p>
                      <p className="text-sm text-muted">{TREV_FOUNDER_CONTENT.role}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-gold">Founder mission</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {TREV_FOUNDER_CONTENT.mission}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-background/25 p-4">
                    <p className="text-sm leading-relaxed text-muted">
                      &ldquo;{TREV_FOUNDER_CONTENT.quote}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Method",
                      value: "Visibility"
                    },
                    {
                      label: "Approach",
                      value: "Calm + Clear"
                    },
                    {
                      label: "Focus",
                      value: "Next Steps"
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                    >
                      <p className="font-display text-xl text-silver">{item.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Approach"
          title="A calm, strategic way of helping businesses move forward"
          description="Trev's work is designed to create clarity, reduce noise, and focus attention on the changes that will genuinely make a difference."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {TREV_FOUNDER_CONTENT.approach.map((item, index) => {
            const Icon = approachIcons[index] ?? Sparkles;

            return (
              <article key={item.title} className="public-panel interactive-card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <Icon size={18} />
                </span>
                <h2 className="mt-4 font-display text-2xl text-foreground">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/90 bg-card/70 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
              Philosophy
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">
              What Trev believes about better growth
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Clear strategy, stronger trust, and better decisions tend to outperform noise and pressure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TREV_FOUNDER_CONTENT.about.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
            <div className="grid gap-3 pt-2">
              {TREV_FOUNDER_CONTENT.philosophy.map((item) => (
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

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/15 text-gold">
              What Trev Sees
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">
              The things many businesses overlook
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              The point is to identify the missing pieces that are quietly affecting trust, growth, and momentum.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TREV_FOUNDER_CONTENT.blindSpots.map((item, index) => {
              const Icon = blindSpotIcons[index] ?? Target;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-border/80 bg-background/25 p-5"
                >
                  <p className="flex items-center gap-3 font-display text-xl text-foreground">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon size={17} />
                    </span>
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Strategic Lens"
          title="Visibility. Trust. Expansion."
          description="These three lenses help Trev assess how a business is being seen, how trust is being built, and where the next level of growth is most likely to come from."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {TREV_FOUNDER_CONTENT.vibeMethod.map((item, index) => {
            const Icon = methodIcons[index] ?? Sparkles;

            return (
              <Card
                key={item.title}
                className="border-border/90 bg-card/70 shadow-panel-soft transition-transform duration-200 hover:-translate-y-1"
              >
                <CardHeader>
                  <Badge variant="outline" className="w-fit border-border text-muted">
                    {item.step}
                  </Badge>
                  <CardTitle className="mt-3 flex items-center gap-3 font-display text-2xl">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon size={18} />
                    </span>
                    {item.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-foreground"
                    >
                      {point}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <GrowthArchitectPricingSection
        services={growthArchitectServices}
        viewer={pricingViewer}
      />

      <section className="space-y-8">
        <SectionHeading
          label="Who Trev Helps"
          title="Businesses that want clearer direction and stronger trust"
          description={TREV_FOUNDER_CONTENT.audiencesIntro}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TREV_FOUNDER_CONTENT.audiences.map((item) => (
            <Card key={item.title} className="border-border/90 bg-card/65 shadow-panel-soft">
              <CardContent className="space-y-3 p-5">
                <p className="font-display text-xl text-foreground">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="services" className="space-y-8">
        <SectionHeading
          label="Service Pathways"
          title="Different levels of support depending on what the business needs"
          description={TREV_FOUNDER_CONTENT.servicePathwaysIntro}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="border-border/90 bg-card/72 shadow-panel-soft transition-transform duration-200 hover:-translate-y-1"
            >
              <CardHeader>
                <CardTitle className="font-display text-2xl">{service.title}</CardTitle>
                <CardDescription className="mt-2 text-base">
                  {service.shortDescription}
                </CardDescription>
                {service.intakeMode === "APPLICATION" ? (
                  <p className="pt-2 font-display text-3xl text-silver">Application / Enquiry</p>
                ) : (
                  <p className="pt-2 font-display text-3xl text-silver">
                    {formatFounderServicePrice(
                      service.price,
                      service.currency,
                      billingSuffix(service.billingType)
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
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
                <Link href={`/founder/services/${service.slug}`}>
                  <Button className="w-full" size="lg">
                    {service.ctaLabel}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/90 bg-card/70 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/10 text-gold">
              The Network Connection
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">
              {TREV_FOUNDER_CONTENT.networkConnectionTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted">
            {TREV_FOUNDER_CONTENT.networkConnectionCopy.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
          <CardContent className="flex h-full flex-col justify-center gap-5 p-6 sm:p-8">
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/15 text-gold">
              Start With Clarity
            </Badge>
            <h2 className="font-display text-3xl text-foreground">
              If something feels unclear, under-trusted, or under-performing, that is usually where the work starts
            </h2>
            <p className="text-base leading-relaxed text-muted">
              Trev&rsquo;s role is to help businesses see the real picture more clearly and move toward the next right step with more confidence.
            </p>
          </CardContent>
        </Card>
      </section>

      <CTASection
        title="Explore the right pathway for your business"
        description="Start with a founder service if you need direct strategic focus, or join The Business Circle if you want an ongoing ecosystem around your growth."
        primaryAction={{ href: "/founder#services", label: "View Service Pathways" }}
        secondaryAction={{ href: "/membership", label: "Join The Business Circle", variant: "outline" }}
      />
    </div>
  );
}
