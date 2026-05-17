import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { TestimonialProofType } from "@prisma/client";
import { auth } from "@/auth";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Compass,
  Eye,
  FileSearch,
  Globe2,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { GrowthArchitectSupportCta, JsonLd } from "@/components/public";
import { SectionFeatureImage } from "@/components/visual-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema, buildFounderSchema } from "@/lib/structured-data";
import { absoluteUrl, cn, formatDate } from "@/lib/utils";
import { getFounderServicePricing, isGrowthArchitectServiceSlug } from "@/lib/founder";
import { listActiveFounderServices } from "@/server/founder";
import { listApprovedTestimonials } from "@/server/testimonials";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Trevor Newton | Growth Architect & Founder of The Business Circle Network",
  description:
    "Growth Architect audits and strategic support for business owners who want clearer positioning, stronger trust signals, better visibility, AI search readiness, and practical next steps.",
  path: "/founder"
});

const SERVICE_COPY: Record<
  string,
  {
    label?: string;
    description: string;
    includes: string[];
  }
> = {
  "growth-architect-clarity-audit": {
    description:
      "A detailed review of your business presence, website clarity, trust signals, positioning, visibility, conversion journey, and next-step priorities.",
    includes: [
      "Website and offer review",
      "Trust and credibility analysis",
      "SEO and AI search readiness checks",
      "Customer journey observations",
      "Priority improvement list",
      "Clear next-step direction"
    ]
  },
  "growth-architect-growth-strategy": {
    label: "Available after audit review",
    description:
      "A focused 1:1 session to work through a specific business, positioning, visibility, website, or growth problem with direct strategic guidance.",
    includes: [
      "Focused 1:1 discussion",
      "Problem breakdown",
      "Decision clarity",
      "Practical next-step plan"
    ]
  },
  "growth-architect-full-growth-architect": {
    label: "Limited availability",
    description:
      "Ongoing founder-led support for owners who want consistent strategic input across clarity, positioning, visibility, website improvement, conversion, and business growth decisions.",
    includes: [
      "Ongoing strategic support",
      "Priority improvement planning",
      "Website and visibility direction",
      "Founder decision support",
      "Regular review and next-step guidance"
    ]
  }
};

const AUDIT_AREAS = [
  {
    title: "Website clarity",
    description: "Whether a serious buyer can quickly understand what you do and why it matters.",
    icon: Eye
  },
  {
    title: "Trust signals",
    description: "The proof, credibility markers, consistency, and confidence cues around the business.",
    icon: ShieldCheck
  },
  {
    title: "Customer journey",
    description: "How smoothly someone moves from interest to enquiry, decision, or purchase.",
    icon: Compass
  },
  {
    title: "Conversion friction",
    description: "Where unclear copy, weak structure, missing proof, or awkward steps slow people down.",
    icon: Target
  },
  {
    title: "SEO foundations",
    description: "The basic search signals that help the right people find and understand the business.",
    icon: Search
  },
  {
    title: "AI search readiness",
    description: "How well your business can be interpreted by AI search, answer engines, and modern discovery tools.",
    icon: Globe2
  },
  {
    title: "Brand positioning",
    description: "Whether the offer feels clear, credible, differentiated, and commercially useful.",
    icon: BadgeCheck
  },
  {
    title: "Content gaps",
    description: "Missing pages, proof, explanations, or useful content that would strengthen buyer confidence.",
    icon: FileSearch
  },
  {
    title: "Local or niche visibility",
    description: "How visible and trusted the business feels in the market it actually needs to win.",
    icon: Users
  },
  {
    title: "Commercial next steps",
    description: "The priority improvements most likely to create better clarity, trust, and movement.",
    icon: CheckCircle2
  }
] as const;

const WHO_FOR = [
  "Business owners who know their website could work harder",
  "Owners who feel their offer is good but not clear enough online",
  "Founders who want external strategic eyes before spending money",
  "Local businesses trying to improve trust and visibility",
  "Service businesses that need clearer positioning",
  "Owners who want practical direction, not generic reports"
] as const;

