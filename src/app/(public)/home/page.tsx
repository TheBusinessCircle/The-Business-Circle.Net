import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Compass,
  CreditCard,
  Handshake,
  Layers3,
  LockKeyhole,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users
} from "lucide-react";
import {
  FirstSevenDaysBlock,
  FounderAuditCta,
  JsonLd,
  SectionHeading
} from "@/components/public";
import { buildFounderAuditHref } from "@/components/public/founder-audit-cta";
import { TrackedPublicCtaLink } from "@/components/public/tracked-public-cta-link";
import { TestimonialCarousel } from "@/components/public/testimonial-carousel";
import { PublicTopVisual, SectionFeatureImage } from "@/components/visual-media";
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
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
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
  imageUrl: string | null;
};

type InsidePlacementKey =
  | "rooms"
  | "resources"
  | "calls"
  | "group"
  | "collaborations"
  | "wins"
  | "profiles"
  | "insight";

const HERO_SIGNALS = [
  "Private business environment",
  "Founder-led standards",
  "Signal over noise"
] as const;

const STEP_INSIDE_HREF = "/join-mobile?source=home&intent=step-inside";
const HOME_SECTION_CLASS = "public-section-compact";
const HOME_SECTION_HEADING_CLASS = "gap-3 sm:gap-4";

const WHAT_BCN_IS = [
  {
    title: "A protected digital business room",
    description:
      "A calmer place for owners to bring context, questions and useful movement without being pulled into a noisy feed.",
    icon: LockKeyhole
  },
  {
    title: "Founder-led, not founder-centred",
    description:
      "The standard is shaped carefully so members know what kind of room they are stepping into.",
    icon: Compass
  },
  {
    title: "Designed for useful momentum",
    description:
      "Profiles, rooms, resources, calls, wins and insight work together instead of sitting as separate features.",
    icon: TrendingUp
  }
] as const;

const WHAT_CHANGES_AFTER_JOINING = [
  {
    title: "The room gets quieter",
    description:
      "A calmer room where business context matters more than visibility.",
    icon: ShieldCheck
  },
  {
    title: "People understand you faster",
    description:
      "Profiles, offers and asks make useful fit easier to see.",
    icon: Users
  },
  {
    title: "Conversations become more useful",
    description:
      "Clear questions, useful answers and warm introductions replace performance.",
    icon: Handshake
  },
  {
    title: "Momentum has somewhere to land",
    description:
      "Insights, rooms, calls and collaborations give progress somewhere to continue.",
    icon: TrendingUp
  }
] as const;

