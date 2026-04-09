"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MembershipTier } from "@prisma/client";
import type { FoundingOfferTierSnapshot } from "@/types";
import { RegisterForm } from "@/components/auth/register-form";
import { MembershipPlanAction } from "@/components/billing";
import { TierBadge } from "@/components/public/tier-badge";
import { Button } from "@/components/ui/button";
import {
  formatMembershipPrice,
  getMembershipBillingPlan,
  getMembershipTierContent,
  getMembershipTierDefinition,
  getMembershipTierLabel,
  getMembershipTierRank,
  getMembershipTierSlug,
  MEMBERSHIP_TIER_ORDER,
  type MembershipBillingInterval
} from "@/config/membership";
import { buildJoinConfirmationHref } from "@/lib/join/routing";
import {
  getTierAccentTextClassName,
  getTierButtonVariant,
  getTierCardClassName,
  getTierSelectionRingClassName
} from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type JoinCheckoutPrepProps = {
  initialSelectedTier: MembershipTier;
  initialBillingInterval: MembershipBillingInterval;
  initialCoreAccessConfirmed?: boolean;
  initialShowAccountSetup?: boolean;
  billing?: string;
  from?: string;
  inviteCode?: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  currentTier: MembershipTier;
  currentBillingInterval: MembershipBillingInterval | null;
  foundingOfferByTier: Record<MembershipTier, FoundingOfferTierSnapshot>;
};

const tierStageLabels: Record<MembershipTier, string> = {
  FOUNDATION: "Early stage",
  INNER_CIRCLE: "Growing business",
  CORE: "Established operator"
};

const tierSwitchLines: Record<MembershipTier, string> = {
  FOUNDATION: "A steady place to build the base properly.",
  INNER_CIRCLE: "A tighter room for stronger signal and sharper conversation.",
  CORE: "A quieter room for operators carrying heavier decisions."
};

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

