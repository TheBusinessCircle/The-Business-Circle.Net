import type { ReactNode } from "react";
import type { MembershipTier } from "@prisma/client";
import type { MembershipBillingInterval } from "@/config/membership";
import { formatMembershipPrice } from "@/config/membership";
import { TierBadge } from "@/components/public/tier-badge";
import {
  getTierAccentTextClassName,
  getTierCardClassName
} from "@/lib/tier-styles";
import { cn } from "@/lib/utils";
import type { FoundingOfferTierSnapshot } from "@/types";

type MembershipTierSectionProps = {
  tier: MembershipTier;
  title: string;
  description: string;
  narrative?: string;
  emphasisLabel?: string;
  accessNote?: string;
  billingInterval: MembershipBillingInterval;
  monthlyPrice: number;
  annualPrice: number;
  foundingOffer: FoundingOfferTierSnapshot;
  action: ReactNode;
  featured?: boolean;
};

function PriceRow({
  label,
  value,
  intervalSuffix,
  highlighted = false,
  trailing
}: {
  label: string;
  value: number;
  intervalSuffix: string;
  highlighted?: boolean;
  trailing?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm",
        highlighted
          ? "border-white/12 bg-background/42 text-foreground"
          : "border-white/8 bg-background/20 text-muted"
      )}
    >
      <span>{label}</span>
      <span className={cn("font-medium", highlighted ? "text-foreground" : "text-silver")}>
        {formatMembershipPrice(value)}
        {intervalSuffix}
        {trailing ? ` ${trailing}` : ""}
      </span>
    </div>
  );
}

export function MembershipTierSection({
  tier,
  title,
  description,
  narrative,
  emphasisLabel,
  accessNote,
  billingInterval,
  monthlyPrice,
  annualPrice,
  foundingOffer,
  action,
  featured = false
}: MembershipTierSectionProps) {
  const tierCardClassName = getTierCardClassName(tier);
  const tierAccentTextClassName = getTierAccentTextClassName(tier);
  const isAnnual = billingInterval === "annual";
  const primaryStandardPrice = isAnnual ? annualPrice : monthlyPrice;
  const primaryFoundingPrice = isAnnual
    ? foundingOffer.foundingAnnualPrice
    : foundingOffer.foundingPrice;
  const primaryIntervalLabel = isAnnual ? "/year" : "/month";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border bg-card/62 px-6 py-7 shadow-panel sm:px-8 sm:py-9",
        tierCardClassName,
        featured ? "ring-1 ring-silver/26 shadow-silver-soft" : ""
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.04]" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:gap-10">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <TierBadge tier={tier} />
            {emphasisLabel ? (
              <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                {emphasisLabel}
              </span>
            ) : null}
            {accessNote ? (
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                {accessNote}
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-[2.15rem] leading-tight text-foreground sm:text-[2.45rem]">
              {title}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted">{description}</p>
            {narrative ? <p className="max-w-2xl text-sm leading-relaxed text-silver">{narrative}</p> : null}
          </div>

          {foundingOffer.available ? (
            <div className="rounded-[1.6rem] border border-gold/24 bg-gold/8 p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                Founding Member Rate - limited to 50
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <span className={cn("font-display text-5xl leading-none", tierAccentTextClassName)}>
                  {formatMembershipPrice(primaryFoundingPrice)}
                </span>
                <span className="pb-1 text-sm text-silver">{primaryIntervalLabel}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Standard {isAnnual ? "annual" : "monthly"} pricing is{" "}
                <span className="text-foreground">
                  {formatMembershipPrice(primaryStandardPrice)}
                  {primaryIntervalLabel}
                </span>
                .
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <PriceRow
                  label="Monthly"
                  value={foundingOffer.foundingPrice}
                  intervalSuffix="/month"
                  highlighted={!isAnnual}
                />
                <PriceRow
                  label="Annual"
                  value={foundingOffer.foundingAnnualPrice}
                  intervalSuffix="/year"
                  highlighted={isAnnual}
                  trailing="Save 20%"
                />
              </div>
              <div className="mt-5 space-y-2 border-t border-white/8 pt-4 text-sm text-muted">
                <p>{foundingOffer.remaining} of {foundingOffer.limit} Founding Member spots remaining</p>
                <p>Once these are gone, standard pricing applies.</p>
                <p>Founding rates are locked for active members.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-white/10 bg-background/22 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <span className={cn("font-display text-5xl leading-none", tierAccentTextClassName)}>
                  {formatMembershipPrice(primaryStandardPrice)}
                </span>
                <span className="pb-1 text-sm text-silver">{primaryIntervalLabel}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <PriceRow
                  label="Monthly"
                  value={monthlyPrice}
                  intervalSuffix="/month"
                  highlighted={!isAnnual}
                />
                <PriceRow
                  label="Annual"
                  value={annualPrice}
                  intervalSuffix="/year"
                  highlighted={isAnnual}
                  trailing="Save 20%"
                />
              </div>
              <p className="mt-5 border-t border-white/8 pt-4 text-sm text-muted">
                Founding Member spots have now been filled.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-[1.8rem] border border-white/10 bg-background/18 p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">How This Feels</p>
            <p className="text-sm leading-relaxed text-muted">
              The point is not to choose the loudest tier. It is to enter the room that fits the
              stage, responsibility, and pace of the business right now.
            </p>
            <div className="space-y-3">
              <PriceRow
                label="Monthly"
                value={monthlyPrice}
                intervalSuffix="/month"
                highlighted={!isAnnual}
              />
              <PriceRow
                label="Annual"
                value={annualPrice}
                intervalSuffix="/year"
                highlighted={isAnnual}
                trailing="Save 20%"
              />
            </div>
          </div>

          <div className="space-y-3">
            {action}
            <p className="text-xs leading-relaxed text-muted">
              Built for business owners, not browsers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