const INSIDE_FEATURE_CARDS = [
  {
    title: "Private Rooms",
    description:
      "Focused spaces for introductions, owner questions and room-specific conversation.",
    placementKey: "rooms",
    icon: Layers3,
    tone: "human" as const
  },
  {
    title: "Resources",
    description:
      "Practical material for decisions, positioning, operations and growth.",
    placementKey: "resources",
    icon: BookOpen,
    tone: "editorial" as const
  },
  {
    title: "1-to-1 Calls",
    description:
      "Move from thread-level context into a useful conversation when depth matters.",
    placementKey: "calls",
    icon: PhoneCall,
    tone: "human" as const
  },
  {
    title: "Group Conversations",
    description:
      "Live owner discussions around direction, pressure and member-led business themes.",
    placementKey: "group",
    icon: CalendarDays,
    tone: "platform" as const
  },
  {
    title: "Collaborations",
    description:
      "Spot useful fit, warm opportunities and practical reasons to connect.",
    placementKey: "collaborations",
    icon: Handshake,
    tone: "founders" as const
  },
  {
    title: "Wins",
    description:
      "Member progress, useful lessons and signals that show what is working.",
    placementKey: "wins",
    icon: Trophy,
    tone: "editorial" as const
  },
  {
    title: "Member Profiles",
    description:
      "Business context that helps the right people understand one another faster.",
    placementKey: "profiles",
    icon: BadgeCheck,
    tone: "platform" as const
  },
  {
    title: "Insight Layer",
    description:
      "Public signals, member resources and founder-led intelligence for better decisions.",
    placementKey: "insight",
    icon: Sparkles,
    tone: "editorial" as const
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
  "Founders, freelancers, creators and specialists who want better rooms",
  "Operators who value trust, clarity and useful introductions",
  "Serious self-employed people who prefer signal over noise"
] as const;

const NOT_FOR_AUDIENCE = [
  "People looking for a spammy promotion feed",
  "People who want attention without contribution",
  "People who do not respect private business context",
  "People chasing hype instead of trusted relationships"
] as const;

async function listHomeApprovedProofTestimonials() {
  try {
    return await listApprovedTestimonials({
      limit: 24
    });
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    logRecoverableDatabaseFallback("home-approved-public-testimonials", error);
    return [];
  }
}

function AtmosphereFrame({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
      {children}
    </div>
  );
}

function WhatBcnActuallyIsSection({
  placement
}: {
  placement: VisualMediaRenderablePlacement | null;
}) {
  return (
    <section className={HOME_SECTION_CLASS}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.58fr)] lg:items-stretch">
        <div className="space-y-4 sm:space-y-5">
          <SectionHeading
            label="Why BCN exists"
            title="A private founder-led environment with enough structure to make trust useful."
            description="BCN is not another generic networking group. It is built for owners, freelancers, founders, creators, specialists and serious self-employed people who want clearer conversations, stronger trust, useful resources and better rooms."
            className={HOME_SECTION_HEADING_CLASS}
          />

          <div className="grid gap-3 md:grid-cols-3">
            {WHAT_BCN_IS.map((item) => {
              const Icon = item.icon;

              return (
                <AtmosphereFrame
                  key={item.title}
                  className="group rounded-[1.45rem] border border-border/80 bg-card/66 p-4 shadow-panel-soft transition duration-300 hover:-translate-y-1 hover:border-gold/30 hover:bg-card/78 hover:shadow-gold-soft sm:p-5"
                >
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                    <Icon size={18} />
                  </span>
                  <h3 className="relative mt-4 font-display text-[1.35rem] leading-tight text-foreground sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </AtmosphereFrame>
              );
            })}
          </div>
        </div>

        {placement?.isActive && placement.imageUrl ? (
          <SectionFeatureImage
            placement={placement}
            tone="founders"
            className="min-h-[15rem] sm:min-h-[17rem] lg:min-h-[18rem]"
            sizes="(min-width: 1280px) 32vw, (min-width: 1024px) 38vw, 100vw"
          >
            <div className="w-full p-4 sm:p-5">
              <p className="premium-kicker">Protected Room</p>
              <p className="mt-2 max-w-sm text-base leading-tight text-white sm:text-lg">
                Built to feel quieter, more serious and more useful than a public feed.
              </p>
            </div>
          </SectionFeatureImage>
        ) : (
          <AtmosphereFrame className="min-h-[15rem] rounded-[1.75rem] border border-gold/22 bg-[linear-gradient(135deg,rgba(21,42,77,0.84),rgba(4,9,22,0.96)_48%,rgba(166,132,60,0.18))] p-5 shadow-gold-soft sm:min-h-[17rem]">
            <div className="relative flex h-full min-h-[12rem] flex-col justify-end sm:min-h-[14rem]">
              <p className="premium-kicker">Protected Room</p>
              <p className="mt-3 max-w-sm font-display text-2xl leading-tight text-foreground sm:text-3xl">
                A quieter digital room for real business context.
              </p>
            </div>
          </AtmosphereFrame>
        )}
      </div>
    </section>
  );
}

function WhatChangesAfterJoiningSection() {
  return (
    <section className={HOME_SECTION_CLASS}>
      <SectionHeading
        label="What changes after joining"
        title="The room gives useful conversations somewhere to happen."
        description="BCN becomes valuable when members show up with signal: clear context, clear asks, useful offers and a willingness to contribute."
        className={HOME_SECTION_HEADING_CLASS}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {WHAT_CHANGES_AFTER_JOINING.map((item, index) => {
          const Icon = item.icon;

          return (
            <AtmosphereFrame
              key={item.title}
              className={cn(
                "group rounded-[1.55rem] border p-4 shadow-panel-soft transition duration-300 hover:-translate-y-1 hover:shadow-gold-soft sm:p-5",
                index === 0
                  ? "border-gold/28 bg-gradient-to-br from-gold/12 via-card/72 to-card/64"
                  : "border-border/80 bg-card/66 hover:border-gold/28"
              )}
            >
              <div className="relative flex min-h-[10rem] flex-col sm:min-h-[11rem]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-display text-[1.4rem] leading-tight text-foreground sm:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                <span className="mt-auto pt-4 text-[11px] uppercase tracking-[0.08em] text-silver">
                  Room signal 0{index + 1}
                </span>
              </div>
            </AtmosphereFrame>
          );
        })}
      </div>
    </section>
  );
}

