"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MembershipTier } from "@prisma/client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Crown,
  Shield,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import type { FoundingOfferTierSnapshot } from "@/types";
import { FAQSection } from "@/components/public/faq-section";
import { JourneyRail } from "@/components/public/journey-rail";
import { TierBadge } from "@/components/public/tier-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  formatMembershipPrice,
  getMembershipTierDefinition,
  getMembershipTierSlug,
  type MembershipBillingInterval
} from "@/config/membership";
import {
  buildJoinConfirmationHref,
  buildMembershipDecisionHref
} from "@/lib/join/routing";
import {
  getFounderRoomAvailabilitySummary,
  getFounderRoomPricingNote
} from "@/lib/founding-offer-copy";
import {
  getTierAccentTextClassName,
  getTierButtonVariant,
  getTierCardClassName,
  getTierIconClassName,
  getTierSelectionRingClassName
} from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type MembershipGuidedSelectorProps = {
  initialSelectedTier: MembershipTier;
  initialBillingInterval: MembershipBillingInterval;
  billing?: string;
  from?: string;
  inviteCode?: string;
  foundingOfferByTier: Record<MembershipTier, FoundingOfferTierSnapshot>;
  faqTitle: string;
  faqDescription: string;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
};

type TierGuide = {
  tier: MembershipTier;
  title: string;
  positioningLine: string;
  bestForLine: string;
  detailSummary: string;
  whoItsFor: string;
  whatYouNeed: string;
  whyThisFits: string;
  ctaLabel: string;
  icon: LucideIcon;
};

const TIER_GUIDES: TierGuide[] = [
  {
    tier: "FOUNDATION",
    title: "Foundation",
    positioningLine: "A steady room for owners building the structure properly.",
    bestForLine:
      "Best when the business needs a stronger base, better context, and clearer next steps.",
    detailSummary:
      "Build the base properly before the business needs more depth.",
    whoItsFor:
      "Designed for owners still tightening the foundations of the business, shaping the offer, or building more consistency into growth.",
    whatYouNeed:
      "You need clearer structure, better context, and a room where conversation helps the business move without adding noise.",
    whyThisFits:
      "Foundation gives you the right base around the work so momentum can build cleanly before you need a tighter room.",
    ctaLabel: "Enter Foundation",
    icon: Compass
  },
  {
    tier: "INNER_CIRCLE",
    title: "Inner Circle",
    positioningLine: "A tighter room for businesses already carrying momentum.",
    bestForLine:
      "Best when stronger signal, deeper conversation, and more relevant context will help the business move better.",
    detailSummary:
      "Tighten the room around momentum, context, and sharper conversation.",
    whoItsFor:
      "Designed for businesses with traction that want sharper discussion, stronger positioning, and a more intentional room around the next stage of growth.",
    whatYouNeed:
      "You need higher-signal conversation, stronger visibility, and more useful context than a wider room usually holds.",
    whyThisFits:
      "Inner Circle raises the quality of context and discussion without turning the membership into a status game.",
    ctaLabel: "Enter Inner Circle",
    icon: TrendingUp
  },
  {
    tier: "CORE",
    title: "Core",
    positioningLine: "A quieter room for operators carrying heavier decisions.",
    bestForLine:
      "Best when proximity, judgement, and the quality of the room matter more than wider access alone.",
    detailSummary:
      "Protect decision quality with more serious context and less noise.",
    whoItsFor:
      "Designed for established operators carrying real responsibility who want the calmest room, the best proximity, and more serious conversation.",
    whatYouNeed:
      "You need a quieter environment where judgement matters, the signal stays high, and the room supports more consequential decisions.",
    whyThisFits:
      "Core protects the conversation, raises the level of proximity, and keeps serious growth discussion inside a more controlled environment.",
    ctaLabel: "Enter Core",
    icon: Crown
  }
] as const;

const FOUNDER_PERSPECTIVE_LINES = [
  "Different stages of business need different environments.",
  "The goal is not to push everyone into the highest tier. The goal is to help owners enter the right room and keep the environment useful.",
  "That is what keeps the network calmer, more relevant, and more commercially useful over time."
] as const;

