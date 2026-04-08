import type { Metadata } from "next";
import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import { Compass, Crown, TrendingUp } from "lucide-react";
import {
  FAQSection,
  FoundingOfferCounters,
  JsonLd,
  PricingCard
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
  MEMBERSHIP_TIER_ORDER,
  resolveMembershipBillingInterval,
  resolveMembershipTierInput
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

const stagePaths = [
  {
    tier: MembershipTier.FOUNDATION,
    stage: "Early stage",
    title: "Build the base properly",
    userType:
      "You are refining the offer, sharpening positioning, or building the structure around a younger business.",
    needNow:
      "You need a dependable room with better clarity, useful people, and enough structure to create traction cleanly.",
    recommendedLabel: "Best fit: Foundation",
    icon: Compass
  },
  {
    tier: MembershipTier.INNER_CIRCLE,
    stage: "Growing business",
    title: "Tighten the room around momentum",
    userType:
      "The business is moving, and you want better conversations, stronger context, and a more focused environment around the next stage.",
    needNow:
      "You need a room with higher signal, more intent, and more useful momentum than a wider base alone can give you.",
    recommendedLabel: "Best fit: Inner Circle",
    icon: TrendingUp
  },
  {
    tier: MembershipTier.CORE,
    stage: "Established operator",
    title: "Protect decision quality at a higher level",
    userType:
      "You are already operating seriously and want the calmest room, the strongest strategic proximity, and less noise around important decisions.",
    needNow:
      "You need a quieter, higher-value layer where judgement, access, and the quality of conversation matter more than wider access alone.",
    recommendedLabel: "Best fit: Core",
    icon: Crown
  }
] as const;

const stagePathByTier = Object.fromEntries(
  stagePaths.map((path) => [path.tier, path])
) as Record<(typeof stagePaths)[number]["tier"], (typeof stagePaths)[number]>;

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
  const selectedContent = getMembershipTierContent(selectedTier);
  const selectedOffer = foundingOfferByTier[selectedTier];
  const selectedPath = stagePathByTier[selectedTier];
  const selectedStandardPlan = getMembershipBillingPlan(selectedTier, "standard", billingInterval);
  const selectedDisplayPrice = selectedOffer.available
    ? billingInterval === "annual"
      ? selectedOffer.foundingAnnualPrice
      : selectedOffer.foundingPrice
    : billingInterval === "annual"
      ? selectedOffer.standardAnnualPrice
      : selectedOffer.standardPrice;
  const selectedStandardPrice =
    billingInterval === "annual"
      ? selectedStandardPlan.annualPrice
      : selectedStandardPlan.monthlyPrice;
  const selectedJoinHref = buildJoinConfirmationHref({
    tier: getMembershipTierSlug(selectedTier),
    period: billingInterval,
    billing,
    from,
    invite: inviteCode
  });

  return (
    <div className="space-y-12 pb-16">
      <JsonLd data={buildFaqSchema(membershipContent.faqs)} />

      {billing === "required" ? (
        <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          Your account needs an active membership to access member areas. Choose the right room,
          then continue into join and checkout.
        </p>
      ) : null}

      {billing === "cancelled" ? (
        <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
          Stripe checkout was cancelled. You can review the rooms again here, then continue when
          you are ready.
        </p>
      ) : null}

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership</p>
            <h1 className="font-display text-4xl text-foreground sm:text-5xl">
              Choose the room that fits the business now.
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted">
              Different businesses need different environments. This page is here to help you place
              yourself clearly, then move into join with confidence.
            </p>
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
            <p className="text-sm text-muted">Annual billing saves 20%</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {stagePaths.map((path) => {
              const selected = path.tier === selectedTier;
              const selectionHref = buildMembershipDecisionHref({
                tier: getMembershipTierSlug(path.tier),
                period: billingInterval,
                billing,
                from,
                invite: inviteCode
              });

              return (
                <Link
                  key={path.tier}
                  href={selectionHref}
                  className={cn(
                    "rounded-[1.7rem] border bg-card/65 p-5 shadow-panel transition-transform hover:-translate-y-0.5",
                    selected
                      ? path.tier === MembershipTier.FOUNDATION
                        ? "border-foundation/35 ring-1 ring-foundation/35"
                        : path.tier === MembershipTier.INNER_CIRCLE
                          ? "border-silver/28 ring-1 ring-silver/28"
                          : "border-gold/35 ring-1 ring-gold/35"
                      : "border-white/8"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-background/25 text-silver">
                      <path.icon size={18} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                      {path.stage}
                    </span>
                  </div>

                  <h2 className="mt-5 font-display text-2xl leading-tight text-foreground">
                    {path.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{path.userType}</p>
                  <p className="mt-4 text-sm leading-relaxed text-silver">{path.needNow}</p>
                  <p className="mt-5 text-xs uppercase tracking-[0.08em] text-gold">
                    {path.recommendedLabel}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[1.8rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-background/20 to-background/10 p-5 shadow-gold-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Selected path</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">{selectedDefinition.name}</h2>
          <p className="mt-2 text-sm text-silver">{selectedPath.stage}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">{selectedPath.needNow}</p>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-background/28 p-5">
            {selectedOffer.available ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founding access</p>
                <p className="text-sm text-muted">
                  Early access pricing for the first {selectedOffer.limit} members in this tier.
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
                  Once these places are filled, pricing rises to the standard rate.
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

          <Link
            href={selectedJoinHref}
            className={cn(
              buttonVariants({
                variant: getTierButtonVariant(selectedTier),
                size: "lg"
              }),
              "mt-6 w-full"
            )}
          >
            {selectedContent.ctaLabel}
          </Link>
        </aside>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="premium-kicker">Founding access</p>
          <h2 className="font-display text-3xl text-foreground sm:text-[2.3rem]">
            Early access pricing is limited by tier.
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Founding access is not a permanent public price. Each tier is limited to 50 members,
            and once a tier fills, pricing moves to the standard rate for everyone after that
            point.
          </p>
        </div>

        <FoundingOfferCounters offer={foundingOffer} />

        <p className="rounded-[1.8rem] border border-white/8 bg-background/18 px-6 py-5 text-sm text-muted">
          Founding rates stay locked while membership remains active. If membership is cancelled and
          later restarted, standard pricing applies.
        </p>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Tier display</p>
          <h2 className="font-display text-3xl text-foreground sm:text-[2.3rem]">
            Compare all tiers clearly before you continue.
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Switch between rooms here, then move into join once the right level feels obvious.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {MEMBERSHIP_TIER_ORDER.map((tier) => {
            const tierContent = getMembershipTierContent(tier);
            const definition = getMembershipTierDefinition(tier);
            const standardPlan = getMembershipBillingPlan(tier, "standard", billingInterval);
            const isSelected = selectedTier === tier;
            const selectionHref = buildMembershipDecisionHref({
              tier: getMembershipTierSlug(tier),
              period: billingInterval,
              billing,
              from,
              invite: inviteCode
            });

            return (
              <PricingCard
                key={tier}
                tier={tier}
                name={definition.name}
                positioningLabel={stagePathByTier[tier].stage}
                billingInterval={billingInterval}
                monthlyPrice={standardPlan.monthlyPrice}
                annualPrice={standardPlan.annualPrice}
                description={tierContent.description}
                features={definition.features}
                foundingOffer={foundingOfferByTier[tier]}
                featured={tier === MembershipTier.INNER_CIRCLE && !isSelected}
                featuredLabel="Growing businesses often move here"
                selected={isSelected}
                ctaHref={selectionHref}
                ctaLabel={isSelected ? "Selected above" : `Switch to ${definition.name}`}
              />
            );
          })}
        </div>
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