function InsideFallbackVisual({
  title,
  icon: Icon
}: {
  title: string;
  icon: (typeof INSIDE_FEATURE_CARDS)[number]["icon"];
}) {
  return (
    <div className="relative flex aspect-[16/9] items-end overflow-hidden border-b border-border/70 bg-[linear-gradient(135deg,rgba(34,65,118,0.52),rgba(4,10,24,0.96)_48%,rgba(207,171,90,0.16))] p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.48))]" />
      <div className="relative flex w-full items-end justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/28 bg-gold/10 text-gold">
          <Icon size={18} />
        </span>
        <span className="max-w-[8rem] text-right text-[11px] uppercase tracking-[0.08em] text-silver">
          {title}
        </span>
      </div>
    </div>
  );
}

function InsideEnvironmentCard({
  title,
  description,
  placement,
  icon: Icon,
  tone
}: {
  title: string;
  description: string;
  placement?: VisualMediaRenderablePlacement | null;
  icon: (typeof INSIDE_FEATURE_CARDS)[number]["icon"];
  tone: (typeof INSIDE_FEATURE_CARDS)[number]["tone"];
}) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.65rem] border border-border/80 bg-card/70 shadow-panel-soft transition duration-300 hover:-translate-y-1 hover:border-gold/28 hover:bg-card/82 hover:shadow-gold-soft sm:rounded-[1.8rem]">
      {placement?.isActive && placement.imageUrl ? (
        <SectionFeatureImage
          placement={placement}
          tone={tone}
          aspectClassName="aspect-[16/9]"
          className="min-h-[10rem] rounded-none border-0 bg-transparent shadow-none before:hidden sm:min-h-[11rem]"
          sizes="(min-width: 1280px) 23vw, (min-width: 768px) 45vw, 100vw"
        >
          <div className="w-full p-4 sm:p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold/24 bg-background/42 text-gold backdrop-blur">
              <Icon size={18} />
            </span>
          </div>
        </SectionFeatureImage>
      ) : (
        <InsideFallbackVisual title={title} icon={Icon} />
      )}

      <div className="space-y-2.5 p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
          Inside the room
        </p>
        <h3 className="font-display text-[1.45rem] leading-tight text-foreground sm:text-[1.55rem]">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </article>
  );
}

