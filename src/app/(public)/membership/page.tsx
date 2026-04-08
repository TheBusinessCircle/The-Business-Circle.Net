import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { MembershipPlanAction } from "@/components/billing";
import {
  FAQSection,
  JsonLd,
  MembershipTierSection
} from "@/components/public";
import {
  formatMembershipPrice,
  getMembershipBillingPlan,
  getMembershipTierContent,
  getMembershipTierDefinition,
  getMembershipTierLabel,
  getMembershipTierRank,
  MEMBERSHIP_PAGE_MICROCOPY,
  MEMBERSHIP_TIER_ORDER,
  resolveBillingIntervalFromPriceId,
  resolveMembershipBillingInterval,
  type MembershipBillingInterval
} from "@/config/membership";
import { db } from "@/lib/db";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
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
  billing?: string;
  from?: string;
  inviteCode?: string;
  authMode?: "register";
  coreAccessConfirmed?: boolean;
  anchor?: string;
}) {
  const url = new URL("/membership", "http://localhost");
  url.searchParams.set("tier", input.tier);
  url.searchParams.set("interval", input.billingInterval);

  if (input.billing) {
    url.searchParams.set("billing", input.billing);
  }

  if (input.from) {
    url.searchParams.set("from", input.from);
  }

  if (input.inviteCode) {
    url.searchParams.set("invite", input.inviteCode);
  }

  if (input.authMode) {
    url.searchParams.set("auth", input.authMode);
  }

  if (input.coreAccessConfirmed) {
    url.searchParams.set("coreAccessConfirmed", "1");
  }

  const href = `${url.pathname}${url.search}`;
  return input.anchor ? `${href}#${input.anchor}` : href;
}

