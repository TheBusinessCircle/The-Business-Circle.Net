import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/public/tier-badge";
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
  monthlyPrice: number;
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
    standardPrice: number;
    claimed: number;
    limit: number;
    remaining: number;
    available: boolean;
    launchClosedLabel: string;
  };
  selected?: boolean;
  className?: string;
};

export function PricingCard({
  tier,
  name,
  positioningLabel,
  spotlight,
  monthlyPrice,
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

      <div className="mt-7 rounded-[1.6rem] border border-white/8 bg-background/28 p-5 sm:min-h-[208px]">
        {foundingOffer?.available ? (
          <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
                Founding rate*
              </p>
              <p className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-silver/90">
                {foundingOffer.offerLabel}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <span
                  className={cn(
                    "font-display text-[2.65rem] leading-none sm:text-[2.85rem]",
                    tierAccentTextClassName
                  )}
                >
                  &pound;{foundingOffer.foundingPrice}
                </span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground whitespace-nowrap">
                  FOUNDING
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                Usually{" "}
                <span className="whitespace-nowrap text-foreground">
                  &pound;{foundingOffer.standardPrice}/month
                </span>
              </p>
              <p className="text-sm leading-relaxed text-silver/85">
                Eligible new members only. Clear monthly billing through Stripe.
              </p>
            </div>
            <p className="mt-auto border-t border-white/8 pt-4 text-xs leading-relaxed text-muted">
              {foundingOffer.claimed} of {foundingOffer.limit} founding places claimed
              {foundingOffer.remaining > 0 ? ` | ${foundingOffer.remaining} remaining` : ""}
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">
              Standard membership
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <span
                  className={cn(
                    "font-display text-[2.65rem] leading-none sm:text-[2.85rem]",
                    tierAccentTextClassName
                  )}
                >
                  &pound;{monthlyPrice}
                </span>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground whitespace-nowrap">
                  /MONTH
                </span>
              </div>
              <p className="text-sm leading-relaxed text-silver/85">
                Full member access at the standard rate with clear monthly billing.
              </p>
            </div>
            {foundingOffer ? (
              <p className="mt-auto border-t border-white/8 pt-4 text-xs leading-relaxed text-muted">
                {foundingOffer.launchClosedLabel}. Regular pricing now applies.
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
          <Link href={ctaHref} className="block">
            <Button className="w-full" variant={tierButtonVariant} size="lg">
              {ctaLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