const REASSURANCE_ITEMS = [
  {
    title: "Stage, not status",
    description:
      "This is not a ladder where higher automatically means better. The right room is the one that matches the current stage of the business."
  },
  {
    title: "Protected by design",
    description:
      "A founder-led business network stays useful when each room keeps the right level of context, pace, and conversation quality."
  },
  {
    title: "Move when it makes sense",
    description:
      "You can start where the fit is obvious, then move deeper only when the business genuinely needs more."
  }
] as const;

function findTierGuide(tier: MembershipTier) {
  return TIER_GUIDES.find((guide) => guide.tier === tier) ?? TIER_GUIDES[0];
}

function updateMembershipUrl(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", href);
}

function selectedPriceForInterval(
  offer: FoundingOfferTierSnapshot,
  billingInterval: MembershipBillingInterval
) {
  return offer.available
    ? billingInterval === "annual"
      ? offer.foundingAnnualPrice
      : offer.foundingPrice
    : billingInterval === "annual"
      ? offer.standardAnnualPrice
      : offer.standardPrice;
}

function standardPriceForInterval(
  offer: FoundingOfferTierSnapshot,
  billingInterval: MembershipBillingInterval
) {
  return billingInterval === "annual" ? offer.standardAnnualPrice : offer.standardPrice;
}

function founderAvailabilityLine(offer: FoundingOfferTierSnapshot) {
  if (offer.available) {
    return `${offer.remaining} founder place${offer.remaining === 1 ? "" : "s"} remaining of ${offer.limit}.`;
  }

  return `${offer.claimed} of ${offer.limit} founder places already taken.`;
}

function FounderRateSummary({
  selectedGuide,
  selectedOffer,
  activeFounderTierCount
}: {
  selectedGuide: TierGuide;
  selectedOffer: FoundingOfferTierSnapshot;
  activeFounderTierCount: number;
}) {
  const summary = getFounderRoomAvailabilitySummary({
    offer: selectedOffer,
    tierName: getMembershipTierDefinition(selectedGuide.tier).name,
    hasFounderRateElsewhere: !selectedOffer.available && activeFounderTierCount > 0
  });

  return (
    <>
      <p className="text-sm text-foreground">{summary.title}</p>
      <p className="text-xs leading-relaxed text-muted">{summary.description}</p>
    </>
  );
}

