import type { Metadata } from "next";
import Link from "next/link";
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType
} from "@prisma/client";
import {
  JsonLd
} from "@/components/public";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Compass,
  Handshake,
  LineChart,
  LockKeyhole,
  MessageCircle,
  Rocket,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TestimonialSection } from "@/components/public/testimonial-section";
import { PublicTopVisual } from "@/components/visual-media";
import { MembershipGuidedSelector } from "@/components/public/membership-guided-selector";
import {
  resolveMembershipBillingInterval,
  resolveMembershipTierInput
} from "@/config/membership";
import {
  firstValue
} from "@/lib/join/routing";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildMembershipProductsSchema,
  buildServiceSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import {
  getFoundingOfferByTier,
  getFoundingOfferSnapshot
} from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MEMBERSHIP_KEYWORDS = [
  "business membership UK",
  "business network for owners",
  "private business community UK",
  "business owners network",
  "private founder-led business environment",
  "entrepreneur community UK",
  "business growth membership",
  "connect with business owners",
  "structured business support",
  "membership for business owners"
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Membership | Join The Business Circle Network",
  description:
    "Choose the right room inside a private founder-led business environment for owners. Compare Foundation, Inner Circle, and Core for clearer structure, stronger context, and more controlled momentum.",
  keywords: [...MEMBERSHIP_KEYWORDS],
  path: "/membership"
});

type MembershipPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DecisionCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const WHO_ITEMS: DecisionCard[] = [
  {
    title: "Business owners",
    description: "Owners building a serious company and looking for stronger people around the work.",
    icon: BriefcaseBusiness
  },
  {
    title: "Founders and consultants",
    description: "Independent operators who need better context, sharper conversations and useful introductions.",
    icon: Compass
  },
  {
    title: "Agencies and creators",
    description: "Visible businesses that grow through trust, relationships, positioning and opportunity flow.",
    icon: Rocket
  },
  {
    title: "Trades and service businesses",
    description: "Practical businesses that benefit from local trust, commercial connection and clearer support.",
    icon: Building2
  }
];

const HOW_ITEMS: DecisionCard[] = [
  {
    title: "Better relationships",
    description: "Build around business owners who understand pressure, timing, trust and momentum.",
    icon: Handshake
  },
  {
    title: "Useful visibility",
    description: "Show up with enough context for the right people to understand the business faster.",
    icon: UsersRound
  },
  {
    title: "Support around decisions",
    description: "Use rooms, resources and founder-led standards to reduce isolated decision-making.",
    icon: MessageCircle
  },
  {
    title: "Growth opportunities",
    description: "Create more conditions for introductions, collaboration, referrals and clearer next steps.",
    icon: LineChart
  }
];

const WHEN_ITEMS = [
  "Business growth feels too isolated.",
  "Useful opportunities depend on stronger relationships.",
  "The business needs more visibility with the right context.",
  "Decision-making needs better support, accountability and perspective."
] as const;

const TIER_DECISION_ITEMS = [
  {
    tier: "Foundation",
    stage: "Starting point",
    description:
      "The right start for owners who want the full base environment, visibility, resources and better business conversations."
  },
  {
    tier: "Inner Circle",
    stage: "Momentum room",
    description:
      "The right fit when the business needs tighter context, stronger owner discussion and deeper relationship building."
  },
  {
    tier: "Core",
    stage: "Highest-context room",
    description:
      "The right fit for operators carrying bigger decisions and wanting the strongest proximity inside BCN."
  }
] as const;

const TRUST_ITEMS: DecisionCard[] = [
  {
    title: "Founder-led standards",
    description:
      "The environment is shaped around useful context, calm rooms and commercially serious business-owner behaviour.",
    icon: ShieldCheck
  },
  {
    title: "Private by design",
    description:
      "Member rooms, messages, profiles and sensitive business context stay behind access rules.",
    icon: LockKeyhole
  },
  {
    title: "Approved proof only",
    description:
      "Public testimonials appear only when approved and permissioned for display.",
    icon: BadgeCheck
  }
];

