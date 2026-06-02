import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType
} from "@prisma/client";
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
  Star,
  Target,
  Users
} from "lucide-react";
import { JsonLd } from "@/components/public";
import { SectionFeatureImage } from "@/components/visual-media";
import { VisualPlacementBackground } from "@/components/visual-media/visual-placement-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema, buildFounderSchema } from "@/lib/structured-data";
import { absoluteUrl, cn, formatDate } from "@/lib/utils";
import { getFounderServicePricing, isGrowthArchitectServiceSlug } from "@/lib/founder";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { listActiveFounderServices } from "@/server/founder";
import { listApprovedTestimonials } from "@/server/testimonials";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Trevor Newton | Growth Architect Reviews & Business Clarity Audits",
  description:
    "Book a Growth Review with Trevor Newton for calm, practical analysis of what is holding your business back across clarity, trust, visibility, conversion, positioning, and growth.",
  path: "/founder"
});

const GROWTH_REVIEW_SERVICE_PATH = "/founder/services/growth-architect-clarity-audit";
const CONVERSATION_HREF = "/contact?source=founder-growth-architect";

const SERVICE_COPY: Record<
  string,
  {
    label?: string;
    description: string;
    includes: string[];
  }
> = {
  "growth-architect-clarity-audit": {
    label: "Best first step",
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
    label: "After review",
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

const REALITY_LINES = [
  "Most business owners work incredibly hard.",
  "They invest in websites, marketing, social media, advertising, and networking.",
  "Yet growth can still feel harder than it should.",
  "Not because they lack effort, but because they are too close to the business to see what is really happening."
] as const;

const AUDIT_AREAS = [
  {
    title: "Trust Signals",
    description: "Proof, credibility cues, reviews, consistency, guarantees, and reassurance.",
    icon: ShieldCheck
  },
  {
    title: "Website Experience",
    description: "How quickly a serious visitor understands the offer, path, and next step.",
    icon: Eye
  },
  {
    title: "Conversion Opportunities",
    description: "The moments where clarity, proof, or sequence could turn attention into enquiry.",
    icon: Target
  },
  {
    title: "Customer Journey",
    description: "How someone moves from first impression to confidence, contact, and decision.",
    icon: Compass
  },
  {
    title: "SEO Visibility",
    description: "The search foundations that help the right people find and understand the business.",
    icon: Search
  },
  {
    title: "AI Search Readiness",
    description: "How easily answer engines can interpret, trust, and summarise what you do.",
    icon: Globe2
  },
  {
    title: "Positioning",
    description: "Whether the business feels distinct, relevant, credible, and commercially clear.",
    icon: BadgeCheck
  },
  {
    title: "Messaging",
    description: "The words, structure, and emphasis that shape how buyers read the business.",
    icon: MessageSquareText
  },
  {
    title: "Competitive Advantages",
    description: "The strengths that should be more visible, sharper, or better evidenced.",
    icon: Sparkles
  },
  {
    title: "Missed Revenue Opportunities",
    description: "Underused offers, weak enquiry paths, hidden value, or overlooked buyer moments.",
    icon: FileSearch
  },
  {
    title: "Business Processes",
    description: "The operational gaps that create friction, delay, or avoidable owner pressure.",
    icon: CheckCircle2
  },
  {
    title: "Growth Bottlenecks",
    description: "The few issues most likely to keep growth feeling heavier than it needs to be.",
    icon: Users
  }
] as const;

const VIBE_METHOD = [
  {
    step: "Discover",
    description: "Understand the business, offer, customer, current activity, and owner context."
  },
  {
    step: "Analyse",
    description: "Review the website, trust signals, visibility, journey, messaging, and friction."
  },
  {
    step: "Identify",
    description: "Separate symptoms from causes so the real constraint becomes visible."
  },
  {
    step: "Prioritise",
    description: "Turn the findings into an order of action, not a long list of overwhelm."
  },
  {
    step: "Implement",
    description: "Support the practical changes that improve clarity, trust, conversion, and flow."
  },
  {
    step: "Measure",
    description: "Look at what changed, what moved, and what the next intelligent step should be."
  }
] as const;

const FOUNDER_STORY = [
  "Trevor has been working since the age of 15, moving through factory work, engineering, agency work, and eventually building businesses of his own.",
  "That route shaped the way he looks at growth. He is interested in what actually works, what creates trust, what removes friction, and what helps an owner make better decisions under real pressure.",
  "Personal challenges and years spent helping business owners have made the work more grounded, not more dramatic. The point is not performance. It is clarity.",
  "The Business Circle Network grew from the same belief: serious business owners need calmer rooms, sharper thinking, and people around them who care about long-term progress."
] as const;

const CASE_STUDY_PATTERNS = [
  {
    title: "Strong service, unclear first impression",
    problem: "The business was useful, but the website made visitors work too hard to understand fit.",
    opportunity: "Clarify the offer, move proof closer to the decision point, and simplify the enquiry path.",
    outcome: "The owner gets a cleaner order of improvements before spending more on traffic."
  },
  {
    title: "Credible business, hidden trust",
    problem: "Reviews, expertise, process, and reassurance existed, but were scattered or buried.",
    opportunity: "Make trust visible earlier and connect proof to the buyer questions it answers.",
    outcome: "The business feels easier to believe before a visitor reaches the contact step."
  },
  {
    title: "Busy activity, weak commercial focus",
    problem: "Marketing channels were active, but the message and next step were pulling in different directions.",
    opportunity: "Tighten positioning, align content around buyer intent, and remove journey friction.",
    outcome: "The owner can focus on the few changes most likely to improve clarity and enquiries."
  }
] as const;

const WHO_FOR = [
  "Local businesses that want clearer visibility and stronger trust.",
  "Trades and service businesses that know their work is good but under-explained online.",
  "Founders who want external strategic eyes before spending more money.",
  "Professional services firms that need sharper positioning and proof.",
  "Growing companies ready to improve their website, journey, and decision process.",
  "Owners who want practical direction, not generic marketing noise."
] as const;

const AEO_QUESTIONS = [
  {
    question: "What is a Growth Architect?",
    answer:
      "A Growth Architect looks at how a business is understood, trusted, found, and acted on, then turns hidden gaps into practical growth priorities."
  },
  {
    question: "What happens in a Growth Review?",
    answer:
      "Trevor reviews the business presence, website experience, trust signals, visibility, customer journey, positioning, and conversion opportunities before recommending practical next steps."
  },
  {
    question: "Is this just an SEO audit?",
    answer:
      "No. Search visibility is included, but the review also looks at clarity, trust, positioning, messaging, conversion friction, buyer confidence, and missed commercial opportunities."
  },
  {
    question: "Who is this for?",
    answer:
      "It is for business owners who know something is holding growth back, but want a calm outside view before they make another marketing, website, or strategic decision."
  }
] as const;

const SERVICE_ORDER = [
  "growth-architect-clarity-audit",
  "growth-architect-growth-strategy",
  "growth-architect-full-growth-architect"
] as const;

type FounderPlacement = Awaited<ReturnType<typeof getVisualMediaPlacement>>;

function billingSuffix(billingType: "ONE_TIME" | "MONTHLY_RETAINER") {
  return billingType === "MONTHLY_RETAINER" ? "/month" : "";
}

function growthReviewHref(sourceSection: string) {
  const params = new URLSearchParams({
    sourcePage: "Founder Page",
    sourceSection: `Book Growth Review ${sourceSection}`
  });

  return `${GROWTH_REVIEW_SERVICE_PATH}?${params.toString()}`;
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

function toRenderablePlacement(
  placement: FounderPlacement | null | undefined,
  mobilePlacement?: FounderPlacement | null | undefined
): VisualMediaRenderablePlacement | null {
  const mobileImageUrl =
    mobilePlacement?.isActive && mobilePlacement.imageUrl ? mobilePlacement.imageUrl : null;

  return placement?.isActive && placement.imageUrl
    ? ({
        ...placement,
        mobileImageUrl: mobileImageUrl ?? placement.mobileImageUrl,
        supportsMobile: Boolean(mobileImageUrl || placement.supportsMobile)
      } satisfies VisualMediaRenderablePlacement)
    : null;
}

function FounderSectionHeader({
  eyebrow,
  title,
  intro,
  align = "left"
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-4xl space-y-3", align === "center" ? "mx-auto text-center" : "")}>
      <p className={cn("premium-kicker", align === "center" ? "mx-auto" : "")}>{eyebrow}</p>
      <h2 className="font-display text-2xl leading-tight tracking-normal text-foreground sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {intro ? <p className="text-base leading-relaxed text-muted sm:text-lg">{intro}</p> : null}
    </div>
  );
}

function FounderVisual({
  placement,
  mobilePlacement,
  tone = "editorial",
  className,
  aspectClassName = "aspect-[16/10]",
  sizes,
  children
}: {
  placement: FounderPlacement | null | undefined;
  mobilePlacement?: FounderPlacement | null | undefined;
  tone?: "human" | "story" | "platform" | "founders" | "editorial";
  className?: string;
  aspectClassName?: string;
  sizes?: string;
  children?: ReactNode;
}) {
  const renderablePlacement = toRenderablePlacement(placement, mobilePlacement);

  if (renderablePlacement) {
    return (
      <SectionFeatureImage
        placement={renderablePlacement}
        tone={tone}
        aspectClassName={aspectClassName}
        className={cn("w-full max-w-full min-w-0 overflow-hidden", className)}
        sizes={sizes}
      >
        {children}
      </SectionFeatureImage>
    );
  }

  return (
    <div
      className={cn(
        "feature-visual-shell relative w-full max-w-full min-w-0 overflow-hidden rounded-[1.6rem] border border-silver/20 bg-[linear-gradient(145deg,rgba(9,28,69,0.8),rgba(6,12,28,0.96)_52%,rgba(4,9,22,0.98))] shadow-panel-soft",
        aspectClassName,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.5)_100%)]" />
      {children ? <div className="relative z-[2] flex h-full min-w-0 items-end">{children}</div> : null}
    </div>
  );
}

function FounderHeroBackground({
  placement,
  mobilePlacement
}: {
  placement: FounderPlacement | null | undefined;
  mobilePlacement?: FounderPlacement | null | undefined;
}) {
  const renderablePlacement = toRenderablePlacement(placement, mobilePlacement);

  if (renderablePlacement) {
    return (
      <VisualPlacementBackground
        placement={renderablePlacement}
        tone="immersive"
        sizes="100vw"
        className="absolute inset-0"
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(7,22,55,0.98)_0%,rgba(5,11,25,0.96)_46%,rgba(2,6,15,0.99)_100%)]">
      <div className="absolute inset-0 public-grid-overlay opacity-10" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,15,0.18),rgba(2,6,15,0.78)_72%,rgba(2,6,15,0.92))]" />
    </div>
  );
}

