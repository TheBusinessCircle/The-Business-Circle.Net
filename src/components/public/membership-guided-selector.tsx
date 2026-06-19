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
  TrendingUp,
} from "lucide-react";
import type { FoundingOfferTierSnapshot } from "@/types";
import { FAQSection } from "@/components/public/faq-section";
import {
  CheckoutReassuranceBlock,
  MemberPreviewLayer
} from "@/components/public/launch-readiness";
import { TierBadge } from "@/components/public/tier-badge";
import { SectionFeatureImage } from "@/components/visual-media";
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
  getFounderAllocationLine,
  getFounderRoomPricingNote
} from "@/lib/founding-offer-copy";
import {
  ANALYTICS_EVENTS,
  trackAnalyticsEvent,
  trackMembershipSelectedFromAudit,
  trackMembershipTierViewed
} from "@/lib/analytics";
import {
  getTierAccentTextClassName,
  getTierButtonVariant,
  getTierCardClassName,
  getTierIconClassName,
  getTierSelectionRingClassName
} from "@/lib/tier-styles";
import { cn } from "@/lib/utils";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";

type MembershipGuidedSelectorProps = {
  initialSelectedTier: MembershipTier;
  initialBillingInterval: MembershipBillingInterval;
  billing?: string;
  source?: "audit";
  from?: string;
  inviteCode?: string;
  foundingOfferByTier: Record<MembershipTier, FoundingOfferTierSnapshot>;
  faqTitle: string;
  faqDescription: string;
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  roomsPlacement?: VisualMediaRenderablePlacement | null;
  fastPath?: boolean;
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
  chooseThisIf: readonly string[];
  ctaLabel: string;
  icon: LucideIcon;
};