function StageHeading({
  label,
  title,
  description
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="premium-kicker">{label}</p>
      <h2 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-relaxed text-white/80 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

function DecisionCardGrid({ items }: { items: DecisionCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.title}
            className="min-w-0 rounded-[1.45rem] border border-border/75 bg-card/58 p-5 shadow-panel-soft"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
              <Icon size={17} />
            </span>
            <h3 className="mt-4 font-display text-xl text-foreground sm:text-2xl">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
          </article>
        );
      })}
    </div>
  );
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const from = firstValue(params.from);
  const source = firstValue(params.source) === "audit" ? "audit" : undefined;
  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );

  const [
    membershipContent,
    foundingOffer,
    membershipHeroPlacement,
    membershipRoomsPlacement
  ] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
    getVisualMediaPlacement("membership.hero"),
    getVisualMediaPlacement("membership.section.rooms")
  ]);

  const foundingOfferByTier = getFoundingOfferByTier(foundingOffer);

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Membership For Business Owners",
          description:
            "Guided membership selection for business owners choosing between Foundation, Inner Circle, and Core.",
          path: "/membership",
          keywords: [...MEMBERSHIP_KEYWORDS],
          itemPaths: ["/join", "/founder", "/about"]
        })}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: "Membership | Join The Business Circle Network",
          description:
            "The membership rooms inside a private founder-led business environment for serious business owners.",
          path: "/membership",
          primaryQuestion: "What do members get inside The Business Circle Network?",
          primaryAnswer:
            "Members get access to a private business owner environment with structured rooms, member profiles, useful resources, founder-led standards, business conversations, collaboration opportunities and a calmer place to connect with other serious owners."
        })}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Membership", path: "/membership" }])} />
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />
      <JsonLd
        data={buildServiceSchema({
          name: "The Business Circle Network membership",
          description:
            "A private founder-led business environment for owners who want clearer thinking, better conversations, useful resources and trusted rooms.",
          path: "/membership",
          serviceType: "Private business owner membership",
          audience: "UK business owners and founders"
        })}
      />
      <JsonLd
        data={buildMembershipProductsSchema({
          tiers: [
            {
              tier: "FOUNDATION",
              monthlyPrice: foundingOffer.foundation.available
                ? foundingOffer.foundation.foundingPrice
                : foundingOffer.foundation.standardPrice,
              annualPrice: foundingOffer.foundation.available
                ? foundingOffer.foundation.foundingAnnualPrice
                : foundingOffer.foundation.standardAnnualPrice,
              foundingAvailable: foundingOffer.foundation.available
            },
            {
              tier: "INNER_CIRCLE",
              monthlyPrice: foundingOffer.innerCircle.available
                ? foundingOffer.innerCircle.foundingPrice
                : foundingOffer.innerCircle.standardPrice,
              annualPrice: foundingOffer.innerCircle.available
                ? foundingOffer.innerCircle.foundingAnnualPrice
                : foundingOffer.innerCircle.standardAnnualPrice,
              foundingAvailable: foundingOffer.innerCircle.available
            },
            {
              tier: "CORE",
              monthlyPrice: foundingOffer.core.available
                ? foundingOffer.core.foundingPrice
                : foundingOffer.core.standardPrice,
              annualPrice: foundingOffer.core.available
                ? foundingOffer.core.foundingAnnualPrice
                : foundingOffer.core.standardAnnualPrice,
              foundingAvailable: foundingOffer.core.available
            }
          ]
        })}
      />

      <PublicTopVisual
        placement={membershipHeroPlacement}
        eyebrow="What"
        title="The Business Circle is a founder-led environment for business relationships, support and opportunities."
        description="BCN gives business owners a calmer private room to build trust, increase visibility, find better conversations and create more useful growth conditions."
        tone="immersive"
        fallbackLabel="Membership top visual"
      />

      {billing === "required" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your account needs an active membership to access member areas. Choose the right room,
          then continue into join and checkout.
        </p>
      ) : null}

      {billing === "pending" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your membership is still pending payment confirmation. Complete checkout again if the
          session expired, or return to your join confirmation page if Stripe has already charged
          you.
        </p>
      ) : null}

      {billing === "past-due" ? (
        <p className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Your last payment did not complete, so premium access is currently on hold. Update
          billing to restore full member access.
        </p>
      ) : null}

      {billing === "cancelled-access" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Your previous membership is no longer active. Review the rooms again, then restart secure
          checkout when you want to come back in properly.
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. Your room selection is still here, ready when you want to
          continue.
        </p>
      ) : null}

      <section className="public-section">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.48fr)] lg:items-start">
          <StageHeading
            label="What"
            title="A serious business room, not another noisy networking feed."
            description="Membership brings owner context, useful resources, business conversations, visibility and relationship-building into one protected environment."
          />
          <div className="rounded-[1.45rem] border border-gold/24 bg-gold/10 p-5 shadow-gold-soft">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Decision path</p>
            <ol className="mt-4 space-y-3">
              {["Understand the environment", "Recognise the fit", "Choose the right room", "Complete secure checkout"].map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/24 bg-background/24 text-[11px] text-gold">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="public-section">
        <StageHeading
          label="Who"
          title="Built for owners who grow through trust, context and useful relationships."
          description="BCN fits people running real businesses, building service-led offers, carrying decisions and looking for stronger business conditions around them."
        />
        <DecisionCardGrid items={WHO_ITEMS} />
      </section>

      <section className="public-section">
        <StageHeading
          label="How"
          title="The value comes from outcomes, not a longer feature list."
          description="The right environment improves the quality of relationships, the usefulness of conversations and the chances of opportunities being recognised at the right time."
        />
        <DecisionCardGrid items={HOW_ITEMS} />
      </section>

      <section className="public-section-tight rounded-[1.9rem] border border-border/75 bg-card/54 p-5 shadow-panel sm:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(280px,0.52fr)] lg:items-start">
          <StageHeading
            label="When"
            title="Joining makes sense when the business needs a better room around it."
            description="The strongest reason to join is not curiosity. It is the need for better relationships, clearer support and a more useful growth environment."
          />
          <div className="grid gap-3">
            {WHEN_ITEMS.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[1.1rem] border border-white/10 bg-background/24 px-4 py-3 text-sm leading-relaxed text-muted"
              >
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section">
        <StageHeading
          label="Trust"
          title="Trust sits inside the product, not beside it."
          description="The membership decision depends on confidence in the standard of the room, the privacy of the environment and the care used around public proof."
        />
        <DecisionCardGrid items={TRUST_ITEMS} />
      </section>

      <TestimonialSection
        proofType={TestimonialProofType.BCN_MEMBER}
        location={TestimonialDisplayLocation.MEMBERSHIP_PAGE}
        category={[
          TestimonialCategory.BCN_EXPERIENCE,
          TestimonialCategory.COMMUNITY,
          TestimonialCategory.COLLABORATION
        ]}
        eyebrow="Member proof"
        title="Approved proof from the buying context"
        intro="Specific member feedback appears here when approved and permissioned for the membership decision."
        limit={3}
        variant="compact"
      />

      <section className="public-section" id="which-membership">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(260px,0.42fr)] lg:items-start">
          <StageHeading
            label="Which"
            title="Choose by business stage, not status."
            description="Foundation, Inner Circle and Core sit inside the same environment. The right choice is the room that matches the level of context, proximity and support the business needs now."
          />
          <div className="rounded-[1.35rem] border border-border/75 bg-background/24 p-4 text-sm leading-relaxed text-muted">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Need a recommendation?</p>
            <p className="mt-2">
              The Founder Audit gives a guided tier recommendation before checkout.
            </p>
            <Link href="/audit?source=membership&topic=room-fit" className="mt-4 inline-flex items-center text-sm text-gold hover:underline">
              Run the Founder Audit
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {TIER_DECISION_ITEMS.map((item) => (
            <article
              key={item.tier}
              className="rounded-[1.55rem] border border-border/75 bg-card/62 p-5 shadow-panel-soft"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{item.stage}</p>
              <h3 className="mt-3 font-display text-2xl text-foreground">{item.tier}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>

        <Link
          href="#choose-membership"
          className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
        >
          Choose membership
          <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      <div id="choose-membership" className="scroll-mt-24">
        <MembershipGuidedSelector
          initialSelectedTier={selectedTier}
          initialBillingInterval={billingInterval}
          billing={billing}
          source={source}
          from={from}
          foundingOfferByTier={foundingOfferByTier}
          faqTitle={membershipContent.faqTitle}
          faqDescription={membershipContent.faqDescription}
          faqItems={membershipContent.faqs}
          roomsPlacement={membershipRoomsPlacement}
        />
      </div>
    </div>
  );
}
