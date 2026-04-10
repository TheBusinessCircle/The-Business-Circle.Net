import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import {
  ArrowRight,
  Briefcase,
  Clock3,
  Compass,
  ShieldCheck
} from "lucide-react";
import { JsonLd } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { buildFounderSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getFounderServicePricing, isGrowthArchitectServiceSlug } from "@/lib/founder";
import { listActiveFounderServices } from "@/server/founder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Trevor Newton | Founder",
  description:
    "Work directly with Trevor Newton through a clear, application-led founder page for Clarity Audit, Strategy Session, and Growth Architect support.",
  path: "/founder"
});

const WHAT_I_DO = [
  "Improve clarity around what matters now",
  "Tighten structure where the business feels loose",
  "Remove noise that keeps better judgement out of reach",
  "Help momentum move properly instead of reactively"
] as const;

const HOW_IT_WORKS = [
  "Apply",
  "I review your business",
  "I confirm availability",
  "We start properly"
] as const;

function billingSuffix(billingType: "ONE_TIME" | "MONTHLY_RETAINER") {
  return billingType === "MONTHLY_RETAINER" ? "/month" : "";
}

export default async function FounderPage() {
  const [session, allServices] = await Promise.all([auth(), listActiveFounderServices()]);
  const viewer = session?.user
    ? {
        role: session.user.role,
        membershipTier: session.user.membershipTier,
        hasActiveSubscription: session.user.hasActiveSubscription
      }
    : null;
  const services = allServices.filter((service) => isGrowthArchitectServiceSlug(service.slug));

  return (
    <div className="space-y-12 pb-16 sm:space-y-14">
      <JsonLd data={buildFounderSchema()} />

      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-card/58 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-[110px]" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          <div className="space-y-6">
            <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
              Founder
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
                My name is Trevor Newton.
              </h1>
              <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-muted">
                <p>
                  I built The Business Circle Network because most business owners do not need more
                  information.
                </p>
                <p>
                  They need clearer structure, better conversations, and the right environment
                  around how they grow.
                </p>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-white/8 bg-background/18 p-5">
              <div className="space-y-3 text-base leading-relaxed text-muted">
                <p>I work full-time.</p>
                <p>I have a family.</p>
                <p>And I&apos;m building this properly.</p>
                <p>
                  That matters because I understand what it actually takes to grow something while
                  everything else is still moving.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="#services">
                <Button size="lg" className="group">
                  Apply To Work With Me
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              <Link href="/membership">
                <Button size="lg" variant="outline">
                  See Membership
                </Button>
              </Link>
            </div>
          </div>

          <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/85 to-card/70 shadow-panel-soft">
            <CardHeader className="space-y-4">
              <CardTitle className="font-display text-3xl text-foreground">
                What this page is for
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted">
              <p>To show you who I am.</p>
              <p>To explain how I work.</p>
              <p>To make the options clear.</p>
              <p>To keep entry controlled through application, not instant booking.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)]">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
              What I Do
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl text-foreground">
              I work directly with business owners to make the next move clearer.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-3xl text-base leading-relaxed text-muted">
              I work directly with business owners to improve clarity, tighten structure, remove
              noise, and help momentum move properly.
            </p>
            <p className="text-base leading-relaxed text-muted">
              This is not theory. This is applied thinking around real businesses.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {WHAT_I_DO.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.35rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/82 to-card/72 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/15 text-gold">
              How Work Starts
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl text-foreground">
              All work starts with a Clarity Audit.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              This allows me to understand the business properly before giving direction or taking
              on deeper work.
            </p>
            <p>
              It keeps the work clean. It keeps the thinking honest. And it stops bigger decisions
              being made from partial context.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="services" className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="premium-kicker">Services</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Three ways to work with me
          </h2>
          <p className="text-base leading-relaxed text-muted">
            The offers stay simple on purpose. The goal is to make the level of support clear
            without turning this into a crowded service menu.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {services.map((service, index) => {
            const pricing = getFounderServicePricing(service, viewer);
            const startsWithAudit = service.slug !== "growth-architect-clarity-audit";

            return (
              <Card
                key={service.id}
                className={cn(
                  "border-border/90 bg-card/72 shadow-panel-soft",
                  index === 0
                    ? "border-gold/35 bg-gradient-to-br from-gold/10 via-card/84 to-card/72"
                    : ""
                )}
              >
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-background/20 text-silver">
                      {service.title}
                    </Badge>
                    {startsWithAudit ? (
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        Starts after Clarity Audit
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Price</p>
                    <p className="font-display text-4xl text-foreground">
                      {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                      {pricing.finalAmount
                        ? new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: service.currency
                          }).format(pricing.finalAmount / 100)
                        : ""}
                      <span className="ml-1 text-base text-silver">{billingSuffix(service.billingType)}</span>
                    </p>
                    {pricing.discountPercent ? (
                      <p className="text-sm text-muted">
                        Member rate applied from{" "}
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: service.currency
                        }).format(pricing.baseAmount / 100)}
                        {billingSuffix(service.billingType)}.
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{service.shortDescription}</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    {service.includes.map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/founder/services/${service.slug}?sourcePage=Founder%20Page&sourceSection=Founder%20Services`}
                  >
                    <Button className="group w-full" size="lg">
                      {service.ctaLabel}
                      <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon =
            index === 0 ? Briefcase : index === 1 ? Compass : index === 2 ? ShieldCheck : Clock3;

          return (
            <Card key={step} className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardContent className="space-y-4 p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <Icon size={18} />
                </span>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    Step {index + 1}
                  </p>
                  <p className="font-display text-2xl text-foreground">{step}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
              Capacity
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl text-foreground">
              I work with a limited number of businesses at one time.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              I do that to keep the work focused, useful, and commercially honest.
            </p>
            <p>
              This is not built around volume. It is built around clarity, judgement, and the
              quality of the work once I am involved.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/84 to-card/74 shadow-gold-soft">
          <CardContent className="space-y-5 p-6 sm:p-7">
            <p className="premium-kicker">Apply</p>
            <h2 className="font-display text-3xl leading-tight text-foreground">
              Apply to work with me
            </h2>
            <p className="text-base leading-relaxed text-muted">
              If the work feels right, start with the Clarity Audit or apply for the level that
              fits where the business is now.
            </p>
            <div className="space-y-3">
              <Link href="/founder/services/growth-architect-clarity-audit?sourcePage=Founder%20Page&sourceSection=Final%20CTA">
                <Button size="lg" className="group w-full">
                  Apply To Work With Me
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <p className="text-sm leading-relaxed text-muted">
                No direct booking. I review the business first, then confirm the right next step.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