function GrowthReviewActions({
  sourceSection,
  secondaryLabel = "Start A Conversation",
  stackOnMobile = true
}: {
  sourceSection: string;
  secondaryLabel?: string;
  stackOnMobile?: boolean;
}) {
  const href = growthReviewHref(sourceSection);

  return (
    <div className={cn("gap-3", stackOnMobile ? "grid sm:flex sm:flex-wrap" : "flex flex-wrap")}>
      <Link href={href} className={cn(stackOnMobile ? "w-full sm:w-auto" : "")}>
        <Button size="lg" className="group w-full sm:w-auto">
          Book A Growth Review
          <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
      <Link href={CONVERSATION_HREF} className={cn(stackOnMobile ? "w-full sm:w-auto" : "")}>
        <Button size="lg" variant="outline" className="w-full sm:w-auto">
          {secondaryLabel}
        </Button>
      </Link>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const safeRating = Math.min(Math.max(Math.round(rating), 1), 5);

  return (
    <div className="flex items-center gap-1 text-gold" aria-label={`${safeRating} out of 5`}>
      {Array.from({ length: safeRating }).map((_, index) => (
        <Star key={index} size={14} className="fill-current" />
      ))}
    </div>
  );
}

export default async function FounderPage() {
  const [
    session,
    allServices,
    growthArchitectTestimonials,
    founderHeroPlacement,
    founderHeroMobilePlacement,
    founderStoryPlacement,
    founderStoryMobilePlacement,
    founderGrowthArchitecturePlacement,
    founderGrowthArchitectureMobilePlacement,
    founderAuditPlacement,
    founderAuditMobilePlacement,
    founderProofPlacement,
    founderProofMobilePlacement,
    founderFinalCtaPlacement,
    founderFinalCtaMobilePlacement
  ] = await Promise.all([
    auth(),
    listActiveFounderServices().catch(() => []),
    listApprovedTestimonials({
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      location: TestimonialDisplayLocation.FOUNDER_PAGE,
      category: [
        TestimonialCategory.GROWTH_ARCHITECT,
        TestimonialCategory.FOUNDER_AUDIT,
        TestimonialCategory.STRATEGY_CALL
      ],
      limit: 8
    }).catch(() => []),
    getVisualMediaPlacement("founder.hero"),
    getVisualMediaPlacement("founder.heroMobile"),
    getVisualMediaPlacement("founder.story"),
    getVisualMediaPlacement("founder.storyMobile"),
    getVisualMediaPlacement("founder.growthArchitecture"),
    getVisualMediaPlacement("founder.growthArchitectureMobile"),
    getVisualMediaPlacement("founder.audit"),
    getVisualMediaPlacement("founder.auditMobile"),
    getVisualMediaPlacement("founder.proof"),
    getVisualMediaPlacement("founder.proofMobile"),
    getVisualMediaPlacement("founder.finalCta"),
    getVisualMediaPlacement("founder.finalCtaMobile")
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
  const ratedTestimonials = growthArchitectTestimonials.filter(
    (testimonial) => typeof testimonial.rating === "number"
  );
  const averageRating = ratedTestimonials.length
    ? ratedTestimonials.reduce((total, testimonial) => total + (testimonial.rating ?? 0), 0) /
      ratedTestimonials.length
    : null;
  const caseStudyTestimonials = growthArchitectTestimonials
    .filter((testimonial) => testimonial.outcome)
    .slice(0, 3);

  return (
    <div className="max-w-full overflow-x-clip">
      <JsonLd data={buildFounderSchema()} />
      <JsonLd data={buildFaqSchema([...AEO_QUESTIONS])} />
      <JsonLd data={buildFounderServicesSchema(services)} />

      <section className="relative min-h-[calc(100svh-5rem)] overflow-hidden">
        <FounderHeroBackground
          placement={founderHeroPlacement}
          mobilePlacement={founderHeroMobilePlacement}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,15,0.9)_0%,rgba(2,6,15,0.74)_46%,rgba(2,6,15,0.32)_100%)]" />
        <div className="relative z-[2] flex min-h-[calc(100svh-5rem)] items-end">
          <div className="bcn-container w-full pb-7 pt-16 sm:pb-9 lg:pb-10">
            <div className="max-w-5xl space-y-6">
              <Badge variant="outline" className="w-fit border-gold/40 bg-gold/12 text-gold">
                Trevor Newton | Growth Architect
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-5xl font-display text-4xl leading-[1.03] tracking-normal text-foreground sm:text-5xl lg:text-7xl">
                  Most businesses do not have a traffic problem.
                  <span className="block text-gold">They have a clarity problem.</span>
                </h1>
                <p className="max-w-3xl text-base leading-relaxed text-white/82 sm:text-xl">
                  I help business owners identify what is holding their business back, uncover
                  hidden opportunities, and create practical growth strategies built on trust,
                  visibility, and long-term success.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={growthReviewHref("Hero")} className="w-full sm:w-auto">
                  <Button size="lg" className="group w-full sm:w-auto">
                    Book A Growth Review
                    <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="#vibe-method" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full border-silver/24 sm:w-auto">
                    See How I Work
                  </Button>
                </Link>
              </div>
              <div className="grid max-w-4xl gap-3 pt-2 sm:grid-cols-3">
                {[
                  "Business clarity review",
                  "Trust and conversion analysis",
                  "Practical growth direction"
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.15rem] border border-white/10 bg-background/28 px-4 py-3 text-sm text-silver backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="public-page-stack max-w-full overflow-x-clip">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)] xl:items-stretch">
          <div className="space-y-5">
            <FounderSectionHeader
              eyebrow="The Reality"
              title="You are probably closer to the answer than you think."
              intro="Growth often feels stuck because the owner is carrying the business from the inside. A fresh, structured view can make the next move obvious."
            />
            <div className="grid gap-3">
              {REALITY_LINES.map((line, index) => (
                <div
                  key={line}
                  className={cn(
                    "rounded-[1.35rem] border border-white/10 bg-card/62 px-5 py-4 text-base leading-relaxed shadow-panel-soft",
                    index === REALITY_LINES.length - 1 ? "border-gold/28 bg-gold/10 text-foreground" : "text-muted"
                  )}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <FounderVisual
            placement={founderGrowthArchitecturePlacement}
            mobilePlacement={founderGrowthArchitectureMobilePlacement}
            tone="editorial"
            aspectClassName="aspect-[4/5] sm:aspect-[16/10] xl:aspect-auto"
            className="min-h-[18rem] xl:h-full"
            sizes="(min-width: 1280px) 34vw, 100vw"
          >
            <div className="w-full max-w-full min-w-0 p-4 sm:p-5">
              <div className="max-w-md rounded-[1.25rem] border border-white/10 bg-background/48 p-4 backdrop-blur">
                <p className="premium-kicker">Clarity Lens</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Step back. Analyse the whole picture. Identify what is working, what is missing,
                  and what should happen next.
                </p>
              </div>
            </div>
          </FounderVisual>
        </section>

        <section className="space-y-5">
          <FounderSectionHeader
            eyebrow="Results, Feedback & Founder Proof"
            title="What business owners say."
            intro={
              growthArchitectTestimonials.length
                ? "Approved feedback from Growth Architect audits, strategy sessions, and founder-led review work."
                : "Approved Growth Architect testimonials will appear here as soon as clients give permission to publish them."
            }
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:items-stretch">
            <FounderVisual
              placement={founderProofPlacement}
              mobilePlacement={founderProofMobilePlacement}
              tone="human"
              aspectClassName="aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto"
              className="min-h-[16rem] lg:h-full"
              sizes="(min-width: 1280px) 28vw, 100vw"
            >
              <div className="w-full p-4 sm:p-5">
                <div className="rounded-[1.25rem] border border-white/10 bg-background/48 p-4 backdrop-blur">
                  <p className="premium-kicker">Trust first</p>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="font-display text-3xl text-foreground">
                        {growthArchitectTestimonials.length || "0"}
                      </p>
                      <p className="text-sm text-muted">Approved public testimonials</p>
                    </div>
                    <div>
                      <p className="font-display text-3xl text-foreground">
                        {averageRating ? averageRating.toFixed(1) : "-"}
                      </p>
                      <p className="text-sm text-muted">Average rating where provided</p>
                    </div>
                  </div>
                </div>
              </div>
            </FounderVisual>

            {growthArchitectTestimonials.length ? (
              <div className="-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:gap-4 sm:px-0">
                {growthArchitectTestimonials.map((testimonial) => (
                  <article
                    key={testimonial.id}
                    className="min-w-[18rem] max-w-[24rem] snap-start rounded-[1.25rem] border border-white/10 bg-card/72 p-4 shadow-panel-soft sm:min-w-[22rem] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{testimonial.authorName}</p>
                        {testimonial.businessName ? (
                          <p className="text-sm text-muted">{testimonial.businessName}</p>
                        ) : null}
                        {testimonial.authorRole ? (
                          <p className="text-xs text-silver">{testimonial.authorRole}</p>
                        ) : null}
                      </div>
                      {testimonial.rating ? <RatingStars rating={testimonial.rating} /> : null}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-muted">
                      &quot;{testimonial.quote}&quot;
                    </p>
                    {testimonial.outcome ? (
                      <p className="mt-4 rounded-[1rem] border border-gold/20 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-foreground">
                        {testimonial.outcome}
                      </p>
                    ) : null}
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
                <CardContent className="p-5 text-sm leading-relaxed text-muted sm:p-6">
                  This page is ready for approved review ratings, client feedback, and public proof.
                  Nothing is manufactured while permissioned testimonials are still being gathered.
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <FounderSectionHeader
            eyebrow="What I Analyse"
            title="The gaps are usually hiding in plain sight."
            intro="A Growth Review looks across the full business picture, not just one channel or one report."
          />

          <FounderVisual
            placement={founderAuditPlacement}
            mobilePlacement={founderAuditMobilePlacement}
            tone="editorial"
            aspectClassName="aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/8]"
            className="min-h-[14rem] max-h-[24rem]"
            sizes="(min-width: 1280px) 72vw, 100vw"
          >
            <div className="w-full max-w-full min-w-0 p-4 sm:p-5">
              <div className="w-full max-w-xl min-w-0 rounded-[1.25rem] border border-white/10 bg-background/48 p-4 backdrop-blur">
                <p className="premium-kicker">Audit dashboard</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Trust, visibility, positioning, conversion, journey, and process reviewed as one
                  connected system.
                </p>
              </div>
            </div>
          </FounderVisual>

          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {AUDIT_AREAS.map((area) => {
              const Icon = area.icon;

              return (
                <Card key={area.title} className="border-border/90 bg-card/68 shadow-panel-soft">
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                      <Icon size={18} />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl tracking-normal text-foreground">
                        {area.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted">{area.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section
          id="vibe-method"
          className="grid gap-6 xl:grid-cols-[minmax(0,0.48fr)_minmax(0,1fr)] xl:items-stretch"
        >
          <FounderVisual
            placement={founderGrowthArchitecturePlacement}
            mobilePlacement={founderGrowthArchitectureMobilePlacement}
            tone="platform"
            aspectClassName="aspect-[4/5] sm:aspect-[16/10] xl:aspect-auto"
            className="min-h-[18rem] xl:h-full"
            sizes="(min-width: 1280px) 34vw, 100vw"
          >
            <div className="w-full p-4 sm:p-5">
              <div className="rounded-[1.25rem] border border-gold/20 bg-background/50 p-4 backdrop-blur">
                <p className="premium-kicker">The VIBE Method</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  A calm framework for moving from complexity to commercial clarity.
                </p>
              </div>
            </div>
          </FounderVisual>

          <div className="space-y-5">
            <FounderSectionHeader
              eyebrow="Structured Approach"
              title="A structured approach to uncovering growth opportunities."
              intro="The VIBE Method is Trevor's working framework for finding what matters, what is missing, and what should be improved first."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {VIBE_METHOD.map((item, index) => (
                <div
                  key={item.step}
                  className="rounded-[1.35rem] border border-white/10 bg-card/68 p-4 shadow-panel-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-gold/10 font-display text-sm text-gold">
                      {index + 1}
                    </span>
                    <h3 className="font-display text-xl tracking-normal text-foreground">
                      {item.step}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)] xl:items-stretch">
          <Card className="border-border/90 bg-card/72 shadow-panel-soft">
            <CardHeader className="p-5 sm:p-6">
              <FounderSectionHeader eyebrow="Why I Do This" title="The founder story." />
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0 text-base leading-relaxed text-muted sm:p-6 sm:pt-0">
              {FOUNDER_STORY.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </CardContent>
          </Card>

          <FounderVisual
            placement={founderStoryPlacement}
            mobilePlacement={founderStoryMobilePlacement}
            tone="story"
            aspectClassName="aspect-[4/5] sm:aspect-[16/10] xl:aspect-auto"
            className="min-h-[18rem] xl:h-full"
            sizes="(min-width: 1280px) 34vw, 100vw"
          >
            <div className="w-full max-w-full min-w-0 space-y-3 p-4 sm:p-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                <MessageSquareText size={20} />
              </span>
              <div className="rounded-[1.25rem] border border-white/10 bg-background/48 p-4 backdrop-blur">
                <p className="premium-kicker">Founder note</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  The work is not about guru energy or generic advice. It is about looking properly,
                  naming what matters, and giving owners a clearer path forward.
                </p>
              </div>
            </div>
          </FounderVisual>
        </section>

        <section className="space-y-5">
          <FounderSectionHeader
            eyebrow="Case Studies"
            title="What happens when clarity improves."
            intro={
              caseStudyTestimonials.length
                ? "Approved outcomes from published Growth Architect feedback."
                : "Specific client names and outcomes only appear when approved for public use. Until then, these examples show the kind of problems a review is built to uncover."
            }
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {caseStudyTestimonials.length
              ? caseStudyTestimonials.map((testimonial) => (
                  <Card key={testimonial.id} className="border-gold/24 bg-card/72 shadow-panel-soft">
                    <CardHeader className="p-5">
                      <Badge variant="outline" className="w-fit border-gold/30 bg-gold/10 text-gold">
                        Approved outcome
                      </Badge>
                      <CardTitle className="mt-2 font-display text-2xl tracking-normal">
                        {testimonial.businessName ?? testimonial.authorName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5 pt-0">
                      <p className="text-sm leading-relaxed text-muted">
                        &quot;{testimonial.quote}&quot;
                      </p>
                      <p className="rounded-[1.15rem] border border-gold/20 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-foreground">
                        {testimonial.outcome}
                      </p>
                    </CardContent>
                  </Card>
                ))
              : CASE_STUDY_PATTERNS.map((item) => (
                  <Card key={item.title} className="border-border/90 bg-card/68 shadow-panel-soft">
                    <CardHeader className="p-5">
                      <Badge variant="outline" className="w-fit border-white/10 bg-background/20 text-silver">
                        Review pattern
                      </Badge>
                      <CardTitle className="mt-2 font-display text-2xl tracking-normal">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0 text-sm leading-relaxed">
                      <p className="text-muted">
                        <span className="text-silver">Problem found: </span>
                        {item.problem}
                      </p>
                      <p className="text-muted">
                        <span className="text-silver">Opportunity uncovered: </span>
                        {item.opportunity}
                      </p>
                      <p className="rounded-[1.15rem] border border-gold/18 bg-gold/10 px-4 py-3 text-foreground">
                        {item.outcome}
                      </p>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </section>

        <section id="services" className="space-y-5">
          <FounderSectionHeader
            eyebrow="Growth Reviews"
            title="Start with the right level of support."
            intro="Most owners should begin with a Growth Review, then decide whether a strategy session, ongoing support, or another practical step is the right move."
          />

          {services.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {services.map((service, index) => {
                const pricing = getFounderServicePricing(service, viewer);
                const currency = service.currency || "GBP";
                const hasPrice =
                  typeof pricing.finalAmount === "number" && !Number.isNaN(pricing.finalAmount);
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
                        <p className="font-display text-3xl tracking-normal text-foreground sm:text-4xl">
                          {service.billingType === "MONTHLY_RETAINER" ? "From " : ""}
                          {hasPrice
                            ? new Intl.NumberFormat("en-GB", {
                                style: "currency",
                                currency
                              }).format(pricing.finalAmount / 100)
                            : "Pricing unavailable"}
                          <span className="ml-1 text-base text-silver">
                            {billingSuffix(service.billingType)}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5 pt-0">
                      <div className="space-y-2">
                        {includes.map((item) => (
                          <div
                            key={item}
                            className="rounded-[1.15rem] border border-white/8 bg-background/18 px-4 py-3 text-sm text-foreground"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                      <Link
                        href={`/founder/services/${service.slug}?sourcePage=Founder%20Page&sourceSection=Founder%20Services`}
                      >
                        <Button className="group w-full" size="lg">
                          {index === 0 ? "Book A Growth Review" : service.ctaLabel}
                          <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardContent className="p-5 text-sm leading-relaxed text-muted sm:p-6">
                Growth Architect services are not available to book right now. Use the conversation
                link below and Trevor can confirm the right next step manually.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-5">
          <FounderSectionHeader
            eyebrow="Who I Work With"
            title="For serious owners who are ready to improve."
            intro="The work is best suited to businesses that want a clear view of what is happening and are willing to act on what the review finds."
          />
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {WHO_FOR.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-[1.25rem] border border-white/10 bg-card/66 px-4 py-4 text-sm leading-relaxed text-foreground shadow-panel-soft"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-gold" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <FounderVisual
            placement={founderFinalCtaPlacement}
            mobilePlacement={founderFinalCtaMobilePlacement}
            tone="founders"
            aspectClassName="aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/8]"
            className="min-h-[16rem] max-h-[28rem]"
            sizes="100vw"
          >
            <div className="w-full max-w-full min-w-0 p-4 sm:p-6">
              <div className="w-full max-w-3xl min-w-0 rounded-[1.35rem] border border-gold/20 bg-background/50 p-5 backdrop-blur">
                <p className="premium-kicker">Next step</p>
                <h2 className="mt-4 font-display text-2xl leading-tight tracking-normal text-foreground sm:text-4xl">
                  You do not need another generic marketing plan.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted">
                  You need to know what is actually holding your business back.
                </p>
              </div>
            </div>
          </FounderVisual>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.5fr)]">
            <Card className="border-border/90 bg-card/72 shadow-panel-soft">
              <CardHeader className="p-5 sm:p-6">
                <FounderSectionHeader
                  eyebrow="Final Conversion"
                  title="Sometimes the smallest insight creates the biggest change."
                />
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0 text-base leading-relaxed text-muted sm:p-6 sm:pt-0">
                <p>
                  A missing trust signal. A broken customer journey. An overlooked opportunity. A
                  positioning issue. A conversion problem.
                </p>
                <p>
                  Most businesses are closer to growth than they realise. The challenge is seeing
                  it clearly enough to act.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/84 to-card/74 shadow-gold-soft">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <p className="premium-kicker">Book</p>
                <h2 className="font-display text-2xl leading-tight tracking-normal text-foreground sm:text-3xl">
                  Book A Growth Review
                </h2>
                <p className="text-base leading-relaxed text-muted">
                  If something in the business feels harder than it should, start by letting Trevor
                  look properly at what is happening.
                </p>
                <GrowthReviewActions sourceSection="Final CTA" />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
          <Card className="border-border/90 bg-card/64 shadow-panel-soft">
            <CardHeader className="p-5 sm:p-6">
              <FounderSectionHeader
                eyebrow="BCN Connection"
                title="The Business Circle Network sits quietly behind the work."
              />
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0 text-base leading-relaxed text-muted sm:p-6 sm:pt-0">
              <p>
                Trevor is also the founder of The Business Circle Network, a private founder-led
                business environment created to help serious business owners connect, learn, and
                grow together.
              </p>
              <p>
                BCN is the wider environment. Growth Architect work stays focused on the direct
                review, analysis, and growth clarity business owners need before the next move.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card/64 shadow-panel-soft">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <p className="premium-kicker">Conversation</p>
              <h2 className="font-display text-2xl leading-tight tracking-normal text-foreground">
                Not sure where to start?
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Start a conversation and share what feels unclear in the business.
              </p>
              <Link href={CONVERSATION_HREF}>
                <Button size="lg" variant="outline" className="w-full">
                  Start A Conversation
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
