"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MembershipPlanAction } from "@/components/billing";
import { FoundingOfferCounters } from "@/components/public/founding-offer-counters";
import { PricingCard } from "@/components/public/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

type JoinExperienceProps = {
  foundingOffer: FoundingOfferSnapshot;
  initialSelectedTier: MembershipTier;
  from?: string;
  inviteCode?: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  tierOptions: TierOption[];
  pricingCards: PricingCardConfig[];
};

const RegisterForm = dynamic(
  () => import("@/components/auth/register-form").then((mod) => mod.RegisterForm),
  {
    ssr: false,
    loading: () => (
      <div className="overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-card/95 via-card/84 to-background/76 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.32)] backdrop-blur-xl">
        <p className="premium-kicker">Your entry point</p>
        <h3 className="mt-4 font-display text-2xl text-foreground">
          Preparing secure membership setup
        </h3>
        <p className="mt-3 text-sm text-muted">
          The account form is loading now and will appear here in a moment.
        </p>
      </div>
    )
  }
);

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
  pricingCards
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
        "grid items-start gap-10 xl:gap-12",
        isAuthenticated
          ? "grid-cols-1"
          : "xl:grid-cols-[minmax(0,1.28fr)_minmax(340px,390px)] 2xl:grid-cols-[minmax(0,1.34fr)_minmax(350px,400px)]"
      )}
    >
      <div className="min-w-0 space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Choose your room</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="font-display text-3xl text-foreground sm:text-[2.15rem]">
                Choose the room that fits now
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted">
                Foundation is the cleanest place to start. You can move deeper later if the
                business needs it.
              </p>
            </div>

            <Card className="border-gold/25 bg-gradient-to-br from-gold/10 via-card/82 to-background/65 shadow-gold-soft lg:max-w-sm">
              <CardContent className="space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Selected room</p>
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

          <div
            className={cn(
              "grid items-stretch gap-6 md:grid-cols-2 xl:gap-7",
              isAuthenticated ? "2xl:grid-cols-3" : ""
            )}
          >
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
                      {selected ? "Selected for your entry flow" : "Click anywhere to select"}
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

        <Card className="border-gold/20 bg-gradient-to-r from-background/74 via-card/74 to-gold/10 shadow-gold-soft">
          <CardContent className="flex flex-col gap-3 p-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Not sure where to start? <span className="text-foreground">Foundation</span> is the
              clearest entry point, and you can move deeper later if the business needs it.
            </p>
            <p className="text-silver">
              Your tier selection, invite flow, and secure checkout stay connected in the same join
              path.
            </p>
          </CardContent>
        </Card>
      </div>

      {!isAuthenticated ? (
        <div id="create-account" className="scroll-mt-28 xl:sticky xl:top-8">
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