function buildLoginHref(input: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  from?: string;
  inviteCode?: string;
}) {
  const url = new URL("/login", "http://localhost");
  url.searchParams.set(
    "from",
    buildMembershipHref({
      tier: input.tier,
      billingInterval: input.billingInterval,
      from: input.from,
      inviteCode: input.inviteCode
    })
  );

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

  if (getMembershipTierRank(input.targetTier) > getMembershipTierRank(input.currentTier)) {
    return getMembershipTierContent(input.targetTier).ctaLabel;
  }

  return `Move To ${getMembershipTierLabel(input.targetTier)}`;
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const session = await auth();
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const from = firstValue(params.from);
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase() || undefined;
  const authMode = firstValue(params.auth) === "register" ? "register" : undefined;
  const selectedTier = resolveTier(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(firstValue(params.interval));
  const coreAccessConfirmed = firstValue(params.coreAccessConfirmed) === "1";
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
  const foundingOfferByTier = {
    FOUNDATION: foundingOffer.foundation,
    INNER_CIRCLE: foundingOffer.innerCircle,
    CORE: foundingOffer.core
  } as const;
  const selectedTierDefinition = getMembershipTierDefinition(selectedTier);
  const selectedTierContent = selectedTierDefinition.content;
  const selectedFoundingOffer = foundingOfferByTier[selectedTier];
  const selectedStandardPlan = getMembershipBillingPlan(selectedTier, "standard", billingInterval);
  const selectedFoundingPrice = billingInterval === "annual"
    ? selectedFoundingOffer.foundingAnnualPrice
    : selectedFoundingOffer.foundingPrice;
  const selectedStandardPrice = billingInterval === "annual"
    ? selectedStandardPlan.annualPrice
    : selectedStandardPlan.monthlyPrice;
  const showAccountSetup = !isAuthenticated && (authMode === "register" || Boolean(inviteCode));
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
  const tierOptions = MEMBERSHIP_TIER_ORDER.map((tier) => {
    const offer = foundingOfferByTier[tier];
    const displayPrice = offer.available
      ? billingInterval === "annual"
        ? offer.foundingAnnualPrice
        : offer.foundingPrice
      : billingInterval === "annual"
        ? offer.standardAnnualPrice
        : offer.standardPrice;

    return {
      value: tier,
      label: `${getMembershipTierLabel(tier)} - ${formatMembershipPrice(displayPrice)}/${billingInterval === "annual" ? "year" : "month"}`
    };
  });

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
          Stripe checkout was cancelled. Your selected tier is still here whenever you want to continue.
        </p>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-border/80 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-8">
        <div className="space-y-6">
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
            {MEMBERSHIP_PAGE_MICROCOPY.map((line) => (
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
              <Link
                href={buildMembershipHref({
                  tier: selectedTier,
                  billingInterval: "monthly",
                  billing,
                  from,
                  inviteCode,
                  authMode,
                  coreAccessConfirmed
                })}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  billingInterval === "monthly"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                )}
              >
                Monthly
              </Link>
              <Link
                href={buildMembershipHref({
                  tier: selectedTier,
                  billingInterval: "annual",
                  billing,
                  from,
                  inviteCode,
                  authMode,
                  coreAccessConfirmed
                })}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  billingInterval === "annual"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                )}
              >
                Annual
              </Link>
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
        </div>

        <aside className="rounded-[1.8rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-background/20 to-background/10 p-5 shadow-gold-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Selected room</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">
            {selectedTierDefinition.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {selectedTierContent.description}
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-background/30 p-5">
            {selectedFoundingOffer.available ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                  Founding Member Rate
                </p>
                <p className="font-display text-4xl text-foreground">
                  {formatMembershipPrice(selectedFoundingPrice)}
                  <span className="ml-2 text-sm text-silver">
                    {billingInterval === "annual" ? "/year" : "/month"}
                  </span>
                </p>
                <p className="text-sm text-muted">
                  Usually{" "}
                  <span className="text-foreground">
                    {formatMembershipPrice(selectedStandardPrice)}
                    {billingInterval === "annual" ? "/year" : "/month"}
                  </span>
                </p>
                <p className="text-sm text-foreground">
                  {selectedFoundingOffer.remaining} of {selectedFoundingOffer.limit} founding places remaining
                </p>
                <p className="text-sm text-muted">
                  Once these are gone, standard pricing applies.
                </p>
                <p className="text-sm text-muted">
                  Founding rates stay locked while membership remains active.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Standard membership</p>
                <p className="font-display text-4xl text-foreground">
                  {formatMembershipPrice(selectedStandardPrice)}
                  <span className="ml-2 text-sm text-silver">
                    {billingInterval === "annual" ? "/year" : "/month"}
                  </span>
                </p>
                <p className="text-sm text-muted">
                  Founding Member spots have now been filled
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <div className="space-y-5">
        {MEMBERSHIP_TIER_ORDER.map((tier) => {
          const tierContent = getMembershipTierContent(tier);
          const standardPlan = getMembershipBillingPlan(tier, "standard", billingInterval);

          return (
            <MembershipTierSection
              key={tier}
              tier={tier}
              title={tierContent.badgeLabel}
              supportingBadge={tierContent.supportingBadge}
              description={tierContent.description}
              narrative={tierContent.narrative}
              emphasisLabel={tierContent.emphasisLabel}
              accessNote={tierContent.accessNote}
              trustLine={tierContent.trustLine}
              billingInterval={billingInterval}
              monthlyPrice={standardPlan.monthlyPrice}
              annualPrice={standardPlan.annualPrice}
              foundingOffer={foundingOfferByTier[tier]}
              featured={tier === MembershipTier.INNER_CIRCLE}
              selected={selectedTier === tier}
              action={
                <MembershipPlanAction
                  tier={tier}
                  source="membership"
                  billingInterval={billingInterval}
                  isAuthenticated={isAuthenticated}
                  isCurrentPlan={currentTier === tier}
                  hasActiveSubscription={hasActiveSubscription}
                  currentBillingInterval={currentBillingInterval}
                  buttonVariant={
                    tier === MembershipTier.FOUNDATION
                      ? "foundation"
                      : tier === MembershipTier.INNER_CIRCLE
                        ? "innerCircle"
                        : "core"
                  }
                  authenticatedLabel={getAuthenticatedLabel({
                    currentTier,
                    currentBillingInterval,
                    targetTier: tier,
                    targetBillingInterval: billingInterval
                  })}
                  unauthenticatedLabel={tierContent.ctaLabel}
                  joinHref={buildMembershipHref({
                    tier,
                    billingInterval,
                    from,
                    inviteCode,
                    authMode: "register",
                    anchor: "account-setup"
                  })}
                  loginHref={buildLoginHref({
                    tier,
                    billingInterval,
                    from,
                    inviteCode
                  })}
                />
              }
            />
          );
        })}
      </div>

      {showAccountSetup ? (
        <section
          id="account-setup"
          className="grid gap-6 rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/8 via-card/70 to-card/64 px-6 py-7 shadow-panel sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]"
        >
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Secure account setup</p>
            <h2 className="font-display text-3xl text-foreground sm:text-[2.2rem]">
              Create your account and continue
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Your chosen tier and billing choice are already attached to this path. Create your
              account here, then continue straight into secure checkout.
            </p>
            <div className="rounded-[1.5rem] border border-white/10 bg-background/25 p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Your selection</p>
              <p className="mt-3 text-lg font-medium text-foreground">
                {selectedTierDefinition.name} · {billingInterval === "annual" ? "Annual" : "Monthly"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {selectedFoundingOffer.available
                  ? `${formatMembershipPrice(selectedFoundingPrice)}${billingInterval === "annual" ? "/year" : "/month"} at the founding rate while places remain.`
                  : `${formatMembershipPrice(selectedStandardPrice)}${billingInterval === "annual" ? "/year" : "/month"} at the current standard rate.`}
              </p>
              {inviteCode ? (
                <p className="mt-3 text-sm text-muted">
                  Member invite <span className="text-foreground">{inviteCode}</span> is already attached to this path.
                </p>
              ) : null}
            </div>
          </div>

          <RegisterForm
            from={from}
            defaultTier={selectedTier}
            selectedTier={selectedTier}
            inviteCode={inviteCode}
            billingInterval={billingInterval}
            coreAccessConfirmed={coreAccessConfirmed}
            tierOptions={tierOptions}
          />
        </section>
      ) : null}

      <section className="rounded-[1.8rem] border border-white/8 bg-background/18 px-6 py-6 text-sm text-muted">
        <p>
          Founding rates stay locked while membership remains active. If membership is cancelled and later restarted, standard pricing applies.
        </p>
      </section>

      <FAQSection
        label="FAQ"
        title={membershipContent.faqTitle}
        description={membershipContent.faqDescription}
        items={membershipContent.faqs}
      />
    </div>
  );
}
