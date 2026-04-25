"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { MembershipTier } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import type { FoundingOfferTierSnapshot } from "@/types";
import { RegisterForm } from "@/components/auth/register-form";
import { MembershipPlanAction } from "@/components/billing";
import { TierBadge } from "@/components/public/tier-badge";
import { Button } from "@/components/ui/button";
import {
  formatMembershipPrice,
  getMembershipTierContent,
  getMembershipTierDefinition,
  getMembershipTierLabel,
  getMembershipTierRank,
  getMembershipTierSlug,
  MEMBERSHIP_TIER_ORDER,
  type MembershipBillingInterval
} from "@/config/membership";
import { getFounderRoomPricingNote } from "@/lib/founding-offer-copy";
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

export type JoinStep = "tier" | "account";

export function resolveInitialJoinStep(initialShowAccountSetup: boolean): JoinStep {
  return initialShowAccountSetup ? "account" : "tier";
}

export function transitionJoinStep(action: "continue" | "back"): JoinStep {
  return action === "continue" ? "account" : "tier";
}

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

function founderAvailabilityLine(offer: FoundingOfferTierSnapshot) {
  if (offer.available) {
    if (offer.remaining === offer.limit) {
      return `${offer.limit} founder place${offer.limit === 1 ? "" : "s"} currently available.`;
    }

    return `${offer.remaining} founder place${offer.remaining === 1 ? "" : "s"} remaining of ${offer.limit}.`;
  }

  return `${offer.claimed} of ${offer.limit} founder places already taken.`;
}

function updateJoinUrl(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", href);
}

function buildTierDetailNotes(input: {
  selectedOffer: FoundingOfferTierSnapshot;
  selectedTier: MembershipTier;
}): string[] {
  return [
    "You can move between tiers later as the business evolves.",
    input.selectedOffer.available
      ? "Founder pricing only applies while this room still has founder allocation available."
      : getFounderRoomPricingNote(input.selectedOffer),
    "Billing is completed securely in Stripe, and access is only created after payment confirms."
  ];
}

