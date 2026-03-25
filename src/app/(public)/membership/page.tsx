import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { MembershipPlanAction } from "@/components/billing";
import {
  CTASection,
  FAQSection,
  FoundingOfferCounters,
  JsonLd,
  PricingCard,
  SectionHeading
} from "@/components/public";
import { Button } from "@/components/ui/button";
import {
  getMembershipTierLabel,
  getMembershipTierRank,
  MEMBERSHIP_PLANS
} from "@/config/membership";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/lib/site-content";
import { buildFaqSchema } from "@/lib/structured-data";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { listInsightTopicClusters } from "@/server/insights/insight.service";
import { getPublicTrustSnapshot } from "@/server/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Business Membership Plans For Founders",
  description:
    "Compare Foundation, Inner Circle, and Core membership for The Business Circle and choose the business membership level that fits your current stage.",
  keywords: [
    "business membership for founders",
    "founder membership plans",
    "business networking membership",
    "inner circle membership",
    "business strategy community"
  ],
  path: "/membership"
});

const BENEFIT_COMPARISON = [
  { label: "Category-led community access", foundation: true, inner: true, core: true },
  { label: "Member directory", foundation: true, inner: true, core: true },
  { label: "Resource library", foundation: true, inner: true, core: true },
  { label: "Member events", foundation: true, inner: true, core: true },
  { label: "Private higher-tier areas", foundation: false, inner: true, core: true },
  { label: "Deeper strategic access", foundation: false, inner: true, core: true },
  { label: "Closer founder proximity", foundation: false, inner: false, core: true },
  { label: "Strongest bridge into premium work", foundation: false, inner: false, core: true }
];

const membershipTrustItems = [
  {
    icon: ShieldCheck,
    title: "Start at the right level",
    description:
      "Choose the level that matches the business you are building now without overcommitting too early."
  },
  {
    icon: TrendingUp,
    title: "Move deeper when needed",
    description:
      "Foundation gives you the ecosystem. Inner Circle adds more focus. Core adds the strongest strategic proximity."
  },
  {
    icon: Sparkles,
    title: "Clear and dependable billing",
    description:
      "Membership checkout and billing management run through Stripe so the experience stays premium and predictable."
  }
];

const membershipDecisionSteps = [
  {
    step: "01",
    title: "Join at the level that fits now",
    description:
      "Foundation is a strong start. Inner Circle is the most balanced step up. Core is the closest strategic layer."
  },
  {
    step: "02",
    title: "Enter the dashboard with a clear place to begin",
    description:
      "New members are guided into one discussion, one resource, and a stronger profile without unnecessary noise."
  },
  {
    step: "03",
    title: "Move deeper later if the business needs it",
    description:
      "You can move between tiers as the business changes. The point is to choose the right room now, not the deepest room immediately."
  }
];

type MembershipPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function withFrom(pathname: string, from: string): string {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set("from", from);
  const query = url.searchParams.toString();
  return query.length ? `${url.pathname}?${query}` : url.pathname;
}

