import type { Metadata } from "next";
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType
} from "@prisma/client";
import {
  JsonLd
} from "@/components/public";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Handshake,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TestimonialSection } from "@/components/public/testimonial-section";
import { MembershipGuidedSelector } from "@/components/public/membership-guided-selector";
import {
  getMembershipTierDefinition,
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
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const COMPACT_DECISION_ITEMS: DecisionCard[] = [
  {
    label: "What",
    title: "A private business room",
    description: "BCN gives owners a calmer place for relationships, support and growth opportunities.",
    icon: Compass
  },
  {
    label: "Who",
    title: "For serious owners",
    description: "Built for business owners, founders, consultants, agencies and service-led operators.",
    icon: BriefcaseBusiness
  },
  {
    label: "How",
    title: "Better context",
    description: "Use stronger conversations, useful visibility and trusted introductions to reduce isolated growth.",
    icon: Handshake
  },
  {
    label: "Which",
    title: "Choose by stage",
    description: "Foundation, Inner Circle and Core match different levels of context and proximity.",
    icon: UsersRound
  },
  {
    label: "Where",
    title: "Checkout next",
    description: "Your selected room and billing period carry straight into account setup and Stripe checkout.",
    icon: LineChart
  }
];

const AUDIT_FAST_PATH_POINTS = [
  "Your recommended room is selected.",
  "Monthly or annual billing stays editable.",
  "Checkout is the next step when the fit looks right."
] as const;

const TRUST_ITEMS: DecisionCard[] = [
  {
    label: "Standard",
    title: "Founder-led",
    description: "The room is shaped around useful context and commercially serious owner behaviour.",
    icon: ShieldCheck
  },
  {
    label: "Privacy",
    title: "Protected access",
    description: "Member rooms, messages, profiles and business context stay behind access rules.",
    icon: LockKeyhole
  },
  {
    label: "Proof",
    title: "Approved only",
    description: "Testimonials appear only when approved and permissioned for the membership decision.",
    icon: BadgeCheck
  }
];

function DecisionCardGrid({ items, columns = "xl:grid-cols-5" }: { items: DecisionCard[]; columns?: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", columns)}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article
            key={item.title}
            className="min-w-0 rounded-[1.2rem] border border-border/75 bg-card/58 p-4 shadow-panel-soft"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.08em] text-gold">{item.label}</p>
                <h3 className="font-display text-lg leading-tight text-foreground">{item.title}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
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
  const invite = firstValue(params.invite);
  const source = firstValue(params.source) === "audit" ? "audit" : undefined;
  const isAuditSource = source === "audit";
  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );
  const selectedTierDefinition = getMembershipTierDefinition(selectedTier);
  const selectedBillingLabel = billingInterval === "annual" ? "Annual" : "Monthly";

  const [
    membershipContent,
    foundingOffer,
    membershipRoomsPlacement
  ] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
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

      <section
        className={cn(
          "rounded-[1.55rem] border bg-card/62 p-4 shadow-panel sm:p-5 lg:p-6",
          isAuditSource
            ? "border-gold/28 bg-gradient-to-br from-gold/12 via-card/72 to-card/62"
            : "border-border/75"
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] lg:items-center">
          <div className="max-w-4xl space-y-3">
            <p className="premium-kicker">
              {isAuditSource ? "Audit recommendation" : "Membership"}
            </p>
            <h1 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {isAuditSource
                ? `Your audit recommendation is ready: ${selectedTierDefinition.name}.`
                : "Choose your BCN room and continue to checkout."}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
              {isAuditSource
                ? `We have skipped the long explanation. Confirm ${selectedBillingLabel.toLowerCase()} billing, review the price and continue when the fit looks right.`
                : "The Business Circle is a private founder-led environment for business relationships, support and growth opportunities. Pick the room that fits now, then complete secure checkout."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {(isAuditSource
              ? AUDIT_FAST_PATH_POINTS
              : [
                  "See the selected room immediately.",
                  "Switch tier or billing in place.",
                  "Continue into secure checkout."
                ] as const
            ).map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-[1rem] border border-white/10 bg-background/24 px-3 py-2.5 text-sm leading-relaxed text-muted"
              >
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <div id="choose-membership" className="scroll-mt-24">
        <MembershipGuidedSelector
          initialSelectedTier={selectedTier}
          initialBillingInterval={billingInterval}
          billing={billing}
          source={source}
          from={from}
          inviteCode={invite}
          foundingOfferByTier={foundingOfferByTier}
          faqTitle={membershipContent.faqTitle}
          faqDescription={membershipContent.faqDescription}
          faqItems={membershipContent.faqs}
          roomsPlacement={membershipRoomsPlacement}
          fastPath={isAuditSource}
        />
      </div>

      {isAuditSource ? null : (
        <section className="public-section-compact rounded-[1.45rem] border border-border/70 bg-card/48 p-4 shadow-panel-soft sm:p-5">
          <div className="max-w-3xl space-y-2">
            <p className="premium-kicker">Quick context</p>
            <h2 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
              What this is, who it is for and where the checkout goes.
            </h2>
          </div>
          <DecisionCardGrid items={COMPACT_DECISION_ITEMS} />
        </section>
      )}

      <section className="public-section-compact rounded-[1.45rem] border border-border/70 bg-card/48 p-4 shadow-panel-soft sm:p-5">
        <div className="max-w-3xl space-y-2">
          <p className="premium-kicker">{isAuditSource ? "Short proof" : "Trust"}</p>
          <h2 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
            {isAuditSource
              ? "Enough confidence to confirm the recommendation."
              : "Trust comes after the buying action, where it supports the final decision."}
          </h2>
        </div>
        <DecisionCardGrid items={TRUST_ITEMS} columns="lg:grid-cols-3" />
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
        intro={
          isAuditSource
            ? "Short approved proof appears here when permissioned for the membership decision."
            : "Specific member feedback appears here when approved and permissioned for the membership decision."
        }
        limit={isAuditSource ? 2 : 3}
        variant="compact"
      />
    </div>
  );
}
