"use client";

import { useEffect, useMemo, useState } from "react";
import type { MembershipTier } from "@prisma/client";
import type { FoundingOfferTierSnapshot } from "@/types";
import { RegisterForm } from "@/components/auth/register-form";
import { MembershipPlanAction } from "@/components/billing";
import { TierBadge } from "@/components/public/tier-badge";
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
  FOUNDATION: "Start with the clearest base around the business.",
  INNER_CIRCLE: "Step into a tighter room with stronger momentum.",
  CORE: "Move into the closest strategic layer."
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

  useEffect(() => {
    setSelectedTier(initialSelectedTier);
  }, [initialSelectedTier]);

  useEffect(() => {
    setBillingInterval(initialBillingInterval);
  }, [initialBillingInterval]);

  useEffect(() => {
    setCoreAccessConfirmed(initialCoreAccessConfirmed);
  }, [initialCoreAccessConfirmed]);

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
  const selectedDisplayPrice = selectedPriceForInterval(selectedOffer, billingInterval);
  const selectedStandardPrice =
    billingInterval === "annual" ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  const requiresCoreConfirmation = selectedTier === "CORE";
  const canContinueToCore = !requiresCoreConfirmation || coreAccessConfirmed;

  useEffect(() => {
    updateJoinUrl(currentJoinHref);
  }, [currentJoinHref]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] xl:items-start">
      <section className="space-y-4">
        <div className="rounded-[1.8rem] border border-white/10 bg-card/55 p-5 shadow-panel sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Price view</p>
              <h1 className="font-display text-3xl text-foreground sm:text-[2.45rem]">
                Choose your tier, then continue.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                Switch between tiers and billing before checkout. The selected room stays attached
                to this join path.
              </p>
            </div>

            <div className="space-y-2">
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
              <p className="text-sm text-muted md:text-right">Annual billing saves 20%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {MEMBERSHIP_TIER_ORDER.map((tier) => {
            const tierContent = getMembershipTierContent(tier);
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
                      <p className="text-xs uppercase tracking-[0.08em] text-silver">
                        {tierContent.supportingBadge}
                      </p>
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
            <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
              {selectedContent.supportingBadge}
            </span>
            {selectedContent.accessNote ? (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                {selectedContent.accessNote}
              </span>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            <h2 className="font-display text-4xl text-foreground">{selectedDefinition.name}</h2>
            <p className="text-sm leading-relaxed text-muted">{tierSwitchLines[selectedTier]}</p>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-background/28 p-5">
            {selectedOffer.available ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founding access</p>
                <p className="text-sm text-muted">
                  Early access pricing for the first {selectedOffer.limit} members in this tier.
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
                  Once these places are filled, pricing moves to the standard rate.
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
        </article>

        {requiresCoreConfirmation ? (
          <label className="flex items-start gap-3 rounded-[1.6rem] border border-gold/25 bg-card/60 px-5 py-4 text-sm text-foreground shadow-panel">
            <input
              type="checkbox"
              checked={coreAccessConfirmed}
              onChange={(event) => setCoreAccessConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
            />
            <span>I am actively running a business or generating revenue from a business</span>
          </label>
        ) : null}

        {!isAuthenticated ? (
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
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-card/70 p-6 shadow-panel">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Checkout</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Continue with {selectedDefinition.name} on {billingInterval} billing.
            </p>

            <div className="mt-6">
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
                loginHref={`/login?from=${encodeURIComponent(currentJoinHref)}`}
              />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
