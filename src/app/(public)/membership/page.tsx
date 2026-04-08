import type { Metadata } from "next";
import { MembershipTier } from "@prisma/client";
import { auth } from "@/auth";
import { MembershipPlanAction } from "@/components/billing";
import {
  CTASection,
  FAQSection,
  JsonLd,
  MembershipTierSection
} from "@/components/public";
import {
  getMembershipBillingPlan,
  getMembershipTierLabel,
  getMembershipTierRank,
  resolveBillingIntervalFromPriceId,
  resolveMembershipBillingInterval,
  type MembershipBillingInterval
} from "@/config/membership";
import { db } from "@/lib/db";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema } from "@/lib/structured-data";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getPublicTrustSnapshot } from "@/server/public-site";
import { getSiteContentSection } from "@/server/site-content";

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

const MICROCOPY_LINES = [
  "Built for business owners, not browsers",
  "No noise, just real conversations and growth",
  "Move at your own pace, or step into something bigger"
] as const;

const TIER_CONTENT: Record<
  MembershipTier,
  {
    description: string;
    narrative?: string;
    emphasisLabel?: string;
    accessNote?: string;
    unauthenticatedLabel: string;
  }
> = {
  FOUNDATION: {
    description:
      "Start here. Understand the system, connect with others, and begin building momentum.",
    narrative: "A quieter way into the network, with enough structure to help the next move feel clearer.",
    unauthenticatedLabel: "Enter Foundation"
  },
  INNER_CIRCLE: {
    description:
      "Where business owners actually connect, collaborate, and grow. This is where most of the real activity happens.",
    narrative:
      "The room feels tighter, more useful, and more conversational without becoming performative.",
    emphasisLabel: "Most active members choose this",
    unauthenticatedLabel: "Join Inner Circle"
  },
  CORE: {
    description:
      "Designed for serious operators already running or scaling a business. This is a more focused environment with higher-level conversations and access.",
    narrative: "Protected by design so the room stays useful for operators carrying real decisions.",
    accessNote: "Access may be limited",
    unauthenticatedLabel: "Continue to Core"
  }
};

type MembershipPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveTier(value: string | undefined): MembershipTier {
  if (value === MembershipTier.CORE) {
    return MembershipTier.CORE;
  }

  if (value === MembershipTier.INNER_CIRCLE) {
    return MembershipTier.INNER_CIRCLE;
  }

  return MembershipTier.FOUNDATION;
}

function buildMembershipHref(input: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
}) {
  const url = new URL("/membership", "http://localhost");
  url.searchParams.set("tier", input.tier);
  url.searchParams.set("interval", input.billingInterval);
  return `${url.pathname}${url.search}`;
}

function buildToggleHref(input: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  billing?: string;
}) {
  const url = new URL("/membership", "http://localhost");
  url.searchParams.set("tier", input.tier);
  url.searchParams.set("interval", input.billingInterval);

  if (input.billing) {
    url.searchParams.set("billing", input.billing);
  }

  return `${url.pathname}${url.search}`;
}

function buildJoinHref(input: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
}) {
  const url = new URL("/join", "http://localhost");
  url.searchParams.set("tier", input.tier);
  url.searchParams.set("interval", input.billingInterval);
  return `${url.pathname}${url.search}`;
}

function buildLoginHref(input: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
}) {
  const url = new URL("/login", "http://localhost");
  url.searchParams.set("from", buildMembershipHref(input));
  return `${url.pathname}${url.search}`;
}