function renderTierDetailPanel(input: {
  selectedTier: MembershipTier;
  billingInterval: MembershipBillingInterval;
  selectedOffer: FoundingOfferTierSnapshot;
  selectedContent: ReturnType<typeof getMembershipTierContent>;
  selectedDefinition: ReturnType<typeof getMembershipTierDefinition>;
  selectedDisplayPrice: number;
  selectedStandardPrice: number;
  selectedNotes: string[];
  requiresCoreConfirmation: boolean;
  coreAccessConfirmed: boolean;
  setCoreAccessConfirmed: (value: boolean) => void;
  isAuthenticated: boolean;
  currentTier: MembershipTier;
  currentBillingInterval: MembershipBillingInterval | null;
  hasActiveSubscription: boolean;
  currentJoinHref: string;
  loginHref: string;
  canContinueToCore: boolean;
  onContinueToAccountSetup: () => void;
}): ReactNode {
  return (
    <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/78 to-card/68 p-6 shadow-gold-soft transition-all duration-300 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={input.selectedTier} />
        <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
          {tierStageLabels[input.selectedTier]}
        </span>
        <span className="rounded-full border border-white/10 bg-background/25 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
          {input.billingInterval === "annual" ? "Annual billing" : "Monthly billing"}
        </span>
        {input.selectedContent.accessNote ? (
          <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
            {input.selectedContent.accessNote}
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Step 1 of 2</p>
        <h1 className="font-display text-4xl text-foreground">{input.selectedDefinition.name}</h1>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          {input.selectedContent.description}
        </p>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-background/24 p-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
          Right for the business when
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {input.selectedContent.bestFitLine}
        </p>
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-background/28 p-5">
        {input.selectedOffer.available ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founding access</p>
            <p className="text-sm text-muted">
              Founder pricing is still available in this room for a limited founder allocation.
            </p>
            <p className="text-xs uppercase tracking-[0.08em] text-gold/90">
              {founderAvailabilityLine(input.selectedOffer)}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <span
                className={cn(
                  "font-display text-5xl",
                  getTierAccentTextClassName(input.selectedTier)
                )}
              >
                {formatMembershipPrice(input.selectedDisplayPrice)}
              </span>
              <span className="pb-1 text-sm text-silver">{periodLabel(input.billingInterval)}</span>
            </div>
            <p className="text-sm text-muted">
              Usually{" "}
              <span className="text-foreground">
                {formatMembershipPrice(input.selectedStandardPrice)}
                {periodLabel(input.billingInterval)}
              </span>
            </p>
            <p className="text-sm text-muted">
              Founder pricing moves to the standard rate once this room&apos;s founder allocation is
              filled.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Current pricing</p>
            <div className="flex flex-wrap items-end gap-2">
              <span
                className={cn(
                  "font-display text-5xl",
                  getTierAccentTextClassName(input.selectedTier)
                )}
              >
                {formatMembershipPrice(input.selectedStandardPrice)}
              </span>
              <span className="pb-1 text-sm text-silver">{periodLabel(input.billingInterval)}</span>
            </div>
            <p className="text-xs uppercase tracking-[0.08em] text-silver">
              {founderAvailabilityLine(input.selectedOffer)}
            </p>
            <p className="text-sm text-muted">{input.selectedOffer.launchClosedLabel}</p>
          </div>
        )}
      </div>

      {input.requiresCoreConfirmation ? (
        <label className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-gold/25 bg-background/25 px-4 py-4 text-sm text-foreground">
          <input
            type="checkbox"
            checked={input.coreAccessConfirmed}
            onChange={(event) => input.setCoreAccessConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border bg-background accent-primary"
          />
          <span>I am actively running a business or generating revenue from a business</span>
        </label>
      ) : null}

      <div className="mt-6">
        {input.isAuthenticated ? (
          <MembershipPlanAction
            tier={input.selectedTier}
            source="join"
            billingInterval={input.billingInterval}
            coreAccessConfirmed={input.coreAccessConfirmed}
            showCoreConfirmation={false}
            isAuthenticated
            isCurrentPlan={input.currentTier === input.selectedTier}
            hasActiveSubscription={input.hasActiveSubscription}
            currentBillingInterval={input.currentBillingInterval}
            buttonVariant={getTierButtonVariant(input.selectedTier)}
            authenticatedLabel={getAuthenticatedLabel({
              currentTier: input.currentTier,
              currentBillingInterval: input.currentBillingInterval,
              targetTier: input.selectedTier,
              targetBillingInterval: input.billingInterval
            })}
            unauthenticatedLabel={input.selectedContent.ctaLabel}
            joinHref={input.currentJoinHref}
            loginHref={input.loginHref}
          />
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              size="lg"
              variant={getTierButtonVariant(input.selectedTier)}
              onClick={input.onContinueToAccountSetup}
              disabled={!input.canContinueToCore}
            >
              Continue To Account Setup
            </Button>
            <p className="text-center text-xs text-muted">
              Already a member?{" "}
              <Link href={input.loginHref} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-2">
        {input.selectedNotes.map((item) => (
          <div
            key={item}
            className="rounded-[1.2rem] border border-white/8 bg-background/18 px-4 py-3 text-sm leading-relaxed text-muted"
          >
            {item}
          </div>
        ))}
      </div>
    </article>
  );
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
  const [joinStep, setJoinStep] = useState<JoinStep>(
    resolveInitialJoinStep(initialShowAccountSetup)
  );

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
    setJoinStep(resolveInitialJoinStep(initialShowAccountSetup));
  }, [initialShowAccountSetup]);

  const selectedOffer = foundingOfferByTier[selectedTier];
  const selectedContent = getMembershipTierContent(selectedTier);
  const selectedDefinition = getMembershipTierDefinition(selectedTier);
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
    billingInterval === "annual" ? selectedOffer.standardAnnualPrice : selectedOffer.standardPrice;
  const requiresCoreConfirmation = selectedTier === "CORE";
  const canContinueToCore = !requiresCoreConfirmation || coreAccessConfirmed;
  const selectedNotes = useMemo(
    () =>
      buildTierDetailNotes({
        selectedOffer,
        selectedTier
      }),
    [selectedOffer, selectedTier]
  );
  const isAccountStep = !isAuthenticated && joinStep === "account";

  useEffect(() => {
    updateJoinUrl(currentJoinHref);
  }, [currentJoinHref]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.78fr)] xl:items-start">
      <section className={cn("space-y-4", isAccountStep ? "hidden xl:block" : "")}>
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
            Annual billing saves 20% and carries straight into secure checkout.
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
                      <p className="text-xs uppercase tracking-[0.08em] text-silver">
                        {offer.available
                          ? founderAvailabilityLine(offer)
                          : billingInterval === "annual"
                            ? "Annual billing saves 20%."
                            : "Annual billing available."}
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
                        ? "Founder pricing currently available"
                        : offer.launchClosedLabel}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        {isAccountStep ? (
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
            headerAction={
              <button
                type="button"
                onClick={() => setJoinStep(transitionJoinStep("back"))}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/30 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-silver transition-colors hover:text-foreground"
              >
                <ArrowLeft size={14} />
                Back to membership selection
              </button>
            }
            titleOverride="Secure account setup"
            descriptionOverride="Create your account details before moving to secure Stripe checkout."
            streamlined
          />
        ) : (
          renderTierDetailPanel({
            selectedTier,
            billingInterval,
            selectedOffer,
            selectedContent,
            selectedDefinition,
            selectedDisplayPrice,
            selectedStandardPrice,
            selectedNotes,
            requiresCoreConfirmation,
            coreAccessConfirmed,
            setCoreAccessConfirmed: (value) => setCoreAccessConfirmed(value),
            isAuthenticated,
            currentTier,
            currentBillingInterval,
            hasActiveSubscription,
            currentJoinHref,
            loginHref,
            canContinueToCore,
            onContinueToAccountSetup: () => setJoinStep(transitionJoinStep("continue"))
          })
        )}
      </aside>
    </div>
  );
}
