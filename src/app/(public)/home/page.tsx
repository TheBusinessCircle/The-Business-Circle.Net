import type { Metadata } from "next";
import Link from "next/link";
import { TestimonialDisplayLocation, TestimonialProofType } from "@prisma/client";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  CreditCard,
  Handshake,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import {
  AnswerBlock,
  CTASection,
  FirstSevenDaysBlock,
  JsonLd,
  MemberPreviewLayer,
  SectionHeading
} from "@/components/public";
import { buildFounderAuditHref } from "@/components/public/founder-audit-cta";
import { TestimonialCarousel } from "@/components/public/testimonial-carousel";
import { PublicTopVisual } from "@/components/visual-media";
import { buttonVariants } from "@/components/ui/button";
import { COMPANY_CONFIG } from "@/config/company";
import {
  isRecoverableDatabaseError,
  logRecoverableDatabaseFallback
} from "@/lib/db-errors";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { listPublicInsights } from "@/server/insights/insight.service";
import { listApprovedTestimonials } from "@/server/testimonials";
import { getVisualMediaPlacement } from "@/server/visual-media";
import type { PublicInsightSummary } from "@/types/insights";

export const metadata: Metadata = createPageMetadata({
  title: "Private Business Network for Owners",
  description:
    "A private founder-led business network for UK owners who want better conversations, clearer thinking, trusted relationships and useful business context.",
  path: "/home",
  keywords: [
    "business network for owners",
    "business owners network UK",
    "private business community UK",
    "private founder-led business environment",
    "business growth network",
    "membership for business owners",
    "entrepreneur community UK",
    "structured business support"
  ]
});

type CarouselTestimonial = {
  id: string;
  quote: string;
  outcome: string | null;
  rating: number | null;
  authorName: string;
  authorRole: string | null;
  businessName: string | null;
  businessWebsite: string | null;
};

const WHAT_CHANGES_AFTER_JOINING = [
  {
    title: "The room gets quieter",
    description:
      "You move away from general noise and into a calmer room where business context matters.",
    icon: ShieldCheck
  },
  {
    title: "People understand you faster",
    description:
      "Your profile, offers and asks help other owners see what you do, what you need and where fit may exist.",
    icon: Compass
  },
  {
    title: "Conversations become more useful",
    description:
      "The standard shifts from promotion to clear questions, useful answers, warm introductions and serious conversations.",
    icon: Handshake
  },
  {
    title: "Momentum has somewhere to land",
    description:
      "Insights, resources, rooms, calls and collaboration paths give progress a place to continue.",
    icon: TrendingUp
  }
] as const;

const PUBLIC_SIGNAL_ITEMS = [
  {
    title: "Trusted rooms beat more information",
    description:
      "Founders are not short of content. They are short of serious conversations with people they can trust."
  },
  {
    title: "Clarity is coming before commitment",
    description:
      "Owners are looking for fit, standards and useful context before choosing where to spend their attention."
  },
  {
    title: "Trust proof matters more than discount-led messaging",
    description:
      "The stronger public story is not urgency. It is calm proof that the room is protected and useful."
  }
] as const;

const TRUST_STANDARDS = [
  {
    title: "Founder-led standards",
    description:
      "The room is shaped around useful contribution, clear expectations and serious owner conversation.",
    icon: BadgeCheck
  },
  {
    title: "Approved proof only",
    description:
      "Testimonials and member outcomes are shown only when they are approved and permissioned.",
    icon: ShieldCheck
  },
  {
    title: "Private by design",
    description:
      "Member rooms, dashboards, messages, billing details and admin areas stay protected behind access controls.",
    icon: LockKeyhole
  },
  {
    title: "UK limited company",
    description: `${COMPANY_CONFIG.displayLegalName} is ${COMPANY_CONFIG.registration}. Company number ${COMPANY_CONFIG.companyNumber}.`,
    icon: Building2
  },
  {
    title: "Stripe-secured payments",
    description:
      "Membership checkout and billing are handled through Stripe before member access opens.",
    icon: CreditCard
  }
] as const;