const WHO_NOT_FOR = [
  "People looking for instant guaranteed results",
  "Owners who want volume marketing without fixing trust or clarity",
  "Anyone wanting a generic automated SEO report",
  "Businesses not ready to look honestly at what needs improving"
] as const;

const OWNER_PROBLEMS = [
  "Your website can look live but still fail to build trust.",
  "Your offer can be good but unclear online.",
  "Your business can be credible but invisible.",
  "Your content can exist without answering buyer questions.",
  "Your brand can look active without converting attention into enquiries.",
  "Most owners are too close to their own business to see the gaps clearly."
] as const;

const AEO_QUESTIONS = [
  {
    question: "What is a Growth Architect?",
    answer:
      "A Growth Architect looks at how a business is understood, trusted, found, and acted on online, then turns the gaps into practical next steps."
  },
  {
    question: "What is a business clarity audit?",
    answer:
      "A business clarity audit is a focused review of your offer, website, trust signals, visibility, customer journey, and conversion points so you can see what needs improving first."
  },
  {
    question: "How does a website audit help a business owner?",
    answer:
      "A website audit helps a business owner see where their site is confusing buyers, missing proof, hiding value, weakening trust, or making enquiries harder than they need to be."
  },
  {
    question: "What is AI search readiness?",
    answer:
      "AI search readiness means making your business easier for answer engines and AI search tools to understand, summarise, trust, and connect to the right buyer questions."
  },
  {
    question: "Is this just an SEO audit?",
    answer:
      "No. SEO foundations are included, but the audit also looks at clarity, positioning, trust, buyer psychology, conversion friction, content gaps, and the practical next move."
  },
  {
    question: "Who is The Business Circle Network for?",
    answer:
      "The Business Circle Network is for serious business owners who want calmer conversations, better judgement, useful relationships, and a more structured environment around long-term growth."
  }
] as const;

const SERVICE_ORDER = [
  "growth-architect-clarity-audit",
  "growth-architect-growth-strategy",
  "growth-architect-full-growth-architect"
] as const;

function billingSuffix(billingType: "ONE_TIME" | "MONTHLY_RETAINER") {
  return billingType === "MONTHLY_RETAINER" ? "/month" : "";
}

function sortServicesByPathway<T extends { slug: string }>(services: T[]) {
  return [...services].sort((left, right) => {
    const leftIndex = SERVICE_ORDER.indexOf(left.slug as (typeof SERVICE_ORDER)[number]);
    const rightIndex = SERVICE_ORDER.indexOf(right.slug as (typeof SERVICE_ORDER)[number]);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

function buildFounderServicesSchema(
  services: Array<{
    slug: string;
    title: string;
    shortDescription: string;
    price: number;
    currency: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@graph": services.map((service) => ({
      "@type": "Service",
      "@id": absoluteUrl(`/founder/services/${service.slug}#service`),
      name: service.title,
      description: SERVICE_COPY[service.slug]?.description ?? service.shortDescription,
      provider: {
        "@type": "Person",
        name: "Trevor Newton",
        url: absoluteUrl("/founder")
      },
      brand: {
        "@type": "Organization",
        name: "The Business Circle Network",
        url: absoluteUrl("/")
      },
      areaServed: {
        "@type": "Country",
        name: "United Kingdom"
      },
      offers: {
        "@type": "Offer",
        price: (service.price / 100).toFixed(2),
        priceCurrency: service.currency || "GBP",
        url: absoluteUrl(`/founder/services/${service.slug}`)
      }
    }))
  };
}

function FounderSectionHeader({
  eyebrow,
  title,
  intro
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="max-w-3xl space-y-2.5">
      <p className="premium-kicker">{eyebrow}</p>
      <h2 className="font-display text-2xl leading-tight text-foreground sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {intro ? <p className="text-base leading-relaxed text-muted">{intro}</p> : null}
    </div>
  );
}

