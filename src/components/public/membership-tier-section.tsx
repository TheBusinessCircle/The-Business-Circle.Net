import type { ReactNode } from "react";
import type { MembershipTier } from "@prisma/client";
import type { MembershipBillingInterval } from "@/config/membership";
import { formatMembershipPrice } from "@/config/membership";
import { TierBadge } from "@/components/public/tier-badge";
import {
  getTierAccentTextClassName,
  getTierCardClassName,
  getTierSelectionRingClassName
} from "@/lib/tier-styles";
import { getFounderRoomPricingNote } from "@/lib/founding-offer-copy";
import { cn } from "@/lib/utils";
import type { FoundingOfferTierSnapshot } from "@/types";

type MembershipTierSectionProps = {
  tier: MembershipTier;
  title: string;
  supportingBadge: string;
  description: string;
  narrative?: string;
  emphasisLabel?: string;
  accessNote?: string;
  trustLine: string;
  billingInterval: MembershipBillingInterval;
  monthlyPrice: number;
  annualPrice: number;
  foundingOffer: FoundingOfferTierSnapshot;
  action: ReactNode;
  featured?: boolean;
  selected?: boolean;
};

function BillingOption({
  label,
  price,
  intervalLabel,
  selected = false,
  note
}: {
  label: string;
  price: number;
  intervalLabel: string;
  selected?: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        selected
          ? "border-white/16 bg-background/38 text-foreground"
          : "border-white/8 bg-background/20 text-muted"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.08em]">{label}</span>
        {note ? <span className="text-[11px] text-silver">{note}</span> : null}
      </div>
      <p className="mt-2 text-lg font-medium">
        {formatMembershipPrice(price)}
        <span className="ml-1 text-sm text-silver">{intervalLabel}</span>
      </p>
    </div>
  );
}

export function MembershipTierSection({
  tier,
  title,
  supportingBadge,
  description,
  narrative,
  emphasisLabel,
  accessNote,
  trustLine,
  billingInterval,
  monthlyPrice,
  annualPrice,
  foundingOffer,
  action,
  featured = false,
  selected = false
}: MembershipTierSectionProps) {
  const tierCardClassName = getTierCardClassName(tier);
  const tierSelectionRingClassName = getTierSelectionRingClassName(tier);
  const tierAccentTextClassName = getTierAccentTextClassName(tier);
  const isAnnual = billingInterval === "annual";
  const selectedFoundingPrice = isAnnual
    ? foundingOffer.foundingAnnualPrice
    : foundingOffer.foundingPrice;
  const selectedStandardPrice = isAnnual ? annualPrice : monthlyPrice;
  const selectedIntervalLabel = isAnnual ? "/year" : "/month";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border bg-card/62 p-6 shadow-panel lg:p-8",
        tierCardClassName,
        featured ? "shadow-silver-soft" : "",
        selected || featured ? tierSelectionRingClassName : ""
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.04]" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start lg:gap-12">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <TierBadge tier={tier} />
            <span className="rounded-full border border-white/10 bg-background/24 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
              {supportingBadge}
            </span>
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
            {selected ? (
              <span className="rounded-full border border-white/12 bg-background/30 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-foreground">
                Selected
              </span>
            ) : null}
          </div>

          <div className="space-y-5">
            <h2 className="font-display text-[2.35rem] leading-tight tracking-tight text-foreground sm:text-[2.75rem]">
              {title}
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-white/80">{description}</p>
            {narrative ? (
              <p className="max-w-2xl text-base leading-relaxed text-silver">{narrative}</p>
            ) : null}
          </div>

          <p className="max-w-xl text-base leading-relaxed text-white/70">{trustLine}</p>
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-background/18 p-5 shadow-panel-soft sm:p-6">
          {foundingOffer.available ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                  Founding Member Rate
                </p>
                <p className="text-sm leading-relaxed text-muted">
                  Founder pricing is currently active in this tier for a limited founder allocation.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className={cn("font-display text-5xl leading-none", tierAccentTextClassName)}>
                    {formatMembershipPrice(selectedFoundingPrice)}
                  </span>
                  <span className="pb-1 text-sm text-silver">{selectedIntervalLabel}</span>
                </div>
                <p className="text-sm text-muted">
                  Usually{" "}
                  <span className="text-foreground">
                    {formatMembershipPrice(selectedStandardPrice)}
                    {selectedIntervalLabel}
                  </span>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <BillingOption
                  label="Monthly"
                  price={foundingOffer.foundingPrice}
                  intervalLabel="/month"
                  selected={!isAnnual}
                />
                <BillingOption
                  label="Annual"
                  price={foundingOffer.foundingAnnualPrice}
                  intervalLabel="/year"
                  selected={isAnnual}
                  note="Save 20%"
                />
              </div>

              <div className="space-y-1.5 border-t border-white/8 pt-4 text-sm text-muted">
                <p>Once the founder allocation is filled, standard pricing applies.</p>
                <p>Founding rates stay locked while membership remains active.</p>
                <p>If membership is cancelled and later restarted, standard pricing applies.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Membership</p>
                <p className="text-sm leading-relaxed text-muted">
                  {getFounderRoomPricingNote(foundingOffer)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className={cn("font-display text-5xl leading-none", tierAccentTextClassName)}>
                    {formatMembershipPrice(selectedStandardPrice)}
                  </span>
                  <span className="pb-1 text-sm text-silver">{selectedIntervalLabel}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <BillingOption
                  label="Monthly"
                  price={monthlyPrice}
                  intervalLabel="/month"
                  selected={!isAnnual}
                />
                <BillingOption
                  label="Annual"
                  price={annualPrice}
                  intervalLabel="/year"
                  selected={isAnnual}
                  note="Save 20%"
                />
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {action}
            <p className="text-xs leading-relaxed text-muted">{trustLine}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