function BillingOptionRow({
  label,
  price,
  note,
  active,
  offer,
  founderActive
}: {
  label: string;
  price: number;
  note?: string;
  active: boolean;
  offer: FoundingOfferTierSnapshot;
  founderActive: boolean;
}) {
  const standardPrice = label === "Annual" ? offer.standardAnnualPrice : offer.standardPrice;

  return (
    <div
      className={cn(
        "rounded-[1.2rem] border px-4 py-3 transition-colors duration-300",
        active
          ? "border-white/14 bg-background/40 text-foreground"
          : "border-white/8 bg-background/22 text-muted"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.08em]">{label}</p>
        {note ? <p className="text-[11px] text-silver">{note}</p> : null}
      </div>
      <p className="mt-2 text-lg font-medium text-foreground">
        {formatMembershipPrice(price)}
        <span className="ml-1 text-sm text-silver">{label === "Annual" ? "/year" : "/month"}</span>
      </p>
      {founderActive ? (
        <p className="mt-1 text-xs text-muted">
          Usually {formatMembershipPrice(standardPrice)}
          {label === "Annual" ? "/year" : "/month"}
        </p>
      ) : null}
    </div>
  );
}

function SelectedPathPanel({
  guide,
  billingInterval,
  offer,
  joinHref,
  reducedMotion,
  compact = false
}: {
  guide: TierGuide;
  billingInterval: MembershipBillingInterval;
  offer: FoundingOfferTierSnapshot;
  joinHref: string;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const selectedDisplayPrice = selectedPriceForInterval(offer, billingInterval);
  const selectedStandardPrice = standardPriceForInterval(offer, billingInterval);
  const selectedDefinition = getMembershipTierDefinition(guide.tier);
  const selectedTierAccentClassName = getTierAccentTextClassName(guide.tier);
  const selectedTierIconClassName = getTierIconClassName(guide.tier);

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 14 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.95rem] border border-white/10 bg-gradient-to-br from-background/36 via-card/82 to-card/72 shadow-panel",
        compact ? "p-5" : "p-6 sm:p-7"
      )}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Selected Path</p>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={guide.tier} />
            <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
              Selected
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground sm:text-[2.1rem]">
              {selectedDefinition.name}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-silver">
              {guide.detailSummary}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Who This Is For</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whoItsFor}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              What You Need Right Now
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whatYouNeed}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Why This Fits</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whyThisFits}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-background/16 p-5">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              Included In This Room
            </p>
            <p className="text-sm text-muted">What you get inside this room.</p>
          </div>

          <ul className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/6 bg-background/14">
            {selectedDefinition.content.includedBenefits.map((benefit, index) => (
              <li
                key={benefit}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 text-sm leading-relaxed text-muted",
                  index > 0 ? "border-t border-white/6" : ""
                )}
              >
                <CheckCircle2
                  size={16}
                  className={cn("mt-0.5 shrink-0", selectedTierIconClassName)}
                />
                <span className="max-w-[42rem]">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.6rem] border border-gold/18 bg-gradient-to-br from-gold/10 via-background/18 to-background/8 p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Pricing</p>

          <div className="mt-4 space-y-3">
            {offer.available ? (
              <>
                <p className="text-sm text-foreground">Founder rate currently available</p>
                <p className="text-sm leading-relaxed text-muted">
                  Founder pricing stays available only while this room still has founder allocation
                  open.
                </p>
                <p className="text-xs uppercase tracking-[0.08em] text-gold/90">
                  {founderAvailabilityLine(offer)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">{offer.launchClosedLabel}</p>
                <p className="text-sm leading-relaxed text-muted">
                  Standard pricing is currently active for this room.
                </p>
                <p className="text-xs uppercase tracking-[0.08em] text-silver">
                  {founderAvailabilityLine(offer)}
                </p>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${guide.tier}-${billingInterval}-${selectedDisplayPrice}`}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className={cn("font-display text-4xl leading-none sm:text-5xl", selectedTierAccentClassName)}
              >
                {formatMembershipPrice(selectedDisplayPrice)}
              </motion.span>
            </AnimatePresence>
            <span className="pb-1 text-sm text-silver">
              {billingInterval === "annual" ? "/year" : "/month"}
            </span>
          </div>

          <p className="mt-3 text-sm text-muted">
            {billingInterval === "annual"
              ? "Annual billing saves 20%."
              : "Switch to annual to save 20%."}
            {" "}
            Usually {formatMembershipPrice(selectedStandardPrice)}
            {billingInterval === "annual" ? "/year" : "/month"}.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <BillingOptionRow
              label="Monthly"
              price={offer.available ? offer.foundingPrice : offer.standardPrice}
              active={billingInterval === "monthly"}
              offer={offer}
              founderActive={offer.available}
            />
            <BillingOptionRow
              label="Annual"
              price={offer.available ? offer.foundingAnnualPrice : offer.standardAnnualPrice}
              note="Save 20%"
              active={billingInterval === "annual"}
              offer={offer}
              founderActive={offer.available}
            />
          </div>

          {offer.available ? (
            <motion.p
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={reducedMotion ? undefined : { opacity: 1 }}
              transition={{ duration: 0.26 }}
              className="mt-4 rounded-[1.2rem] border border-white/10 bg-background/24 px-4 py-3 text-sm leading-relaxed text-muted"
            >
              Founder pricing is removed when this room&apos;s founder allocation is filled.
            </motion.p>
          ) : (
            <p className="mt-4 rounded-[1.2rem] border border-white/10 bg-background/24 px-4 py-3 text-sm leading-relaxed text-muted">
              {getFounderRoomPricingNote(offer)}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href={joinHref}
            className={cn(
              buttonVariants({
                variant: getTierButtonVariant(guide.tier),
                size: "lg"
              }),
              "group w-full"
            )}
          >
            {guide.ctaLabel}
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-sm leading-relaxed text-muted">
            Secure Stripe checkout is next. Access only opens after payment is confirmed, and you can still switch rooms before that if another level fits more clearly.
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export function MembershipGuidedSelector({
  initialSelectedTier,
  initialBillingInterval,
  billing,
  from,
  inviteCode,
  foundingOfferByTier,
  faqTitle,
  faqDescription,
  faqItems
}: MembershipGuidedSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(initialSelectedTier);
  const [billingInterval, setBillingInterval] =
    useState<MembershipBillingInterval>(initialBillingInterval);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    setSelectedTier(initialSelectedTier);
  }, [initialSelectedTier]);

  useEffect(() => {
    setBillingInterval(initialBillingInterval);
  }, [initialBillingInterval]);

  const selectionHref = useMemo(
    () =>
      buildMembershipDecisionHref({
        tier: getMembershipTierSlug(selectedTier),
        period: billingInterval,
        billing,
        from,
        invite: inviteCode
      }),
    [billing, billingInterval, from, inviteCode, selectedTier]
  );

  useEffect(() => {
    updateMembershipUrl(selectionHref);
  }, [selectionHref]);

  const selectedGuide = findTierGuide(selectedTier);
  const selectedOffer = foundingOfferByTier[selectedTier];
  const activeFounderTierCount = useMemo(
    () => Object.values(foundingOfferByTier).filter((item) => item.available).length,
    [foundingOfferByTier]
  );

  const selectedJoinHref = useMemo(
    () =>
      buildJoinConfirmationHref({
        tier: getMembershipTierSlug(selectedTier),
        period: billingInterval,
        billing,
        from,
        invite: inviteCode
      }),
    [billing, billingInterval, from, inviteCode, selectedTier]
  );

  return (
    <div className="w-full min-w-0 space-y-14 pb-16 sm:space-y-16 lg:space-y-20">
      <JourneyRail
        currentStep="membership"
        note="Use this page to place the business properly. When the fit feels clear, the selected room carries straight into join."
        nextAction={{ href: selectedJoinHref, label: "Continue To Join" }}
      />

      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-card/55 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-silver/10 blur-[96px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-foundation/14 blur-[120px]" />

        <div className="relative grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)] xl:items-end">
          <div className="space-y-5">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership</p>
              <h1 className="max-w-4xl font-display text-[clamp(2.05rem,7.6vw,4rem)] leading-tight text-foreground sm:text-5xl">
                Choose the room that matches the business now.
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-muted">
                Different businesses need different environments. This page is here to help owners
                place themselves clearly, understand the room that fits now, and move toward join
                with confidence.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-silver">
                Better placement keeps the network useful. That is why the cards stay light, the
                depth only appears after selection, and the decision path stays calm.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Select the room that fits now.",
                "Carry that choice into join.",
                "Complete secure Stripe checkout."
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-white/8 bg-background/18 px-4 py-4 text-sm leading-relaxed text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.55rem] border border-white/10 bg-background/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Billing</p>
              <div className="mt-3 inline-flex w-full rounded-full border border-border/80 bg-background/30 p-1 sm:w-auto">
                {(["monthly", "annual"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={billingInterval === period}
                    onClick={() => setBillingInterval(period)}
                    className={cn(
                      "flex-1 rounded-full px-4 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 sm:flex-none",
                      billingInterval === period
                        ? "bg-foreground text-background"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {period === "monthly" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                Annual billing saves 20% and carries straight into join and checkout.
              </p>
            </div>

            <div className="rounded-[1.55rem] border border-gold/18 bg-gradient-to-br from-gold/10 via-background/20 to-background/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founder allocation</p>
              <div className="mt-3 space-y-2">
                <FounderRateSummary
                  selectedGuide={selectedGuide}
                  selectedOffer={selectedOffer}
                  activeFounderTierCount={activeFounderTierCount}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="premium-kicker">Position Selection</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Select the room first. Read the depth second.
          </h2>
          <p className="text-base leading-relaxed text-muted">
            This is structured to reduce overload. Cards stay light and scannable. Depth appears
            after you choose where the business fits now.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,27rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(340px,28rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 lg:gap-5">
            {TIER_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const selected = guide.tier === selectedTier;
              const selectionToneClassName = getTierSelectionRingClassName(guide.tier);
              const selectionCardClassName = getTierCardClassName(guide.tier);
              const detailJoinHref = buildJoinConfirmationHref({
                tier: getMembershipTierSlug(guide.tier),
                period: billingInterval,
                billing,
                from,
                invite: inviteCode
              });

              return (
                <div key={guide.tier} className="space-y-4">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedTier(guide.tier)}
                    className={cn(
                      "group relative flex w-full min-h-[196px] flex-col justify-between overflow-hidden rounded-[1.8rem] border p-5 text-left shadow-panel transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-0 sm:min-h-[224px] sm:p-6",
                      selectionCardClassName,
                      selected
                        ? cn(
                            selectionToneClassName,
                            "scale-[1.015] bg-card/88 shadow-[0_24px_56px_rgba(2,6,23,0.34)]"
                          )
                        : "bg-card/62 opacity-85 hover:-translate-y-1 hover:opacity-100 hover:shadow-[0_22px_46px_rgba(2,6,23,0.3)]"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
                    </div>

                    <div className="relative flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-background/24 text-silver">
                        <Icon size={18} />
                      </span>
                      {selected ? (
                        <span className="rounded-full border border-white/12 bg-background/28 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-foreground">
                          Selected
                        </span>
                      ) : null}
                    </div>

                    <div className="relative mt-7 space-y-4">
                      <h3
                        className={cn(
                          "font-display text-[1.75rem] leading-tight transition-colors duration-300 sm:text-[1.9rem]",
                          selected ? "text-foreground" : "text-silver"
                        )}
                      >
                        {guide.title}
                      </h3>
                      <p className="max-w-[30rem] text-sm leading-relaxed text-silver">
                        {guide.positioningLine}
                      </p>
                      <p className="max-w-[30rem] text-sm leading-relaxed text-muted">
                        {guide.bestForLine}
                      </p>
                    </div>
                  </button>

                  <div className="lg:hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      {selected ? (
                        <SelectedPathPanel
                          key={`${guide.tier}-${billingInterval}`}
                          guide={guide}
                          billingInterval={billingInterval}
                          offer={foundingOfferByTier[guide.tier]}
                          joinHref={detailJoinHref}
                          reducedMotion={reducedMotion}
                          compact
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-8">
            <AnimatePresence mode="wait" initial={false}>
              <SelectedPathPanel
                key={`${selectedTier}-${billingInterval}`}
                guide={selectedGuide}
                billingInterval={billingInterval}
                offer={selectedOffer}
                joinHref={selectedJoinHref}
                reducedMotion={reducedMotion}
              />
            </AnimatePresence>
          </aside>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-card/52 px-6 py-7 shadow-panel sm:px-8 sm:py-8">
        <div className="max-w-3xl space-y-4">
          <p className="premium-kicker">Founder Perspective</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Why this is structured this way
          </h2>
          <div className="space-y-3 text-base leading-relaxed text-muted">
            {FOUNDER_PERSPECTIVE_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-3">
          <p className="premium-kicker">Reassurance</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            This is based on stage, not status.
          </h2>
          <p className="text-base leading-relaxed text-muted">
            The point is structured support, not hierarchy. A room stays useful when the placement
            is clearer and the environment matches the stage of the business.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {REASSURANCE_ITEMS.map((item, index) => {
            const Icon = index === 0 ? Sparkles : index === 1 ? Shield : Users;

            return (
              <Card key={item.title} className="border-border/80 bg-card/66 shadow-panel-soft">
                <CardContent className="space-y-4 p-6 sm:p-7">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background/24 text-silver">
                    <Icon size={18} />
                  </span>
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl text-foreground">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <FAQSection
        label="Questions"
        title={faqTitle}
        description={faqDescription}
        items={faqItems}
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-gold/24 bg-gradient-to-br from-gold/12 via-card/74 to-card/70 px-6 py-8 shadow-gold-soft sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-20 top-0 h-60 w-60 rounded-full bg-foundation/12 blur-[110px]" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-gold/14 blur-[96px]" />

        <div className="relative max-w-3xl space-y-5">
          <p className="premium-kicker">Final Step</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            When the fit feels clear, continue to join.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Your selected room and billing interval carry straight into join. The next page keeps
            account setup, pricing confirmation, and secure Stripe checkout in one clear flow.
          </p>
          <div className="space-y-4">
            <Link
              href={selectedJoinHref}
              className={cn(
                buttonVariants({
                  variant: getTierButtonVariant(selectedTier),
                  size: "lg"
                }),
                "group w-full sm:w-auto"
              )}
            >
              {selectedGuide.ctaLabel}
              <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-sm leading-relaxed text-muted">
              You can move between tiers later as the business evolves. {getFounderRoomPricingNote(selectedOffer)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
