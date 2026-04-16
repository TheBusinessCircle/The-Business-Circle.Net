import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { MembershipBillingInterval } from "@/config/membership";
import { formatMembershipPrice } from "@/config/membership";
import { buttonVariants } from "@/components/ui/button";
import { TierBadge } from "@/components/public/tier-badge";
import { getFounderRoomPricingNote } from "@/lib/founding-offer-copy";
import {
  getTierAccentTextClassName,
  getTierButtonVariant,
  getTierCardClassName,
  getTierFeaturedPillClassName,
  getTierIconClassName,
  getTierSelectionRingClassName
} from "@/lib/tier-styles";
import { cn } from "@/lib/utils";

type PricingCardProps = {
  tier: "FOUNDATION" | "INNER_CIRCLE" | "CORE";
  name: string;
  positioningLabel?: string;
  spotlight?: {
    label: string;
    text: string;
  };
  billingInterval?: MembershipBillingInterval;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  ctaHref?: string;
  ctaLabel?: string;
  cta?: ReactNode;
  featured?: boolean;
  featuredLabel?: string;
  foundingOffer?: {
    badgeLabel: string;
    offerLabel: string;
    foundingPrice: number;
    foundingAnnualPrice: number;
    standardPrice: number;
    standardAnnualPrice: number;
    claimed: number;
    limit: number;
    remaining: number;
    available: boolean;
    statusLabel?: string;
    launchClosedLabel: string;
  };
  selected?: boolean;
  className?: string;
};

function PriceLine({
  label,
  amount,
  suffix,
  highlighted = false,
  trailing
}: {
  label: string;
  amount: number;
  suffix: string;
  highlighted?: boolean;
  trailing?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-sm",
        highlighted
          ? "border-white/12 bg-background/38 text-foreground"
          : "border-white/8 bg-background/20 text-muted"
      )}
    >
      <span>{label}</span>
      <span className={cn("font-medium", highlighted ? "text-foreground" : "text-silver")}>
        {formatMembershipPrice(amount)}
        {suffix}
        {trailing ? ` ${trailing}` : ""}
      </span>
    </div>
  );
}

export function PricingCard({
  tier,
  name,
  positioningLabel,
  spotlight,
  billingInterval = "monthly",
  monthlyPrice,
  annualPrice,
  description,
  features,
  ctaHref,
  ctaLabel = "Get Started",
  cta,
  featured = false,
  featuredLabel = "Natural next step",
  foundingOffer,
  selected = false,
  className
}: PricingCardProps) {
  const tierCardClassName = getTierCardClassName(tier);
  const tierSelectionClassName = getTierSelectionRingClassName(tier);
  const tierFeaturedPillClassName = getTierFeaturedPillClassName(tier);
  const tierAccentTextClassName = getTierAccentTextClassName(tier);
  const tierIconClassName = getTierIconClassName(tier);
  const tierButtonVariant = getTierButtonVariant(tier);
  const isAnnual = billingInterval === "annual";
  const primaryStandardPrice = isAnnual ? annualPrice : monthlyPrice;
  const primaryFoundingPrice = isAnnual
    ? foundingOffer?.foundingAnnualPrice ?? annualPrice
    : foundingOffer?.foundingPrice ?? monthlyPrice;

  return (
    <article
      className={cn(
        "interactive-card relative flex h-full flex-col rounded-3xl border bg-card/75 p-6 shadow-panel sm:p-7",
        tierCardClassName,
        featured ? tierSelectionClassName : "",
        selected ? tierSelectionClassName : "",
        className
      )}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={tier} />
          {featured ? (
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] uppercase",
                tierFeaturedPillClassName
              )}
            >
              {featuredLabel}
            </span>
          ) : null}
          {positioningLabel ? (
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
              {positioningLabel}
            </p>
          ) : null}
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-[1.9rem] leading-tight text-foreground sm:text-[2rem]">
            {name}
          </h3>
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      <div className="mt-7 rounded-[1.6rem] border border-white/8 bg-background/28 p-5">
        {foundingOffer?.available ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                Founding access
              </p>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Founder pricing is currently active in this tier for a limited founder allocation.
            </p>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <span
                  className={cn(
                    "font-display text-[2.6rem] leading-none sm:text-[2.8rem]",
                    tierAccentTextClassName
                  )}
                >
                  {formatMembershipPrice(primaryFoundingPrice)}
                </span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground whitespace-nowrap">
                  {isAnnual ? "/YEAR" : "/MONTH"}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                Usually{" "}
                <span className="text-foreground">
                  {formatMembershipPrice(primaryStandardPrice)}
                  {isAnnual ? "/year" : "/month"}
                </span>
                .
              </p>
            </div>

            <div className="grid gap-3">
              <PriceLine
                label="Monthly"
                amount={foundingOffer.foundingPrice}
                suffix="/month"
                highlighted={!isAnnual}
              />
              <PriceLine
                label="Annual"
                amount={foundingOffer.foundingAnnualPrice}
                suffix="/year"
                highlighted={isAnnual}
                trailing="Save 20%"
              />
            </div>

            <div className="border-t border-white/8 pt-4 text-xs leading-relaxed text-muted">
              <p>When the founder allocation is filled, pricing moves to the standard rate.</p>
              <p>Founding rates stay locked while membership remains active.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
              Standard membership
            </p>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <span
                className={cn(
                  "font-display text-[2.6rem] leading-none sm:text-[2.8rem]",
                  tierAccentTextClassName
                )}
              >
                {formatMembershipPrice(primaryStandardPrice)}
              </span>
              <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground whitespace-nowrap">
                {isAnnual ? "/YEAR" : "/MONTH"}
              </span>
            </div>
            <div className="grid gap-3">
              <PriceLine
                label="Monthly"
                amount={monthlyPrice}
                suffix="/month"
                highlighted={!isAnnual}
              />
              <PriceLine
                label="Annual"
                amount={annualPrice}
                suffix="/year"
                highlighted={isAnnual}
                trailing="Save 20%"
              />
            </div>
            {foundingOffer ? (
              <p className="border-t border-white/8 pt-4 text-xs leading-relaxed text-muted">
                {getFounderRoomPricingNote(foundingOffer)}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {spotlight ? (
        <div className="mt-4 rounded-2xl border border-silver/16 bg-silver/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{spotlight.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{spotlight.text}</p>
        </div>
      ) : null}

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
            <CheckCircle2 size={16} className={cn("mt-0.5 shrink-0", tierIconClassName)} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-border/70 pt-5">
        {cta ? (
          cta
        ) : ctaHref ? (
          <Link
            href={ctaHref}
            className={cn(
              buttonVariants({ variant: tierButtonVariant, size: "lg" }),
              "w-full"
            )}
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