const TIER_GUIDES: TierGuide[] = [
  {
    tier: "FOUNDATION",
    title: "Foundation",
    positioningLine: "For owners who want a better business room around them.",
    bestForLine:
      "Best for early-stage connection, visibility, resources and joining the environment.",
    detailSummary:
      "A better base for owners who want to step inside without overcomplicating the decision.",
    whoItsFor:
      "Designed for owners who want a calmer business room around them, useful resources, profile visibility and better conversations with other serious owners.",
    whatYouNeed:
      "You need better context, useful connection and a structured place to begin without stepping straight into the deepest room.",
    whyThisFits:
      "Foundation gives you the base environment so you can build trust, understand the room and make your first useful moves.",
    chooseThisIf: [
      "You want to enter the environment properly",
      "You want visibility, resources and owner context",
      "You want better conversations without a heavier room yet"
    ],
    ctaLabel: "Enter Foundation",
    icon: Compass
  },
  {
    tier: "INNER_CIRCLE",
    title: "Inner Circle",
    positioningLine:
      "For owners who want stronger context, closer discussion and better business conversations.",
    bestForLine:
      "Best for deeper relationship building, more focused rooms and stronger strategic interaction.",
    detailSummary:
      "A tighter room for owners who need more context, stronger signal and closer discussion.",
    whoItsFor:
      "Designed for owners who already know the value of the wider room and want stronger conversation, more focused access and better strategic context.",
    whatYouNeed:
      "You need more relevant discussion, closer relationships and a room where owners bring better context to the conversation.",
    whyThisFits:
      "Inner Circle gives you a closer environment without turning membership into a status game.",
    chooseThisIf: [
      "You want stronger owner-to-owner discussion",
      "You value deeper relationships over loose access",
      "You want a more focused room around the business"
    ],
    ctaLabel: "Enter Inner Circle",
    icon: TrendingUp
  },
  {
    tier: "CORE",
    title: "Core",
    positioningLine: "For owners who want serious proximity, visibility and strategic depth.",
    bestForLine:
      "Best for owners who want the highest level of access, trust and involvement inside the network.",
    detailSummary:
      "The highest-context room for owners carrying more serious decisions and wanting greater proximity.",
    whoItsFor:
      "Designed for operators carrying real responsibility who want the calmest room, stronger proximity and more strategic depth inside the network.",
    whatYouNeed:
      "You need a quieter environment where judgement matters, trust is protected and the room supports more consequential decisions.",
    whyThisFits:
      "Core protects the highest-context layer of the network and keeps serious growth discussion inside a more controlled environment.",
    chooseThisIf: [
      "You want the highest level of proximity",
      "You are carrying more consequential decisions",
      "You want strategic depth inside a trusted room"
    ],
    ctaLabel: "Enter Core",
    icon: Crown
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
  onBillingIntervalChange,
  offer,
  joinHref,
  reducedMotion,
  source,
  compact = false
}: {
  guide: TierGuide;
  billingInterval: MembershipBillingInterval;
  onBillingIntervalChange: (billingInterval: MembershipBillingInterval) => void;
  offer: FoundingOfferTierSnapshot;
  joinHref: string;
  reducedMotion: boolean;
  source?: "audit";
  compact?: boolean;
}) {
  const selectedDisplayPrice = selectedPriceForInterval(offer, billingInterval);
  const selectedStandardPrice = standardPriceForInterval(offer, billingInterval);
  const selectedDefinition = getMembershipTierDefinition(guide.tier);
  const selectedTierAccentClassName = getTierAccentTextClassName(guide.tier);
  const selectedTierIconClassName = getTierIconClassName(guide.tier);
  const cameFromAudit = source === "audit";

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
            {cameFromAudit ? (
              <span className="rounded-full border border-gold/24 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                Recommended based on your audit
              </span>
            ) : null}
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

        <div className="rounded-[1.6rem] border border-gold/18 bg-gradient-to-br from-gold/10 via-background/18 to-background/8 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Pricing</p>
            <div className="inline-flex rounded-full border border-border/80 bg-background/30 p-1">
              {(["monthly", "annual"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={billingInterval === period}
                  onClick={() => onBillingIntervalChange(period)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
                    billingInterval === period
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {period === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {offer.available ? (
              <>
                <p className="text-sm text-foreground">Founder rate currently available</p>
                <p className="text-xs uppercase tracking-[0.08em] text-gold/90">
                  {getFounderAllocationLine(offer)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">{offer.launchClosedLabel}</p>
                <p className="text-sm leading-relaxed text-muted">
                  Standard pricing is currently active for this room.
                </p>
                <p className="text-xs uppercase tracking-[0.08em] text-silver">
                  {getFounderAllocationLine(offer)}
                </p>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${guide.tier}-${billingInterval}-${selectedDisplayPrice}`}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "font-display text-4xl leading-none sm:text-5xl",
                  selectedTierAccentClassName
                )}
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

          {compact ? null : (
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
          )}

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
            onClick={() => {
              if (cameFromAudit) {
                trackMembershipSelectedFromAudit({
                  tier: guide.tier,
                  href: joinHref
                });
              }
            }}
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
          <CheckoutReassuranceBlock compact />
        </div>

        <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Why This Fits</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whyThisFits}</p>
        </div>

        {compact ? null : (
          <>
            <div className="grid gap-3">
              <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  Who This Is For
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whoItsFor}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/8 bg-background/18 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  What You Need Right Now
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{guide.whatYouNeed}</p>
              </div>
              <div className="rounded-[1.35rem] border border-gold/18 bg-gold/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                  Choose this if
                </p>
                <ul className="mt-3 space-y-2">
                  {guide.chooseThisIf.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
          </>
        )}
      </div>
    </motion.article>
  );
}

export function MembershipGuidedSelector({
  initialSelectedTier,
  initialBillingInterval,
  billing,
  source,
  from,
  inviteCode,
  foundingOfferByTier,
  faqTitle,
  faqDescription,
  faqItems,
  roomsPlacement,
  fastPath = false
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
        source,
        from,
        invite: inviteCode
      }),
    [billing, billingInterval, from, inviteCode, selectedTier, source]
  );

  useEffect(() => {
    updateMembershipUrl(selectionHref);
  }, [selectionHref]);

  const selectedGuide = findTierGuide(selectedTier);
  const selectedOffer = foundingOfferByTier[selectedTier];
  useEffect(() => {
    trackMembershipTierViewed({
      source: source === "audit" ? "audit" : "membership",
      tier: selectedTier,
      billingInterval
    });
  }, [billingInterval, selectedTier, source]);

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
    <div className="public-content-stack">
      <section className={cn("public-section-compact", fastPath ? "pt-0" : "")}>
        <div
          className={cn(
            "gap-4 xl:items-center",
            !fastPath && roomsPlacement?.isActive && roomsPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,0.92fr)_minmax(260px,0.42fr)]"
              : "max-w-3xl"
          )}
        >
          <div className="max-w-3xl space-y-3">
            <p className="premium-kicker">
              {fastPath ? "Audit pricing" : "Pricing Begins Here"}
            </p>
            <h2 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
              {fastPath
                ? "Confirm the recommended room and checkout."
                : "Select the room, confirm price and checkout next."}
            </h2>
            <p className="text-base leading-relaxed text-white/80">
              {fastPath
                ? "Your selected tier, billing option, price and join action are shown first."
                : "The selected room opens first on mobile. Switch tier or billing without losing the checkout path."}
            </p>
          </div>
          {!fastPath && roomsPlacement?.isActive && roomsPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={roomsPlacement}
              tone="platform"
              aspectClassName="aspect-[16/9] xl:aspect-[4/3]"
              className="min-h-[10rem]"
            />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,27rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(340px,28rem)]">
          <aside className="min-w-0 lg:order-2 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <AnimatePresence mode="wait" initial={false}>
              <SelectedPathPanel
                key={`${selectedTier}-${billingInterval}`}
                guide={selectedGuide}
                billingInterval={billingInterval}
                onBillingIntervalChange={setBillingInterval}
                offer={selectedOffer}
                joinHref={selectedJoinHref}
                reducedMotion={reducedMotion}
                source={source}
                compact={fastPath}
              />
            </AnimatePresence>
          </aside>

          <div className="order-2 flex flex-col gap-3 lg:order-1 lg:gap-4">
            {TIER_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const selected = guide.tier === selectedTier;
              const selectionToneClassName = getTierSelectionRingClassName(guide.tier);
              const selectionCardClassName = getTierCardClassName(guide.tier);
              return (
                <div key={guide.tier}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedTier(guide.tier);
                      trackAnalyticsEvent(ANALYTICS_EVENTS.membershipTierSelected, {
                        source: source === "audit" ? "audit" : "membership",
                        tier: guide.tier,
                        billingInterval
                      });
                    }}
                    className={cn(
                      "group relative flex w-full flex-col justify-between overflow-hidden rounded-[1.35rem] border p-4 text-left shadow-panel transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-0 sm:p-5",
                      selectionCardClassName,
                      selected
                        ? cn(
                            selectionToneClassName,
                            "bg-card/92 shadow-[0_18px_42px_rgba(2,6,23,0.28)]"
                          )
                        : "bg-card/68 opacity-90 hover:-translate-y-1 hover:opacity-100 hover:shadow-[0_22px_46px_rgba(2,6,23,0.3)]"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
                    </div>

                    <div className="relative flex items-center justify-between gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/24 text-silver">
                        <Icon size={17} />
                      </span>
                      {selected ? (
                        <span className="rounded-full border border-white/12 bg-background/28 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-foreground">
                          {source === "audit" ? "Recommended based on your audit" : "Selected"}
                        </span>
                      ) : null}
                    </div>

                    <div className="relative mt-4 space-y-2">
                      <h3
                        className={cn(
                          "font-display text-2xl leading-tight transition-colors duration-300",
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
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {fastPath ? null : (
        <>
          <MemberPreviewLayer />

          <FAQSection
            label="Questions"
            title={faqTitle}
            description={faqDescription}
            items={faqItems}
          />

          <section className="public-section-compact relative overflow-hidden rounded-[1.45rem] border border-gold/24 bg-gradient-to-br from-gold/12 via-card/74 to-card/70 p-5 shadow-gold-soft sm:p-6">
            <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
            <div className="relative max-w-3xl space-y-4">
              <p className="premium-kicker">Where</p>
              <h2 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
                Choose, checkout, access your account and start connecting.
              </h2>
              <p className="text-base leading-relaxed text-white/80">
                Your selected room and billing interval carry straight into join. The next page
                keeps account setup, pricing confirmation and secure Stripe checkout in one clear
                flow.
              </p>
              <Link
                href={selectedJoinHref}
                onClick={() => {
                  if (source === "audit") {
                    trackMembershipSelectedFromAudit({
                      tier: selectedTier,
                      href: selectedJoinHref
                    });
                  }
                }}
                className={cn(
                  buttonVariants({
                    variant: getTierButtonVariant(selectedTier),
                    size: "lg"
                  }),
                  "group w-full sm:w-auto"
                )}
              >
                Secure your place in {selectedGuide.title}
                <ArrowRight
                  size={16}
                  className="ml-2 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