function InsideEnvironmentSection({
  placements
}: {
  placements: Record<InsidePlacementKey, VisualMediaRenderablePlacement | null>;
}) {
  return (
    <section id="how-it-works" className={HOME_SECTION_CLASS}>
      <SectionHeading
        label="How the environment works"
        title="Rooms, profiles, resources and conversations create one operating environment."
        description="The value is not one feature. It is the way rooms, profiles, resources, calls, collaborations, wins and insight create a more useful operating environment around the business."
        className={HOME_SECTION_HEADING_CLASS}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {INSIDE_FEATURE_CARDS.map((item) => (
          <InsideEnvironmentCard
            key={item.title}
            title={item.title}
            description={item.description}
            placement={placements[item.placementKey]}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
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
    <section className={HOME_SECTION_CLASS} aria-label="Founder Signals">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.62fr)]">
        <AtmosphereFrame className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-5 shadow-gold-soft sm:p-6 lg:p-7">
          <div className="relative">
            <p className="premium-kicker">Founder Signals</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl">
              What BCN is noticing before people join.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
              Public-safe observations from the founder-led environment. No private member data,
              no admin detail, just the signals shaping better public conversations.
            </p>

            {latestInsight ? (
              <Link
                href={`/insights/${latestInsight.slug}`}
                className="mt-5 block rounded-[1.25rem] border border-white/10 bg-background/24 p-4 transition-colors hover:border-gold/28 hover:bg-background/32"
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

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Link
                href="/insights"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                Open insights hub
              </Link>
              <TrackedPublicCtaLink
                href={buildFounderAuditHref({ source: "home", topic: "founder-signals" })}
                label="Run the Founder Audit"
                source="home"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              />
            </div>
          </div>
        </AtmosphereFrame>

        <div className="grid gap-2.5 sm:gap-3">
          {PUBLIC_SIGNAL_ITEMS.map((item, index) => (
            <article
              key={item.title}
              className="group rounded-[1.35rem] border border-border/80 bg-card/64 p-4 shadow-panel-soft transition duration-300 hover:-translate-y-1 hover:border-gold/28 hover:bg-card/78 sm:p-5"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/24 bg-gold/10 text-xs text-gold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    Public signal
                  </p>
                  <h3 className="mt-1.5 font-display text-[1.35rem] leading-tight text-foreground sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MembershipInvitationSection({
  placement
}: {
  placement: VisualMediaRenderablePlacement | null;
}) {
  return (
    <section className={HOME_SECTION_CLASS}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(300px,0.72fr)] xl:items-stretch">
        <AtmosphereFrame className="rounded-[1.9rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/78 to-card/68 p-5 shadow-gold-soft sm:p-6 lg:p-7">
          <div className="relative flex h-full flex-col">
            <p className="premium-kicker">Membership invitation</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Join when you want the room, not another feed.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
              Membership opens the private business environment: a clearer place to build trust,
              ask properly, offer help, find useful introductions and keep momentum moving with
              people who understand ownership.
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <TrackedPublicCtaLink
                href={STEP_INSIDE_HREF}
                label="Step Inside"
                source="home"
                showArrow
                className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
              />
              <TrackedPublicCtaLink
                href="/membership"
                label="Explore Membership"
                source="home"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              />
              <TrackedPublicCtaLink
                href={buildFounderAuditHref({ source: "home", topic: "membership-invitation" })}
                label="Run the Founder Audit"
                source="home"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-gold/20 bg-background/24 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">For</p>
                <div className="mt-3 grid gap-2.5">
                  {FOR_AUDIENCE.map((item) => (
                    <p key={item} className="text-sm leading-relaxed text-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-background/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Not for</p>
                <div className="mt-3 grid gap-2.5">
                  {NOT_FOR_AUDIENCE.map((item) => (
                    <p key={item} className="text-sm leading-relaxed text-muted">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AtmosphereFrame>

        <div className="grid gap-4">
          <FirstSevenDaysBlock frame="panel" className="h-full" />

          {placement?.isActive && placement.imageUrl ? (
            <SectionFeatureImage
              placement={placement}
              tone="platform"
              aspectClassName="aspect-[16/9]"
              className="min-h-[14rem] sm:min-h-[16rem]"
              sizes="(min-width: 1280px) 28vw, (min-width: 1024px) 34vw, 100vw"
            >
              <div className="w-full p-4 sm:p-5">
                <p className="premium-kicker">First week</p>
                <p className="mt-2 max-w-sm text-base leading-tight text-white sm:text-lg">
                  A structured start so the room feels useful from the first few moves.
                </p>
              </div>
            </SectionFeatureImage>
          ) : null}
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
    <section className={HOME_SECTION_CLASS}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,0.9fr)] lg:items-center">
        <SectionHeading
          label="Approved member proof"
          title="Real words, shown once, with permission."
          description="The homepage uses one approved proof carousel. It rotates public testimonials without duplicating them across trust blocks."
          className={HOME_SECTION_HEADING_CLASS}
        />

        {testimonials.length ? (
          <TestimonialCarousel testimonials={testimonials} />
        ) : (
          <AtmosphereFrame className="rounded-[1.7rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
            <div className="relative">
              <Sparkles size={18} className="text-gold" />
              <h3 className="mt-4 font-display text-3xl leading-tight text-foreground">
                Approved member proof will appear here when it is ready.
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                BCN only uses public testimonials when they are approved and permissioned. Until
                then, the stronger trust signal is the standard: private by design, founder-led and
                careful with member context.
              </p>
            </div>
          </AtmosphereFrame>
        )}
      </div>
    </section>
  );
}

function TrustAndStandardsSection() {
  return (
    <section className={HOME_SECTION_CLASS}>
      <AtmosphereFrame className="rounded-[1.85rem] border border-border/80 bg-card/60 p-5 shadow-panel-soft sm:p-6 lg:p-7">
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,0.56fr)_minmax(0,1fr)] lg:items-start">
          <SectionHeading
            label="Trust and standards"
            title="The room has to be protected before it can be useful."
            description="BCN keeps public proof, member privacy, payment trust and company credibility in one clear place."
            className={HOME_SECTION_HEADING_CLASS}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {TRUST_STANDARDS.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-[1.25rem] border border-white/10 bg-background/24 p-4 transition duration-300 hover:border-gold/24 hover:bg-background/32"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                      <Icon size={17} />
                    </span>
                    <div>
                      <h3 className="font-display text-lg leading-tight text-foreground sm:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </AtmosphereFrame>
    </section>
  );
}

function FinalCinematicCta() {
  return (
    <section className={HOME_SECTION_CLASS}>
      <AtmosphereFrame className="rounded-[2rem] border border-gold/24 bg-[linear-gradient(135deg,rgba(28,57,111,0.78),rgba(3,8,20,0.98)_45%,rgba(190,152,75,0.18))] px-5 py-8 shadow-gold-soft sm:px-8 sm:py-10 lg:px-10">
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="premium-kicker mx-auto max-w-fit">Next step</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Step into the better room.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
            Step inside when the room already feels right, run the Founder Audit if you want
            clarity first, or review membership before choosing your path.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <TrackedPublicCtaLink
              href={STEP_INSIDE_HREF}
              label="Step Inside"
              source="home"
              showArrow
              className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
            />
            <TrackedPublicCtaLink
              href={buildFounderAuditHref({ source: "home", topic: "final-cta" })}
              label="Run the Founder Audit"
              source="home"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            />
            <TrackedPublicCtaLink
              href="/membership"
              label="Explore Membership"
              source="home"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            />
          </div>
        </div>
      </AtmosphereFrame>
    </section>
  );
}

export default async function HomePage() {
  const [
    homeHeroPlacement,
    homeConnectionPlacement,
    homePlatformPlacement,
    homeJoinPlacement,
    homeRoomsPlacement,
    homeResourcesPlacement,
    homeCallsPlacement,
    homeCollaborationsPlacement,
    homeWinsPlacement,
    homeEcosystemPlacement,
    approvedPublicTestimonials
  ] = await Promise.all([
    getVisualMediaPlacement("home.hero"),
    getVisualMediaPlacement("home.section.connection"),
    getVisualMediaPlacement("home.section.platform"),
    getVisualMediaPlacement("home.section.join"),
    getVisualMediaPlacement("home.section.roomsPreview"),
    getVisualMediaPlacement("home.section.resourcesPreview"),
    getVisualMediaPlacement("home.section.callsPreview"),
    getVisualMediaPlacement("home.section.collaborationsPreview"),
    getVisualMediaPlacement("home.section.winsPreview"),
    getVisualMediaPlacement("home.section.ecosystemMap"),
    listHomeApprovedProofTestimonials()
  ]);
  const publicInsights = listPublicInsights();
  const latestPublicInsight = publicInsights[0] ?? null;
  const insidePlacements: Record<InsidePlacementKey, VisualMediaRenderablePlacement | null> = {
    rooms: homeRoomsPlacement,
    resources: homeResourcesPlacement,
    calls: homeCallsPlacement,
    group: homePlatformPlacement,
    collaborations: homeCollaborationsPlacement,
    wins: homeWinsPlacement,
    profiles: homePlatformPlacement,
    insight: homeEcosystemPlacement
  };
  const carouselTestimonials = approvedPublicTestimonials.map(
    (testimonial): CarouselTestimonial => ({
      id: testimonial.id,
      quote: testimonial.quote,
      outcome: testimonial.outcome,
      rating: testimonial.rating,
      authorName: testimonial.authorName,
      authorRole: testimonial.authorRole,
      businessName: testimonial.businessName,
      businessWebsite: testimonial.businessWebsite,
      imageUrl: testimonial.imageUrl
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
        tone="immersive"
        contentClassName="gap-3 px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10"
      >
        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap">
          <TrackedPublicCtaLink
            href={STEP_INSIDE_HREF}
            label="Step Inside"
            source="home"
            showArrow
            className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
          />
          <TrackedPublicCtaLink
            href={buildFounderAuditHref({ source: "home", topic: "hero" })}
            label="Run the Founder Audit"
            source="home"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          />
          <TrackedPublicCtaLink
            href="/membership"
            label="Explore Membership"
            source="home"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          />
        </div>

        <div className="mt-2 hidden max-w-4xl grid-cols-3 gap-2.5 sm:grid">
          {HERO_SIGNALS.map((signal) => (
            <div
              key={signal}
              className="rounded-[1.15rem] border border-white/12 bg-background/24 px-4 py-3 text-xs uppercase tracking-[0.08em] text-white/78 backdrop-blur"
            >
              {signal}
            </div>
          ))}
        </div>
      </PublicTopVisual>

      <WhatBcnActuallyIsSection placement={homeConnectionPlacement} />

      <WhatChangesAfterJoiningSection />

      <FounderSignalsSection latestInsight={latestPublicInsight} />

      <InsideEnvironmentSection placements={insidePlacements} />

      <MembershipInvitationSection placement={homeJoinPlacement} />

      <ApprovedMemberProofSection testimonials={carouselTestimonials} />

      <TrustAndStandardsSection />

      <FounderAuditCta
        source="home"
        topic="homepage-proof"
        title="Want a clearer read before you choose?"
        description="The Founder Audit gives business owners a calm owner-readiness checkpoint before stepping into membership."
        membershipLabel="Explore Membership"
      />

      <FinalCinematicCta />
    </div>
  );
}
