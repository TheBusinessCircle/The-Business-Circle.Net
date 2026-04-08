import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import {
  FAQSection,
  FoundingOfferCounters,
  JsonLd,
  MembershipTierSection
} from "@/components/public";
import { buttonVariants } from "@/components/ui/button";
import {
  buildJoinConfirmationHref,
  buildMembershipDecisionHref,
  firstValue
} from "@/lib/join/routing";
import { getTierButtonVariant } from "@/lib/tier-styles";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { buildFaqSchema } from "@/lib/structured-data";
import {
  formatMembershipPrice,
  getMembershipBillingPlan,
  getMembershipTierContent,
  getMembershipTierDefinition,
  getMembershipTierSlug,
  MEMBERSHIP_PAGE_MICROCOPY,
  MEMBERSHIP_TIER_ORDER,
  resolveMembershipBillingInterval,
  resolveMembershipTierInput,
  type MembershipBillingInterval
} from "@/config/membership";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Business Membership Plans For Founders",
  description:
    "Understand the difference between Foundation, Inner Circle, and Core membership, then choose the room that fits the current stage of your business.",
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

function GuidanceCard({
  tier,
  billingInterval,
  selected,
  href,
  foundingOffer
}: {
  tier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  selected: boolean;
  href: string;
  foundingOffer: {
    available: boolean;
    foundingPrice: number;
    foundingAnnualPrice: number;
    standardPrice: number;
    standardAnnualPrice: number;
    remaining: number;
    limit: number;
    launchClosedLabel: string;
  };
}) {
  const content = getMembershipTierContent(tier);
  const definition = getMembershipTierDefinition(tier);
  const displayPrice = foundingOffer.available
    ? billingInterval === "annual"
      ? foundingOffer.foundingAnnualPrice
      : foundingOffer.foundingPrice
    : billingInterval === "annual"
      ? foundingOffer.standardAnnualPrice
      : foundingOffer.standardPrice;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-[1.8rem] border bg-card/65 p-5 shadow-panel transition-transform hover:-translate-y-0.5",
        tier === MembershipTier.FOUNDATION
          ? "border-foundation/28 bg-gradient-to-br from-foundation/12 via-card/78 to-card/70"
          : tier === MembershipTier.INNER_CIRCLE
            ? "border-silver/22 bg-gradient-to-br from-silver/12 via-card/78 to-card/70"
            : "border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/68",
        selected
          ? tier === MembershipTier.FOUNDATION
            ? "ring-1 ring-foundation/35"
            : tier === MembershipTier.INNER_CIRCLE
              ? "ring-1 ring-silver/28"
              : "ring-1 ring-gold/38"
          : ""
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
          {content.supportingBadge}
        </span>
        {content.emphasisLabel ? (
          <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
            {content.emphasisLabel}
          </span>
        ) : null}
        {content.accessNote ? (
          <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            {content.accessNote}
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 font-display text-3xl text-foreground">{definition.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{content.bestFitLine}</p>
      <p className="mt-4 font-display text-3xl text-foreground">
        {formatMembershipPrice(displayPrice)}
        <span className="ml-2 text-sm text-silver">
          {billingInterval === "annual" ? "/year" : "/month"}
        </span>
      </p>
      <p className="mt-3 text-xs text-muted">
        {foundingOffer.available
          ? `${foundingOffer.remaining} of ${foundingOffer.limit} founding places remaining`
          : foundingOffer.launchClosedLabel}
      </p>
    </Link>
  );
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const params = await searchParams;
  const billing = firstValue(params.billing);
  const from = firstValue(params.from);
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase() || undefined;
  const selectedTier = resolveMembershipTierInput(firstValue(params.tier));
  const billingInterval = resolveMembershipBillingInterval(
    firstValue(params.period) ?? firstValue(params.interval)
  );

  const [membershipContent, foundingOffer] = await Promise.all([
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot()
  ]);

  const foundingOfferByTier = {
    FOUNDATION: foundingOffer.foundation,
    INNER_CIRCLE: foundingOffer.innerCircle,
    CORE: foundingOffer.core
  } as const;
  const selectedDefinition = getMembershipTierDefinition(selectedTier);
  const selectedContent = selectedDefinition.content;
  const selectedOffer = foundingOfferByTier[selectedTier];
  const selectedStandardPlan = getMembershipBillingPlan(selectedTier, "standard", billingInterval);
  const selectedDisplayPrice = selectedOffer.available
    ? billingInterval === "annual"
      ? selectedOffer.foundingAnnualPrice
      : selectedOffer.foundingPrice
    : billingInterval === "annual"
      ? selectedOffer.standardAnnualPrice
      : selectedOffer.standardPrice;
  const selectedStandardPrice =
    billingInterval === "annual" ? selectedStandardPlan.annualPrice : selectedStandardPlan.monthlyPrice;

  return (
    <div className="space-y-12 pb-16">
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />

      {billing === "required" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your account needs an active membership to access member areas. Choose the right room, then continue into join and checkout.
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. You can review the rooms again here, then continue when you are ready.
        </p>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(300px,0.94fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership Decision Page</p>
            <h1 className="font-display text-4xl text-foreground sm:text-5xl">
              The right room depends on where the business is now.
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted">
              Foundation gives you the right base. Inner Circle gives you a more focused room. Core is for serious operators who want the calmest, highest-value environment.
            </p>
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
              {(["monthly", "annual"] as const).map((period) => (
                <Link
                  key={period}
                  href={buildMembershipDecisionHref({
                    tier: getMembershipTierSlug(selectedTier),
                    period,
                    billing,
                    from,
                    invite: inviteCode
                  })}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    billingInterval === period
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {period === "monthly" ? "Monthly" : "Annual"}
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted">Pay annually and save 20%</p>
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-background/20 to-background/10 p-5 shadow-gold-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Currently in focus</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">{selectedDefinition.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{selectedContent.description}</p>
          <p className="mt-3 text-sm text-silver">{selectedContent.bestFitLine}</p>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-background/28 p-5">
            {selectedOffer.available ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founding Member Rate</p>
                <p className="text-sm text-muted">
                  Limited to the first {selectedOffer.limit} members in this tier
                </p>
                <p className="font-display text-4xl text-foreground">
                  {formatMembershipPrice(selectedDisplayPrice)}
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
                  {selectedOffer.remaining} of {selectedOffer.limit} founding places remaining
                </p>
                <p className="text-sm text-muted">
                  Founding rates stay locked while membership remains active.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Current pricing</p>
                <p className="font-display text-4xl text-foreground">
                  {formatMembershipPrice(selectedStandardPrice)}
                  <span className="ml-2 text-sm text-silver">
                    {billingInterval === "annual" ? "/year" : "/month"}
                  </span>
                </p>
                <p className="text-sm text-muted">{selectedOffer.launchClosedLabel}</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="space-y-5">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">How To Place Yourself</p>
          <h2 className="font-display text-3xl text-foreground sm:text-[2.3rem]">
            Choose the room that matches the stage and weight of the business.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            This page is here to guide the decision. Once you know the right fit, continue into join to confirm pricing, sign up, and move into secure checkout.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {MEMBERSHIP_TIER_ORDER.map((tier) => (
            <GuidanceCard
              key={tier}
              tier={tier}
              billingInterval={billingInterval}
              selected={selectedTier === tier}
              foundingOffer={foundingOfferByTier[tier]}
              href={buildMembershipDecisionHref({
                tier: getMembershipTierSlug(tier),
                period: billingInterval,
                billing,
                from,
                invite: inviteCode
              })}
            />
          ))}
        </div>
      </section>

      <FoundingOfferCounters offer={foundingOffer} />

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
              narrative={`${tierContent.bestFitLine} ${tierContent.narrative}`}
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
                <Link
                  href={buildJoinConfirmationHref({
                    tier: getMembershipTierSlug(tier),
                    period: billingInterval,
                    billing,
                    from,
                    invite: inviteCode
                  })}
                  className={cn(
                    buttonVariants({
                      variant: getTierButtonVariant(tier),
                      size: "lg"
                    }),
                    "w-full"
                  )}
                >
                  {tierContent.ctaLabel}
                </Link>
              }
            />
          );
        })}
      </div>

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
