"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { MembershipPlanAction } from "@/components/billing";
import { FoundingOfferCounters } from "@/components/public/founding-offer-counters";
import { PricingCard } from "@/components/public/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FoundingOfferSnapshot } from "@/types";

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type FoundingOfferCard = {
  badgeLabel: string;
  offerLabel: string;
  foundingPrice: number;
  standardPrice: number;
  claimed: number;
  limit: number;
  remaining: number;
  available: boolean;
  launchClosedLabel: string;
  tier?: MembershipTier;
};

type TierOption = {
  value: MembershipTier;
  label: string;
};

type PricingCardConfig = {
  tier: MembershipTier;
  name: string;
  positioningLabel?: string;
  spotlight?: {
    label: string;
    text: string;
  };
  monthlyPrice: number;
  description: string;
  features: string[];
  foundingOffer: FoundingOfferCard;
  featured?: boolean;
  featuredLabel?: string;
  joinHref: string;
  loginHref: string;
  buttonVariant: "foundation" | "innerCircle" | "core";
  authenticatedLabel: string;
  unauthenticatedLabel: string;
  isCurrentPlan: boolean;
};

type JoinDecisionStep = {
  step: string;
  title: string;
  description: string;
};

type JoinExperienceProps = {
  foundingOffer: FoundingOfferSnapshot;
  initialSelectedTier: MembershipTier;
  from?: string;
  inviteCode?: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  tierOptions: TierOption[];
  pricingCards: PricingCardConfig[];
  joinDecisionSteps: readonly JoinDecisionStep[];
};

const tierSummary: Record<
  MembershipTier,
  {
    label: string;
    short: string;
    audience: string;
  }
> = {
  FOUNDATION: {
    label: "Foundation",
    short: "Strongest starting point",
    audience: "For founders who want a structured room and a clearer base."
  },
  INNER_CIRCLE: {
    label: "Inner Circle",
    short: "Best balanced upgrade",
    audience: "For stronger signal, better context, and more focused conversation."
  },
  CORE: {
    label: "Core",
    short: "Closest strategic layer",
    audience: "For members who want the calmest, highest-value room."
  }
};

function updateJoinQueryTier(tier: MembershipTier) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("tier", tier);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function JoinExperience({
  foundingOffer,
  initialSelectedTier,
  from,
  inviteCode,
  isAuthenticated,
  hasActiveSubscription,
  tierOptions,
  pricingCards,
  joinDecisionSteps
}: JoinExperienceProps) {
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(initialSelectedTier);

  useEffect(() => {
    setSelectedTier(initialSelectedTier);
  }, [initialSelectedTier]);

  const selectedSummary = tierSummary[selectedTier];

  const handleTierChange = (tier: MembershipTier) => {
    setSelectedTier(tier);
    updateJoinQueryTier(tier);
  };

  return (
    <div
      className={cn(
        "grid items-start gap-8 xl:gap-10",
        isAuthenticated
          ? "grid-cols-1"
          : "xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,430px)]"
      )}
    >
      <div className="min-w-0 space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership levels</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="font-display text-3xl text-foreground sm:text-[2.15rem]">
                Choose the level that fits where you are now
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted">
                Compare the rooms properly, keep the tier selection in sync with the form, and
                move into checkout without losing the current flow.
              </p>
            </div>

            <Card className="border-gold/25 bg-gradient-to-br from-gold/10 via-card/82 to-background/65 lg:max-w-sm">
              <CardContent className="space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Selected tier</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                    {selectedSummary.label}
                  </Badge>
                  <span className="text-xs text-silver">{selectedSummary.short}</span>
                </div>
                <p className="text-sm text-muted">{selectedSummary.audience}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="space-y-6">
          <FoundingOfferCounters offer={foundingOffer} />

          <div className="grid items-stretch gap-6 md:grid-cols-2 xl:gap-7 2xl:grid-cols-3">
            {pricingCards.map((card) => {
              const selected = selectedTier === card.tier;

              return (
                <div
                  key={card.tier}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => handleTierChange(card.tier)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleTierChange(card.tier);
                    }
                  }}
                  className={cn(
                    "group flex h-full min-w-0 flex-col gap-3 rounded-[1.7rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0",
                    selected ? "ring-1 ring-gold/45" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-3 px-1 pt-1">
                    <p className="inline-flex items-center gap-2 text-xs text-muted">
                      <CheckCircle2
                        size={14}
                        className={
                          selected ? "text-gold" : "text-silver/45 transition-colors group-hover:text-silver"
                        }
                      />
                      {selected ? "Selected for the form" : "Click anywhere to select"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em]",
                        selected ? "text-gold" : "text-silver/70"
                      )}
                    >
                      Choose plan
                      <ArrowRight size={12} />
                    </span>
                  </div>

                  <PricingCard
                    tier={card.tier}
                    name={card.name}
                    positioningLabel={card.positioningLabel}
                    spotlight={card.spotlight}
                    monthlyPrice={card.monthlyPrice}
                    description={card.description}
                    features={card.features}
                    foundingOffer={card.foundingOffer}
                    featured={card.featured}
                    featuredLabel={card.featuredLabel}
                    selected={selected}
                    className="min-w-0 h-auto flex-1"
                    cta={
                      <MembershipPlanAction
                        tier={card.tier}
                        source="join"
                        isAuthenticated={isAuthenticated}
                        isCurrentPlan={card.isCurrentPlan}
                        hasActiveSubscription={hasActiveSubscription}
                        buttonVariant={card.buttonVariant}
                        authenticatedLabel={card.authenticatedLabel}
                        unauthenticatedLabel={card.unauthenticatedLabel}
                        joinHref={card.joinHref}
                        loginHref={card.loginHref}
                      />
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 pt-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.95fr)]">
          <Card className="border-border/80 bg-card/68">
            <CardHeader className="pb-4">
              <p className="premium-kicker w-fit">What Happens Next</p>
              <CardTitle className="text-2xl">Create your account once, then move cleanly into billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
              <p>Create your account with the level that fits where your business is now.</p>
              <p>Complete secure checkout and activate access.</p>
              <p>Enter the platform with a clear route into discussion, resources, profile setup, and the wider ecosystem.</p>
              <p>You can move between tiers later if the business needs a stronger room.</p>
            </CardContent>
          </Card>

          <Card className="border-gold/20 bg-gradient-to-br from-background/70 via-card/72 to-gold/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Selection notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <p>
                Discounted pricing is for eligible new members only. If membership ends and you
                later rejoin, standard pricing applies.
              </p>
              <p>
                Not sure where to start? Foundation gives you a strong entry into the ecosystem,
                and you can move deeper when the fit becomes clearer.
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {joinDecisionSteps.map((item) => (
            <article key={item.step} className="public-panel interactive-card min-w-0 p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.step}</p>
              <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>

      {!isAuthenticated ? (
        <div id="create-account" className="scroll-mt-24 xl:sticky xl:top-6">
          <RegisterForm
            from={from}
            defaultTier={selectedTier}
            selectedTier={selectedTier}
            onTierChange={handleTierChange}
            inviteCode={inviteCode}
            tierOptions={tierOptions}
          />
        </div>
      ) : null}
    </div>
  );
}