function periodLabel(period: MembershipBillingInterval) {
  return period === "annual" ? "/year" : "/month";
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

function updateJoinUrl(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", href);
}

export function JoinCheckoutPrep({
  initialSelectedTier,
  initialBillingInterval,
  initialCoreAccessConfirmed = false,
  initialShowAccountSetup = false,
  billing,
  from,
  inviteCode,
  isAuthenticated,
  hasActiveSubscription,
  currentTier,
  currentBillingInterval,
  foundingOfferByTier
}: JoinCheckoutPrepProps) {
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(initialSelectedTier);
  const [billingInterval, setBillingInterval] =
    useState<MembershipBillingInterval>(initialBillingInterval);
  const [coreAccessConfirmed, setCoreAccessConfirmed] = useState(initialCoreAccessConfirmed);
  const [showAccountSetup, setShowAccountSetup] = useState(initialShowAccountSetup);

  useEffect(() => {
    setSelectedTier(initialSelectedTier);
  }, [initialSelectedTier]);

  useEffect(() => {
    setBillingInterval(initialBillingInterval);
  }, [initialBillingInterval]);

  useEffect(() => {
    setCoreAccessConfirmed(initialCoreAccessConfirmed);
  }, [initialCoreAccessConfirmed]);

  useEffect(() => {
    setShowAccountSetup(initialShowAccountSetup);
  }, [initialShowAccountSetup]);

  const selectedOffer = foundingOfferByTier[selectedTier];
  const selectedContent = getMembershipTierContent(selectedTier);
  const selectedDefinition = getMembershipTierDefinition(selectedTier);
  const selectedPlan = getMembershipBillingPlan(selectedTier, "standard", billingInterval);
  const currentJoinHref = useMemo(
    () =>
      buildJoinConfirmationHref({
        tier: getMembershipTierSlug(selectedTier),
        period: billingInterval,
        billing,
        from,
        invite: inviteCode,
        coreAccessConfirmed: selectedTier === "CORE" ? coreAccessConfirmed : undefined
      }),
    [billing, billingInterval, coreAccessConfirmed, from, inviteCode, selectedTier]
  );
  const loginHref = useMemo(
    () => `/login?from=${encodeURIComponent(currentJoinHref)}`,
    [currentJoinHref]
  );
  const selectedDisplayPrice = selectedPriceForInterval(selectedOffer, billingInterval);
  const selectedStandardPrice =
    billingInterval === "annual" ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  const requiresCoreConfirmation = selectedTier === "CORE";
  const canContinueToCore = !requiresCoreConfirmation || coreAccessConfirmed;

  useEffect(() => {
    updateJoinUrl(currentJoinHref);
  }, [currentJoinHref]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.78fr)] xl:items-start">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[1.8rem] border border-white/10 bg-card/55 p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Billing cadence</p>
            <div className="inline-flex rounded-full border border-border/80 bg-background/30 p-1">
              {(["monthly", "annual"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillingInterval(period)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition-colors",
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

          <p className="text-sm text-muted sm:text-right">
            Annual billing saves 20% and carries straight into checkout.
          </p>
        </div>

        <div className="grid gap-3">
          {MEMBERSHIP_TIER_ORDER.map((tier) => {
            const offer = foundingOfferByTier[tier];
            const displayPrice = selectedPriceForInterval(offer, billingInterval);
            const tierSelected = selectedTier === tier;

            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  "rounded-[1.8rem] border bg-card/70 p-5 text-left shadow-panel transition-transform hover:-translate-y-0.5",
                  getTierCardClassName(tier),
                  tierSelected ? getTierSelectionRingClassName(tier) : ""
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TierBadge tier={tier} />
                      <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                        {tierStageLabels[tier]}
                      </span>
                      {tierSelected ? (
                        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                          Selected
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <h2 className="font-display text-3xl text-foreground">
                        {getMembershipTierLabel(tier)}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted">{tierSwitchLines[tier]}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-left sm:text-right">
                    <div className="flex items-end gap-2 sm:justify-end">
                      <span className={cn("font-display text-4xl", getTierAccentTextClassName(tier))}>
                        {formatMembershipPrice(displayPrice)}
                      </span>
                      <span className="pb-1 text-sm text-silver">{periodLabel(billingInterval)}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {offer.available
                        ? `${offer.remaining} of ${offer.limit} founding places remaining`
                        : offer.launchClosedLabel}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-8">
        <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/78 to-card/68 p-6 shadow-gold-soft sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={selectedTier} />
            <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
              {tierStageLabels[selectedTier]}
            </span>
            {selectedContent.accessNote ? (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                {selectedContent.accessNote}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 font-display text-4xl text-foreground">{selectedDefinition.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            {selectedContent.description}
          </p>

          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-background/24 p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Best fit</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{selectedContent.bestFitLine}</p>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-background/28 p-5">
            {selectedOffer.available ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founding access</p>
                <p className="text-sm text-muted">
                  Limited to the first {selectedOffer.limit} members in this tier.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <span
                    className={cn("font-display text-5xl", getTierAccentTextClassName(selectedTier))}
                  >
                    {formatMembershipPrice(selectedDisplayPrice)}
                  </span>
                  <span className="pb-1 text-sm text-silver">{periodLabel(billingInterval)}</span>
                </div>
                <p className="text-sm text-muted">
                  Usually{" "}
                  <span className="text-foreground">
                    {formatMembershipPrice(selectedStandardPrice)}
                    {periodLabel(billingInterval)}
                  </span>
                </p>
                <p className="text-sm text-foreground">
                  {selectedOffer.remaining} of {selectedOffer.limit} founding places remaining
                </p>
                <p className="text-sm text-muted">
                  When these places are filled, pricing moves to the standard rate.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Current pricing</p>
                <div className="flex flex-wrap items-end gap-2">
                  <span
                    className={cn("font-display text-5xl", getTierAccentTextClassName(selectedTier))}
                  >
                    {formatMembershipPrice(selectedStandardPrice)}
                  </span>
                  <span className="pb-1 text-sm text-silver">{periodLabel(billingInterval)}</span>
                </div>
                <p className="text-sm text-muted">{selectedOffer.launchClosedLabel}</p>
              </div>
            )}
          </div>

          {requiresCoreConfirmation ? (
            <label className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-gold/25 bg-background/25 px-4 py-4 text-sm text-foreground">
              <input
                type="checkbox"
                checked={coreAccessConfirmed}
                onChange={(event) => setCoreAccessConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
              />
              <span>I am actively running a business or generating revenue from a business</span>
            </label>
          ) : null}

          <div className="mt-6">
            {isAuthenticated ? (
              <MembershipPlanAction
                tier={selectedTier}
                source="join"
                billingInterval={billingInterval}
                coreAccessConfirmed={coreAccessConfirmed}
                showCoreConfirmation={false}
                isAuthenticated
                isCurrentPlan={currentTier === selectedTier}
                hasActiveSubscription={hasActiveSubscription}
                currentBillingInterval={currentBillingInterval}
                buttonVariant={getTierButtonVariant(selectedTier)}
                authenticatedLabel={getAuthenticatedLabel({
                  currentTier,
                  currentBillingInterval,
                  targetTier: selectedTier,
                  targetBillingInterval: billingInterval
                })}
                unauthenticatedLabel={selectedContent.ctaLabel}
                joinHref={currentJoinHref}
                loginHref={loginHref}
              />
            ) : (
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  variant={getTierButtonVariant(selectedTier)}
                  onClick={() => setShowAccountSetup(true)}
                  disabled={!canContinueToCore}
                >
                  Continue To Secure Setup
                </Button>
                <p className="text-center text-xs text-muted">
                  Already a member?{" "}
                  <Link href={loginHref} className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-2">
            {[
              "You can move between tiers later as the business evolves.",
              selectedOffer.available
                ? "Founder pricing only applies while this room still has founder allocation available."
                : "Founder pricing is not active in this room right now.",
              "Secure checkout is completed in Stripe after account setup."
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm leading-relaxed text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        {!isAuthenticated && showAccountSetup ? (
          <RegisterForm
            from={from}
            loginFrom={currentJoinHref}
            defaultTier={selectedTier}
            selectedTier={selectedTier}
            inviteCode={inviteCode}
            billingInterval={billingInterval}
            coreAccessConfirmed={coreAccessConfirmed}
            showTierSelector={false}
            showCoreConfirmation={false}
            submitDisabled={!canContinueToCore}
            streamlined
          />
        ) : null}
      </aside>
    </div>
  );
}