function resolveTier(value: string | undefined): "FOUNDATION" | "INNER_CIRCLE" | "CORE" {
  if (value === "CORE") {
    return "CORE";
  }

  if (value === "INNER_CIRCLE") {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const session = await auth();
  const params = await searchParams;
  const [membershipContent, foundingOffer, trustSnapshot] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
    getPublicTrustSnapshot()
  ]);
  const featuredInsightTopics = listInsightTopicClusters().filter((cluster) =>
    [
      "business-growth-strategy",
      "visibility-and-trust",
      "founder-clarity-and-decision-making"
    ].includes(cluster.slug)
  );
  const billing = firstValue(params.billing);
  const isAuthenticated = Boolean(session?.user);
  const hasActiveSubscription = session?.user?.hasActiveSubscription ?? false;
  const currentTier = session?.user
    ? roleToTier(session.user.role, session.user.membershipTier)
    : "FOUNDATION";
  const currentTierRank = getMembershipTierRank(currentTier);
  const selectedTier = resolveTier(firstValue(params.tier));

  const foundationFrom = "/membership?tier=FOUNDATION";
  const innerCircleFrom = "/membership?tier=INNER_CIRCLE";
  const coreFrom = "/membership?tier=CORE";

  const trustSignals = [
    {
      label: "Active discussions this week",
      value: trustSnapshot.activeDiscussionCount.toLocaleString("en-GB"),
      description: "Quiet movement matters more than noise. These are real conversations happening across the network."
    },
    {
      label: "Resources recently added",
      value: trustSnapshot.recentResourceCount.toLocaleString("en-GB"),
      description: "New material keeps the library current without turning it into a content dump."
    },
    {
      label: "Connection wins visible",
      value: trustSnapshot.connectionWinsCount.toLocaleString("en-GB"),
      description: "Visible outcomes create trust that useful conversations are turning into something real."
    }
  ];

  return (
    <div className="space-y-16 pb-16">
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />

      {billing === "required" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your account needs an active membership to access member areas. Select a plan to continue.
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. You can restart plan selection any time.
        </p>
      ) : null}

      <section className="space-y-8">
        <SectionHeading
          align="center"
          label="Membership"
          title="Choose the level that fits where you are now"
          description="Each tier gives you access to a stronger environment, better context, and a clearer path forward. You are choosing for the stage you are in now, not trying to predict everything upfront."
        />
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Choose for now",
            "Move deeper later",
            "Clear monthly billing",
            "Natural progression"
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {trustSignals.map((item) => (
            <article key={item.label} className="public-panel border-silver/18 bg-background/30 p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.label}</p>
              <p className="mt-2 font-display text-3xl text-foreground">{item.value}</p>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </article>
          ))}
        </div>
        <FoundingOfferCounters offer={foundingOffer} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <PricingCard
            tier="FOUNDATION"
            name={MEMBERSHIP_PLANS.FOUNDATION.name}
            positioningLabel="Best place to start"
            monthlyPrice={MEMBERSHIP_PLANS.FOUNDATION.monthlyPrice}
            description="Best for business owners who want a clearer base, a stronger room, and the right place to start inside the ecosystem."
            features={MEMBERSHIP_PLANS.FOUNDATION.features}
            cta={
              <MembershipPlanAction
                tier="FOUNDATION"
                source="membership"
                isAuthenticated={isAuthenticated}
                isCurrentPlan={currentTier === "FOUNDATION"}
                hasActiveSubscription={hasActiveSubscription}
                buttonVariant="foundation"
                authenticatedLabel={
                  currentTier === "FOUNDATION" ? "Current Foundation Plan" : "Start With Foundation"
                }
                unauthenticatedLabel="Start With Foundation"
                joinHref={withFrom("/join?tier=FOUNDATION", foundationFrom)}
                loginHref={withFrom("/login", foundationFrom)}
              />
            }
            foundingOffer={foundingOffer.foundation}
            selected={selectedTier === "FOUNDATION"}
          />
          <PricingCard
            tier="INNER_CIRCLE"
            name={MEMBERSHIP_PLANS.INNER_CIRCLE.name}
            positioningLabel="Smartest next step"
            spotlight={{
              label: "Natural progression",
              text:
                "Often the right move when Foundation is already useful and you want a more focused room, stronger signal, and more relevant private context."
            }}
            monthlyPrice={MEMBERSHIP_PLANS.INNER_CIRCLE.monthlyPrice}
            description="Best for founders who want a more focused environment, stronger intent, and a clearer value jump from Foundation without moving straight to Core."
            features={MEMBERSHIP_PLANS.INNER_CIRCLE.features}
            cta={
              <MembershipPlanAction
                tier="INNER_CIRCLE"
                source="membership"
                isAuthenticated={isAuthenticated}
                isCurrentPlan={currentTier === "INNER_CIRCLE"}
                hasActiveSubscription={hasActiveSubscription}
                buttonVariant="innerCircle"
                authenticatedLabel={
                  currentTier === "INNER_CIRCLE" ? "Current Inner Circle Plan" : "Step Into Inner Circle"
                }
                unauthenticatedLabel="Step Into Inner Circle"
                joinHref={withFrom("/join?tier=INNER_CIRCLE", innerCircleFrom)}
                loginHref={withFrom("/login", innerCircleFrom)}
              />
            }
            foundingOffer={foundingOffer.innerCircle}
            selected={selectedTier === "INNER_CIRCLE"}
            featured
            featuredLabel="Smartest next step"
          />
          <PricingCard
            tier="CORE"
            name={MEMBERSHIP_PLANS.CORE.name}
            positioningLabel="Highest-value room"
            monthlyPrice={MEMBERSHIP_PLANS.CORE.monthlyPrice}
            description="Best for business owners who want the calmest high-value room, closer founder proximity, and stronger strategic context."
            features={MEMBERSHIP_PLANS.CORE.features}
            cta={
              <MembershipPlanAction
                tier="CORE"
                source="membership"
                isAuthenticated={isAuthenticated}
                isCurrentPlan={currentTier === "CORE"}
                hasActiveSubscription={hasActiveSubscription}
                buttonVariant="core"
                authenticatedLabel={
                  currentTier === "CORE" ? "Current Core Plan" : "Choose Core"
                }
                unauthenticatedLabel="Choose Core"
                joinHref={withFrom("/join?tier=CORE", coreFrom)}
                loginHref={withFrom("/login", coreFrom)}
              />
            }
            foundingOffer={foundingOffer.core}
            selected={selectedTier === "CORE"}
          />
        </div>
        <p className="text-center text-xs text-muted">
          * Discounted pricing is for eligible new members only. If membership ends and you later
          rejoin, standard pricing applies.
        </p>
        <p className="text-center text-sm text-muted">
          Not sure where to start? Foundation gives you a strong entry into the ecosystem, and you can move deeper when the fit becomes clearer.
        </p>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="What Happens After Joining"
          title="Clear first steps reduce hesitation"
          description="You are not joining a noisy feed. You are entering a structured environment with a clearer place to begin."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {membershipDecisionSteps.map((item) => (
            <article key={item.step} className="public-panel interactive-card p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.step}</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <article className="public-panel border-foundation/22 bg-gradient-to-br from-foundation/10 via-card/72 to-card/70 p-6">
          <p className="inline-flex rounded-full border border-foundation/30 bg-foundation/12 px-3 py-1 text-[11px] tracking-[0.1em] text-foundation uppercase">
            Foundation
          </p>
          <h2 className="mt-5 font-display text-3xl text-foreground">A serious place to start</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>Best for businesses that want stronger fundamentals, better conversations, and a more structured network around them.</p>
            <p>Foundation is where people start building trust, visibility, and useful relationships without noise.</p>
          </div>
        </article>
        <article className="public-panel border-silver/22 bg-gradient-to-br from-silver/12 via-card/72 to-card/70 p-6">
          <p className="inline-flex rounded-full border border-silver/24 bg-silver/12 px-3 py-1 text-[11px] tracking-[0.1em] text-silver uppercase">
            Inner Circle
          </p>
          <h2 className="mt-5 font-display text-3xl text-foreground">The clearest move when Foundation is already working</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>Best for founders who want a more intentional environment, stronger signal, and more relevant context around the decisions in front of them.</p>
            <p>Inner Circle adds private access layers, better discussion quality, and a more focused room without trying to oversell the jump.</p>
          </div>
        </article>
        <article className="public-panel border-gold/30 bg-gradient-to-br from-gold/10 via-card/72 to-card/68 p-6">
          <p className="inline-flex rounded-full border border-gold/35 bg-gold/12 px-3 py-1 text-[11px] tracking-[0.1em] text-gold uppercase">
            Core
          </p>
          <h2 className="mt-5 font-display text-3xl text-foreground">The strongest strategic proximity</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>Best for business owners who want the highest-trust environment inside Business Circle and the closest bridge into premium work.</p>
            <p>Core is positioned for decision-led founders who value closeness, quality of room, and stronger access to founder thinking.</p>
          </div>
        </article>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Comparison"
          title="Compare the level of access, not just the list of features"
          description="All three levels place you inside the ecosystem. The difference is how focused the environment becomes and how much strategic proximity you want."
        />

        <div className="overflow-x-auto rounded-3xl border border-border/80 bg-card/70 shadow-panel">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[1.2fr_0.35fr_0.35fr_0.35fr] border-b border-border/70 bg-background/35 px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted sm:px-6">
              <p>Benefit</p>
              <p className="text-center text-foundation">Foundation</p>
              <p className="text-center text-silver">Inner Circle</p>
              <p className="text-center text-gold">Core</p>
            </div>
            <div className="divide-y divide-border/70">
              {BENEFIT_COMPARISON.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[1.2fr_0.35fr_0.35fr_0.35fr] items-center px-4 py-3 sm:px-6"
                >
                  <p className="text-sm text-foreground">{item.label}</p>
                  <div className="flex justify-center">
                    {item.foundation ? (
                      <Check size={16} className="text-foundation" />
                    ) : (
                      <Minus size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {item.inner ? (
                      <Check size={16} className="text-silver" />
                    ) : (
                      <Minus size={16} className="text-muted" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {item.core ? (
                      <Check size={16} className="text-gold" />
                    ) : (
                      <Minus size={16} className="text-muted" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Membership Confidence"
          title="A premium membership should still feel clear, flexible, and sensible"
          description="The point is not to push everyone into the deepest level. It is to help people choose the right room for the responsibility they are carrying right now."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {membershipTrustItems.map((item) => (
            <article key={item.title} className="public-panel interactive-card p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                <item.icon size={18} />
              </span>
              <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
        {isAuthenticated ? (
          <p className="text-center text-sm text-muted">
            Your current level is {getMembershipTierLabel(currentTier)}.
            {currentTierRank < getMembershipTierRank("CORE") ? " You can move deeper whenever the business needs it." : ""}
          </p>
        ) : null}
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Public Insight"
          title="Explore the topics that lead naturally into membership"
          description="Public insight sharpens understanding first. Membership gives you the deeper frameworks, better sequence, and stronger context behind the same themes."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {featuredInsightTopics.map((cluster) => (
            <article key={cluster.slug} className="public-panel interactive-card p-6">
              <p className="premium-kicker">{cluster.keyword}</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">{cluster.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.description}</p>
              <div className="mt-4 space-y-2">
                {cluster.supportingInsights.slice(0, 2).map((insight) => (
                  <Link
                    key={insight.slug}
                    href={`/insights/${insight.slug}`}
                    className="block rounded-xl border border-border/80 bg-background/20 px-3 py-3 text-sm text-muted transition-colors hover:border-silver/24 hover:text-foreground"
                  >
                    {insight.title}
                  </Link>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={cluster.href}>
                  <Button variant="outline">Explore Topic</Button>
                </Link>
                <Link href="/join">
                  <Button>Join The Circle</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FAQSection
        label="FAQ"
        title={membershipContent.faqTitle}
        description={membershipContent.faqDescription}
        items={membershipContent.faqs}
      />

      <CTASection
        title="Choose the level that matches your next phase"
        description="Start where the fit is strongest now, then move deeper when the business needs a more focused room."
        primaryAction={{ href: "/join", label: "Join The Business Circle" }}
        secondaryAction={{ href: "/early-access", label: "Join Early Access", variant: "outline" }}
      />
    </div>
  );
}