function FounderVisual({
  placement,
  tone = "editorial",
  className,
  aspectClassName = "aspect-[16/10]",
  sizes,
  children
}: {
  placement: Awaited<ReturnType<typeof getVisualMediaPlacement>> | null | undefined;
  tone?: "human" | "story" | "platform" | "founders" | "editorial";
  className?: string;
  aspectClassName?: string;
  sizes?: string;
  children?: ReactNode;
}) {
  if (placement?.isActive && placement.imageUrl) {
    return (
      <SectionFeatureImage
        placement={placement}
        tone={tone}
        aspectClassName={aspectClassName}
        className={className}
        sizes={sizes}
      >
        {children}
      </SectionFeatureImage>
    );
  }

  return (
    <div
      className={cn(
        "feature-visual-shell relative overflow-hidden rounded-[1.6rem] border border-silver/20 bg-[radial-gradient(circle_at_20%_18%,rgba(82,146,255,0.18),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(214,180,103,0.16),transparent_30%),linear-gradient(180deg,rgba(12,19,36,0.92),rgba(5,10,24,0.98))] shadow-panel-soft",
        aspectClassName,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.44)_100%)]" />
      {children ? <div className="relative z-[2] flex h-full items-end">{children}</div> : null}
    </div>
  );
}

export default async function FounderPage() {
  const [
    session,
    allServices,
    growthArchitectTestimonials,
    founderHeroPlacement,
    founderStoryPlacement,
    founderGrowthArchitecturePlacement,
    founderAuditPlacement,
    founderProofPlacement,
    founderFinalCtaPlacement
  ] = await Promise.all([
    auth(),
    listActiveFounderServices().catch(() => []),
    listApprovedTestimonials(TestimonialProofType.GROWTH_ARCHITECT, 8).catch(() => []),
    getVisualMediaPlacement("founder.hero"),
    getVisualMediaPlacement("founder.story"),
    getVisualMediaPlacement("founder.growthArchitecture"),
    getVisualMediaPlacement("founder.audit"),
    getVisualMediaPlacement("founder.proof"),
    getVisualMediaPlacement("founder.finalCta")
  ]);
  const viewer = session?.user
    ? {
        role: session.user.role,
        membershipTier: session.user.membershipTier,
        hasActiveSubscription: session.user.hasActiveSubscription
      }
    : null;
  const services = sortServicesByPathway(
    allServices.filter((service) => isGrowthArchitectServiceSlug(service.slug))
  );

  return (
    <div className="public-page-stack">
      <JsonLd data={buildFounderSchema()} />
      <JsonLd data={buildFaqSchema([...AEO_QUESTIONS])} />
      <JsonLd data={buildFounderServicesSchema(services)} />

      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-card/64 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.6)_100%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(300px,0.64fr)] xl:items-center">
          <div className="space-y-5">
            <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
              Trevor Newton | Founder & Growth Architect
            </Badge>

            <div className="space-y-3.5">
              <h1 className="max-w-4xl font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl 2xl:text-6xl">
                Trevor Newton | Founder & Growth Architect
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-white/82 sm:text-lg">
                For business owners who want clearer positioning, stronger trust, better
                visibility, and practical next steps before they waste more time, money, or energy
                guessing.
              </p>
              <p className="max-w-3xl text-base leading-relaxed text-muted">
                Most businesses do not need more noise. They need clearer structure, stronger trust
                signals, better decisions, and a sharper online presence that helps the right
                people understand why they should care.
              </p>
            </div>

            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/founder/services/growth-architect-clarity-audit?sourcePage=Founder%20Page&sourceSection=Hero"
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="group w-full sm:w-auto">
                  Start With A Clarity Audit
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/membership" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Explore The Business Circle
                </Button>
              </Link>
            </div>
          </div>

          <FounderVisual
            placement={founderHeroPlacement}
            tone="founders"
            aspectClassName="aspect-[16/11] sm:aspect-[16/10] xl:aspect-[5/4]"
            className="min-h-[17rem] max-h-[30rem] xl:min-h-[22rem]"
            sizes="(min-width: 1280px) 34vw, 100vw"
          >
            <div className="w-full space-y-2.5 p-4 sm:p-5">
              <p className="premium-kicker">Why owners come here</p>
              {[
                "They need sharper visibility before spending more money.",
                "They want a calmer outside view of the business.",
                "They know trust, positioning, or conversion could be stronger.",
                "They want practical direction, not a generic report."
              ].map((item) => (
                <p key={item} className="rounded-2xl border border-white/10 bg-background/42 px-3.5 py-2.5 text-sm text-foreground shadow-panel-soft backdrop-blur">
                  {item}
                </p>
              ))}
            </div>
          </FounderVisual>
        </div>
      </section>

      <section className="space-y-5">
        <FounderSectionHeader
          eyebrow="The Problem"
          title="The problem I help business owners solve"
          intro="A business can be real, useful, and credible, while still being harder to understand online than it should be."
        />
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {OWNER_PROBLEMS.map((problem) => (
            <Card key={problem} className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardContent className="flex gap-3 p-4 text-sm leading-relaxed text-foreground sm:p-5">
                <Target size={17} className="mt-0.5 shrink-0 text-gold" />
                <span>{problem}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)] xl:items-stretch">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <FounderSectionHeader
              eyebrow="Why I Built BCN"
              title="Most owners do not need more noise. They need a better room."
            />
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              Business can become isolating, especially when every decision carries pressure and
              every public channel is pushing another opinion, tactic, or trend.
            </p>
            <p>
              Most conversations stay surface-level. Owners are told to post more, sell harder, or
              chase whatever is currently loudest, while the real issues sit underneath: unclear
              positioning, weak trust signals, scattered focus, and decisions made without enough
              calm context.
            </p>
            <p>
              I built The Business Circle Network to create a calmer room for serious owners. Not
              another hype-driven social platform. Not a self-promotion group. A private
              founder-led environment for better conversations, better judgement, and long-term
              growth.
            </p>
          </CardContent>
        </Card>

        <FounderVisual
          placement={founderStoryPlacement}
          tone="story"
          aspectClassName="aspect-[16/10] xl:aspect-auto"
          className="min-h-[15rem] max-h-[25rem] xl:h-full"
        >
          <div className="w-full space-y-3 p-4 sm:p-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <MessageSquareText size={20} />
            </span>
            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-background/42 p-4 backdrop-blur">
              <p className="premium-kicker">Founder note</p>
              <p className="text-base leading-relaxed text-muted">
                BCN is the wider ecosystem. Growth Architect work is the direct strategic support
                layer for owners who need someone to look properly at what is happening in the
                business before they make the next move.
              </p>
            </div>
          </div>
        </FounderVisual>
      </section>

      <section
        className={cn(
          "grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] xl:items-stretch"
        )}
      >
        <div className="space-y-5">
          <FounderSectionHeader
            eyebrow="Growth Architecture"
            title="Why Growth Architecture exists"
            intro="Some owners need direct support before, during, or after joining BCN. The work is designed to make the business clearer, more trusted, more visible, and easier to act on."
          />

          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Clarity around the offer and next move",
              "Trust signals that make the business easier to believe",
              "Positioning that helps the right people understand the value",
              "Website conversion and customer journey improvements",
              "AI search, GEO readiness, and SEO basics",
              "Practical next steps that make the business easier to improve"
            ].map((item) => (
              <Card key={item} className="border-border/90 bg-card/68 shadow-panel-soft">
                <CardContent className="flex gap-3 p-4 text-sm leading-relaxed text-foreground sm:p-5">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-gold" />
                  <span>{item}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <FounderVisual
          placement={founderGrowthArchitecturePlacement}
          tone="editorial"
          aspectClassName="aspect-[16/10] xl:aspect-auto"
          className="min-h-[13rem] max-h-[24rem] xl:h-full"
          sizes="(min-width: 1280px) 26vw, 100vw"
        />
      </section>

      <section className="space-y-5">
        <FounderSectionHeader
          eyebrow="Audit Scope"
          title="What the audit looks at"
          intro="The Clarity Audit is not an automated SEO scan. It is a practical review of how the business is being understood, trusted, found, and moved through by real people."
        />

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          {AUDIT_AREAS.map((area) => {
            const Icon = area.icon;

            return (
              <Card key={area.title} className="border-border/90 bg-card/68 shadow-panel-soft">
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                    <Icon size={18} />
                  </span>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl text-foreground">{area.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{area.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <GrowthArchitectSupportCta href="/founder/services/growth-architect-clarity-audit?sourcePage=Founder%20Page&sourceSection=Launch%20Review%20CTA" />

      <section className="space-y-5">
        <FounderSectionHeader
          eyebrow="Answer First"
          title="Clear answers for owners comparing their next move"
          intro="Short answers to the questions business owners usually ask before choosing an audit or joining a founder-led growth environment."
        />
        <div className="grid gap-3.5 lg:grid-cols-2">
          {AEO_QUESTIONS.map((item) => (
            <Card key={item.question} className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="services" className="space-y-5">
        <FounderSectionHeader
          eyebrow="Services"
          title="Start with the right level of support"
          intro="The offers stay simple on purpose. Most owners should start with the Clarity Audit, then decide whether a session, ongoing support, or the wider BCN ecosystem is the right next step."
        />

        <FounderVisual
          placement={founderAuditPlacement}
          tone="editorial"
          aspectClassName="aspect-[16/10] md:aspect-[16/8]"
          className="min-h-[12rem] max-h-[22rem]"
          sizes="(min-width: 1280px) 72vw, 100vw"
        >
          <div className="w-full p-4 sm:p-5">
            <div className="max-w-xl rounded-2xl border border-white/10 bg-background/44 p-3.5 backdrop-blur sm:p-4">
              <p className="premium-kicker">Audit pathway</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A clearer view of the website, offer, trust signals, visibility, and next move
                before you spend more time or money guessing.
              </p>
            </div>
          </div>
        </FounderVisual>

        <div className="grid gap-4 xl:grid-cols-3">
          {services.map((service, index) => {
            const pricing = getFounderServicePricing(service, viewer);
            const currency = service.currency || "GBP";
            const hasPrice = typeof pricing.finalAmount === "number" && !Number.isNaN(pricing.finalAmount);
            const serviceCopy = SERVICE_COPY[service.slug];
            const description = serviceCopy?.description ?? service.shortDescription;
            const includes = serviceCopy?.includes ?? service.includes;

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
                <CardHeader className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-background/20 text-silver">
                      {service.title}
                    </Badge>
                    {serviceCopy?.label ? (
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        {serviceCopy.label}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Price</p>
                    <p className="font-display text-3xl text-foreground sm:text-4xl">
                      {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                      {hasPrice
                        ? new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency
                          }).format(pricing.finalAmount / 100)
                        : "Pricing unavailable"}
                      <span className="ml-1 text-base text-silver">{billingSuffix(service.billingType)}</span>
                    </p>
                    {pricing.discountPercent ? (
                      <p className="text-sm text-muted">
                        Member rate applied from{" "}
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency
                        }).format(pricing.baseAmount / 100)}
                        {billingSuffix(service.billingType)}.
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{description}</p>
                </CardHeader>
                <CardContent className="space-y-4 p-5 pt-0">
                  <div className="space-y-2">
                    {includes.map((item) => (
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

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <FounderSectionHeader eyebrow="Fit" title="Who this is for" />
          </CardHeader>
          <CardContent className="grid gap-2.5 p-5 pt-0 sm:p-6 sm:pt-0">
            {WHO_FOR.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground"
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardHeader>
            <FounderSectionHeader eyebrow="Standards" title="Who this is not for" />
          </CardHeader>
          <CardContent className="grid gap-2.5 p-5 pt-0 sm:p-6 sm:pt-0">
            {WHO_NOT_FOR.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-muted"
              >
                <Sparkles size={16} className="mt-0.5 shrink-0 text-silver" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <FounderSectionHeader
          eyebrow="Client Proof"
          title="Results, Feedback & Founder Proof"
          intro={
            growthArchitectTestimonials.length
              ? "Approved feedback from Growth Architect audits and founder-led strategic support."
              : "Early Growth Architect feedback and selected business reviews will appear here as completed audit work develops."
          }
        />

        <FounderVisual
          placement={founderProofPlacement}
          tone="human"
          aspectClassName="aspect-[16/10] md:aspect-[16/8]"
          className="min-h-[11rem] max-h-[20rem]"
          sizes="(min-width: 1280px) 72vw, 100vw"
        />

        {growthArchitectTestimonials.length ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:gap-4 sm:px-0">
            {growthArchitectTestimonials.map((testimonial) => (
              <article
                key={testimonial.id}
                className="min-w-[16.5rem] max-w-[21rem] snap-start rounded-[1.25rem] border border-white/10 bg-card/72 p-4 shadow-panel-soft sm:min-w-[20rem] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{testimonial.authorName}</p>
                    {testimonial.businessName ? (
                      <p className="text-sm text-muted">{testimonial.businessName}</p>
                    ) : null}
                    {testimonial.authorRole ? (
                      <p className="text-xs text-silver">{testimonial.authorRole}</p>
                    ) : null}
                  </div>
                  {testimonial.rating ? (
                    <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                      {testimonial.rating}/5
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-silver">
                  <Badge variant="outline" className="border-white/10 bg-background/20 text-silver">
                    Growth Architect
                  </Badge>
                  <span>
                    Approved {formatDate(testimonial.approvedAt ?? testimonial.createdAt)}
                  </span>
                </div>
                {testimonial.businessWebsite ? (
                  <a
                    href={testimonial.businessWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm text-primary hover:underline"
                  >
                    Visit website
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <Card className="border-border/90 bg-card/68 shadow-panel-soft">
            <CardContent className="p-4 text-sm leading-relaxed text-muted sm:p-5">
              Early Growth Architect feedback and selected business reviews will appear here as completed audit work develops.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-5">
        <FounderVisual
          placement={founderFinalCtaPlacement}
          tone="founders"
          aspectClassName="aspect-[16/10] md:aspect-[21/8]"
          className="min-h-[11rem] max-h-[20rem]"
          sizes="100vw"
        >
          <div className="w-full p-4 sm:p-5">
            <div className="max-w-xl rounded-2xl border border-gold/20 bg-background/44 p-3.5 backdrop-blur sm:p-4">
              <p className="premium-kicker">Next step</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Start with clarity, then decide whether the audit, direct support, or the wider
                BCN ecosystem is the right move.
              </p>
            </div>
          </div>
        </FounderVisual>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)]">
          <Card className="border-border/90 bg-card/72 shadow-panel-soft">
            <CardHeader className="p-5 sm:p-6">
              <FounderSectionHeader
                eyebrow="BCN Connection"
                title="How the audit connects to The Business Circle Network"
              />
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 text-base leading-relaxed text-muted sm:p-6 sm:pt-0">
              <p>
                The audit helps owners understand where they are now. It gives a clearer view of
                the business, the website, the trust signals, and the next practical priorities.
              </p>
              <p>
                BCN gives owners a longer-term environment for better conversations, stronger
                relationships, and more structured growth. Some owners only need the audit. Some
                continue into strategy support. Some join BCN for the wider ecosystem.
              </p>
              <p>
                The pathway is connected, but it is not forced. The point is to help the owner make
                the right next decision with more clarity.
              </p>
            </CardContent>
          </Card>

          <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/84 to-card/74 shadow-gold-soft">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <p className="premium-kicker">Apply</p>
              <h2 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
                Start with a Clarity Audit
              </h2>
              <p className="text-base leading-relaxed text-muted">
                If your business already exists but something feels unclear, underused, overlooked,
                or harder to explain than it should be, start with the Clarity Audit.
              </p>
              <div className="space-y-3">
                <Link href="/founder/services/growth-architect-clarity-audit?sourcePage=Founder%20Page&sourceSection=Final%20CTA">
                  <Button size="lg" className="group w-full">
                    Apply For Clarity Audit
                    <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/membership">
                  <Button size="lg" variant="outline" className="w-full">
                    Join The Business Circle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