const FOR_AUDIENCE = [
  "Business owners carrying real decisions",
  "Freelancers, founders, creators and specialists who want better rooms",
  "Operators who value trust, clarity and useful introductions",
  "Serious self-employed people who want signal over noise"
] as const;

const NOT_FOR_AUDIENCE = [
  "People looking for a spammy promotion feed",
  "People who want attention without contribution",
  "People who do not respect private business context",
  "People chasing hype instead of trusted relationships"
] as const;

async function listHomeApprovedMemberTestimonials() {
  try {
    return await listApprovedTestimonials({
      proofType: TestimonialProofType.BCN_MEMBER,
      location: TestimonialDisplayLocation.BCN_HOME,
      limit: 12
    });
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    logRecoverableDatabaseFallback("home-approved-member-testimonials", error);
    return [];
  }
}

function WhatChangesAfterJoiningSection() {
  return (
    <section className="public-section">
      <SectionHeading
        label="What changes after joining"
        title="The room gives useful conversations somewhere to happen."
        description="BCN becomes valuable when members show up with signal: clear context, clear asks, useful offers and a willingness to contribute."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WHAT_CHANGES_AFTER_JOINING.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-[1.55rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
                <Icon size={18} />
              </span>
              <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FounderSignalsSection({
  latestInsight
}: {
  latestInsight: PublicInsightSummary | null;
}) {
  return (
    <section className="public-section" aria-label="Founder Signals">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="rounded-[1.9rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-6 shadow-gold-soft sm:p-8">
          <p className="premium-kicker">Founder Signals</p>
          <h2 className="mt-4 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Today&apos;s Owner Signal
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Public-safe observations from BCN. No private member data, no admin detail, just the
            signal behind the founder-led environment.
          </p>

          {latestInsight ? (
            <Link
              href={`/insights/${latestInsight.slug}`}
              className="mt-6 block rounded-[1.35rem] border border-white/10 bg-background/24 p-4 transition-colors hover:border-gold/28 hover:bg-background/32"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                New insight is added daily
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight text-foreground">
                {latestInsight.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{latestInsight.excerpt}</p>
            </Link>
          ) : (
            <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-background/24 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                New insight is added daily
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The insight layer gives owners a useful public signal before deeper member
                resources open inside BCN.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/insights"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              Open insights hub
            </Link>
            <Link
              href={buildFounderAuditHref({ source: "home", topic: "founder-signals" })}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              Run the Founder Audit
            </Link>
          </div>
        </article>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {PUBLIC_SIGNAL_ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.45rem] border border-border/80 bg-card/64 p-5 shadow-panel-soft"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                Public signal
              </p>
              <h3 className="mt-3 font-display text-2xl leading-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApprovedMemberProofSection({
  testimonials
}: {
  testimonials: CarouselTestimonial[];
}) {
  return (
    <section className="public-section">
      <SectionHeading
        label="Approved member proof"
        title="One proof layer, shown with permission."
        description="Approved public testimonials are shown once here. Member proof is not copied into repeated trust blocks or exposed without permission."
      />

      {testimonials.length ? (
        <TestimonialCarousel testimonials={testimonials} />
      ) : (
        <article className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
          <Sparkles size={18} className="text-gold" />
          <h3 className="mt-4 font-display text-3xl leading-tight text-foreground">
            Approved member proof will appear here when it is ready.
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
            BCN only uses public testimonials when they are approved and permissioned. Until then,
            the stronger trust signal is the standard: private by design, founder-led, and careful
            with member context.
          </p>
        </article>
      )}
    </section>
  );
}

function TrustAndStandardsSection() {
  return (
    <section className="public-section">
      <SectionHeading
        label="Trust and standards"
        title="The room has to be protected before it can be useful."
        description="BCN keeps public proof, member privacy, payment trust and company credibility in one clear place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {TRUST_STANDARDS.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-[1.45rem] border border-border/80 bg-card/64 p-5 shadow-panel-soft"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                <Icon size={17} />
              </span>
              <h3 className="mt-4 font-display text-2xl leading-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FitSection() {
  return (
    <section className="public-section">
      <div className="max-w-4xl space-y-3">
        <p className="premium-kicker">Who it is for</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          The fit is serious, but not cold.
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          BCN works when members respect the room, add useful signal and treat trust as part of
          the value.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.8rem] border border-gold/24 bg-card/70 p-5 shadow-panel-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">For</p>
          <div className="mt-5 grid gap-3">
            {FOR_AUDIENCE.map((item) => (
              <div
                key={item}
                className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Not for</p>
          <div className="mt-5 grid gap-3">
            {NOT_FOR_AUDIENCE.map((item) => (
              <div
                key={item}
                className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [homeHeroPlacement, approvedMemberTestimonials] = await Promise.all([
    getVisualMediaPlacement("home.hero"),
    listHomeApprovedMemberTestimonials()
  ]);
  const publicInsights = listPublicInsights();
  const latestPublicInsight = publicInsights[0] ?? null;
  const carouselTestimonials = approvedMemberTestimonials.map(
    (testimonial): CarouselTestimonial => ({
      id: testimonial.id,
      quote: testimonial.quote,
      outcome: testimonial.outcome,
      rating: testimonial.rating,
      authorName: testimonial.authorName,
      authorRole: testimonial.authorRole,
      businessName: testimonial.businessName,
      businessWebsite: testimonial.businessWebsite
    })
  );

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildWebPageSchema({
          title: "Private Business Network for Owners",
          description:
            "A private founder-led business network for UK owners who want clearer conversations, stronger trust and useful business context.",
          path: "/home",
          primaryQuestion: "What is The Business Circle Network?",
          primaryAnswer:
            "The Business Circle Network is a private founder-led business environment for serious owners who want clearer conversations, stronger trust, useful resources and better rooms."
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: "Founder Audit", path: "/audit" },
          { name: "Membership", path: "/membership" }
        ])}
      />
      <JsonLd
        data={buildCollectionPageSchema({
          title: "The Business Circle Network homepage",
          description:
            "A public invitation into a private founder-led business environment for serious business owners.",
          path: "/home",
          keywords: [
            "private business network",
            "founder-led business environment",
            "business owner membership"
          ],
          itemPaths: ["/audit", "/membership", "/insights"]
        })}
      />

      <PublicTopVisual
        placement={homeHeroPlacement}
        eyebrow="The Business Circle Network"
        title="Business owners do not need more noise. They need a better room."
        description="Business ownership can become isolated. BCN exists for owners who want clearer conversations, stronger trust, useful introductions and a calmer place to think, share, ask, build and grow."
        tone="cinematic"
        contentClassName="gap-4 px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10"
      >
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
          <Link
            href={buildFounderAuditHref({ source: "home", topic: "hero" })}
            className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
          >
            Run the Founder Audit
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/membership"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            Review Membership
          </Link>
        </div>
      </PublicTopVisual>

      <AnswerBlock
        label="What BCN is"
        question="A private founder-led business environment for serious business owners."
        answer="BCN is built for owners, freelancers, founders, creators, specialists and serious self-employed people who want clearer conversations, stronger trust, useful resources and better rooms. It is not another generic networking group. It is a calmer business environment designed around clarity, collaboration and signal over noise."
      />

      <WhatChangesAfterJoiningSection />

      <FounderSignalsSection latestInsight={latestPublicInsight} />

      <MemberPreviewLayer id="how-it-works" />

      <FirstSevenDaysBlock />

      <ApprovedMemberProofSection testimonials={carouselTestimonials} />

      <TrustAndStandardsSection />

      <FitSection />

      <CTASection
        title="Step into the better room."
        description="Run the Founder Audit if you want clarity first, or review membership when the room already feels like the right next environment."
        primaryAction={{
          href: buildFounderAuditHref({ source: "home", topic: "final-cta" }),
          label: "Run the Founder Audit"
        }}
        secondaryAction={{
          href: "/membership",
          label: "Review Membership",
          variant: "outline"
        }}
        analyticsSource="home"
      />
    </div>
  );
}