function getAuthenticatedLabel(input: {
  currentTier: MembershipTier;
  currentBillingInterval: MembershipBillingInterval | null;
  targetTier: MembershipTier;
  targetBillingInterval: MembershipBillingInterval;
}) {
  if (
    input.currentTier === input.targetTier &&
    input.currentBillingInterval === input.targetBillingInterval
  ) {
    return `Current ${getMembershipTierLabel(input.targetTier)} Plan`;
  }

  if (input.currentTier === input.targetTier) {
    return input.targetBillingInterval === "annual" ? "Switch To Annual" : "Switch To Monthly";
  }

  if (
    getMembershipTierRank(input.targetTier) > getMembershipTierRank(input.currentTier)
  ) {
    return input.targetTier === MembershipTier.CORE
      ? "Continue to Core"
      : `Join ${getMembershipTierLabel(input.targetTier)}`;
  }

  return `Move To ${getMembershipTierLabel(input.targetTier)}`;
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const session = await auth();
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const selectedTier = resolveTier(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(firstValue(params.interval));
  const isAuthenticated = Boolean(session?.user);
  const hasActiveSubscription = session?.user?.hasActiveSubscription ?? false;
  const currentTier = session?.user
    ? roleToTier(session.user.role, session.user.membershipTier)
    : MembershipTier.FOUNDATION;

  const [membershipContent, foundingOffer, trustSnapshot, currentSubscription] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
    getPublicTrustSnapshot(),
    session?.user
      ? db.subscription.findUnique({
          where: {
            userId: session.user.id
          },
          select: {
            stripePriceId: true
          }
        })
      : Promise.resolve(null)
  ]);

  const currentBillingInterval = currentSubscription?.stripePriceId
    ? resolveBillingIntervalFromPriceId(currentSubscription.stripePriceId)
    : null;

  const trustSignals = [
    {
      label: "Active discussions this week",
      value: trustSnapshot.activeDiscussionCount.toLocaleString("en-GB")
    },
    {
      label: "Resources recently added",
      value: trustSnapshot.recentResourceCount.toLocaleString("en-GB")
    },
    {
      label: "Connection wins visible",
      value: trustSnapshot.connectionWinsCount.toLocaleString("en-GB")
    }
  ];

  const foundationPlan = getMembershipBillingPlan(
    MembershipTier.FOUNDATION,
    "standard",
    billingInterval
  );
  const innerCirclePlan = getMembershipBillingPlan(
    MembershipTier.INNER_CIRCLE,
    "standard",
    billingInterval
  );
  const corePlan = getMembershipBillingPlan(MembershipTier.CORE, "standard", billingInterval);

  return (
    <div className="space-y-12 pb-16">
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

      <section className="space-y-8 rounded-[2rem] border border-border/80 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership</p>
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">
            The Business Circle
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted">
            A place for business owners to connect, think clearly, and grow properly.
          </p>
          <p className="text-sm text-silver">Choose how you want to enter.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {MICROCOPY_LINES.map((line) => (
            <div
              key={line}
              className="rounded-2xl border border-white/8 bg-background/20 px-4 py-4 text-sm text-muted"
            >
              {line}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit rounded-full border border-border/80 bg-background/30 p-1">
            <a
              href={buildToggleHref({
                tier: selectedTier,
                billingInterval: "monthly",
                billing
              })}
              className={`rounded-full px-4 py-2 text-sm ${
                billingInterval === "monthly"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Monthly
            </a>
            <a
              href={buildToggleHref({
                tier: selectedTier,
                billingInterval: "annual",
                billing
              })}
              className={`rounded-full px-4 py-2 text-sm ${
                billingInterval === "annual"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Annual
            </a>
          </div>
          <p className="text-sm text-muted">Pay annually and save 20%</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {trustSignals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-2xl border border-white/8 bg-background/20 px-4 py-4"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{signal.label}</p>
              <p className="mt-2 font-display text-3xl text-foreground">{signal.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        <MembershipTierSection
          tier={MembershipTier.FOUNDATION}
          title="Foundation"
          description={TIER_CONTENT.FOUNDATION.description}
          narrative={TIER_CONTENT.FOUNDATION.narrative}
          billingInterval={billingInterval}
          monthlyPrice={foundationPlan.monthlyPrice}
          annualPrice={foundationPlan.annualPrice}
          foundingOffer={foundingOffer.foundation}
          action={
            <MembershipPlanAction
              tier="FOUNDATION"
              source="membership"
              billingInterval={billingInterval}
              isAuthenticated={isAuthenticated}
              isCurrentPlan={currentTier === MembershipTier.FOUNDATION}
              hasActiveSubscription={hasActiveSubscription}
              currentBillingInterval={currentBillingInterval}
              buttonVariant="foundation"
              authenticatedLabel={getAuthenticatedLabel({
                currentTier,
                currentBillingInterval,
                targetTier: MembershipTier.FOUNDATION,
                targetBillingInterval: billingInterval
              })}
              unauthenticatedLabel={TIER_CONTENT.FOUNDATION.unauthenticatedLabel}
              joinHref={buildJoinHref({
                tier: MembershipTier.FOUNDATION,
                billingInterval
              })}
              loginHref={buildLoginHref({
                tier: MembershipTier.FOUNDATION,
                billingInterval
              })}
            />
          }
        />

        <MembershipTierSection
          tier={MembershipTier.INNER_CIRCLE}
          title="Inner Circle"
          description={TIER_CONTENT.INNER_CIRCLE.description}
          narrative={TIER_CONTENT.INNER_CIRCLE.narrative}
          emphasisLabel={TIER_CONTENT.INNER_CIRCLE.emphasisLabel}
          billingInterval={billingInterval}
          monthlyPrice={innerCirclePlan.monthlyPrice}
          annualPrice={innerCirclePlan.annualPrice}
          foundingOffer={foundingOffer.innerCircle}
          featured
          action={
            <MembershipPlanAction
              tier="INNER_CIRCLE"
              source="membership"
              billingInterval={billingInterval}
              isAuthenticated={isAuthenticated}
              isCurrentPlan={currentTier === MembershipTier.INNER_CIRCLE}
              hasActiveSubscription={hasActiveSubscription}
              currentBillingInterval={currentBillingInterval}
              buttonVariant="innerCircle"
              authenticatedLabel={getAuthenticatedLabel({
                currentTier,
                currentBillingInterval,
                targetTier: MembershipTier.INNER_CIRCLE,
                targetBillingInterval: billingInterval
              })}
              unauthenticatedLabel={TIER_CONTENT.INNER_CIRCLE.unauthenticatedLabel}
              joinHref={buildJoinHref({
                tier: MembershipTier.INNER_CIRCLE,
                billingInterval
              })}
              loginHref={buildLoginHref({
                tier: MembershipTier.INNER_CIRCLE,
                billingInterval
              })}
            />
          }
        />

        <MembershipTierSection
          tier={MembershipTier.CORE}
          title="Core"
          description={TIER_CONTENT.CORE.description}
          narrative={TIER_CONTENT.CORE.narrative}
          accessNote={TIER_CONTENT.CORE.accessNote}
          billingInterval={billingInterval}
          monthlyPrice={corePlan.monthlyPrice}
          annualPrice={corePlan.annualPrice}
          foundingOffer={foundingOffer.core}
          action={
            <MembershipPlanAction
              tier="CORE"
              source="membership"
              billingInterval={billingInterval}
              isAuthenticated={isAuthenticated}
              isCurrentPlan={currentTier === MembershipTier.CORE}
              hasActiveSubscription={hasActiveSubscription}
              currentBillingInterval={currentBillingInterval}
              buttonVariant="core"
              authenticatedLabel={getAuthenticatedLabel({
                currentTier,
                currentBillingInterval,
                targetTier: MembershipTier.CORE,
                targetBillingInterval: billingInterval
              })}
              unauthenticatedLabel={TIER_CONTENT.CORE.unauthenticatedLabel}
              joinHref={buildJoinHref({
                tier: MembershipTier.CORE,
                billingInterval
              })}
              loginHref={buildLoginHref({
                tier: MembershipTier.CORE,
                billingInterval
              })}
            />
          }
        />
      </div>

      <section className="rounded-[1.8rem] border border-white/8 bg-background/18 px-6 py-6 text-sm text-muted">
        <p>
          Founding rates remain in place while membership stays active. If membership is cancelled
          and later restarted, standard pricing applies.
        </p>
      </section>

      <FAQSection
        label="FAQ"
        title={membershipContent.faqTitle}
        description={membershipContent.faqDescription}
        items={membershipContent.faqs}
      />

      <CTASection
        title="Choose the room that fits the business now"
        description="Start where the fit is strongest now, then move deeper if the business needs a tighter room."
        primaryAction={{
          href: buildJoinHref({
            tier: selectedTier,
            billingInterval
          }),
          label: "Continue Into Membership"
        }}
        secondaryAction={{ href: "/insights", label: "Start With Free Insights", variant: "outline" }}
      />
    </div>
  );
}
