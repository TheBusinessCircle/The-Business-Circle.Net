"use client";

import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CheckCircle2,
  Crown,
  Link as LinkIcon,
  UsersRound,
  WalletCards
} from "lucide-react";
import { CircleCardRuntimeLink as Link } from "@/components/circle-card/circle-card-runtime-link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT,
  readCircleCardPlatformOwnerCardTypePreviewMode,
  readCircleCardPlatformOwnerPreviewMode
} from "@/components/circle-card/circle-card-platform-owner-preview-switcher";
import {
  CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS,
  CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS,
  resolveCircleCardPlatformOwnerFeatureMatrix,
  type CircleCardPlatformOwnerCardTypePreviewMode,
  type CircleCardPlatformOwnerFeatureMatrixStatus,
  type CircleCardPlatformOwnerPreviewMode
} from "@/lib/circle-card/platform-owner-control";
import {
  CIRCLE_CARD_CAPABILITY_MAP,
  CIRCLE_CARD_CAPABILITY_STATUS_LABELS,
  CIRCLE_CARD_FEATURE_STATUS_LABELS,
  CIRCLE_CARD_PLAN_DEFINITIONS,
  CIRCLE_CARD_PRO_FEATURE_PREVIEWS,
  CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS,
  type CircleCardCapability,
  type CircleCardPlanFeature,
  type CircleCardPlanKey
} from "@/lib/circle-card/plans";
import {
  CIRCLE_CARD_PRICING_CONFIG,
  formatCircleCardAnnualDiscount,
  formatCircleCardAnnualPrice,
  formatCircleCardPrice
} from "@/lib/circle-card/pricing";
import { cn } from "@/lib/utils";

type CircleCardPlanPanelProps = {
  currentPlanKey: CircleCardPlanKey;
  cardCount: number;
  activeFeaturedLinkCount: number;
  platformOwnerPreviewEnabled?: boolean;
  platformOwnerPreviewMode?: CircleCardPlatformOwnerPreviewMode;
  platformOwnerCardTypePreviewMode?: CircleCardPlatformOwnerCardTypePreviewMode;
  className?: string;
};

function limitValueLabel(value: number | "more" | "team") {
  if (typeof value === "number") {
    return String(value);
  }

  return value === "more" ? "More" : "Team";
}

function featureStatusClassName(feature: CircleCardPlanFeature) {
  switch (feature.status) {
    case "early-access":
      return "border-emerald-500/28 bg-emerald-500/10 text-emerald-200";
    case "pro-later":
      return "border-gold/25 bg-gold/10 text-gold";
    case "coming-soon":
      return "border-silver/18 bg-silver/10 text-silver";
    case "included":
    default:
      return "border-gold/25 bg-gold/10 text-gold";
  }
}

function capabilityStatusClassName(capability: CircleCardCapability) {
  switch (capability.status) {
    case "available-early-access":
      return "border-gold/25 bg-gold/10 text-gold";
    case "planned":
      return "border-silver/18 bg-silver/10 text-silver";
    case "included":
    default:
      return "border-emerald-500/28 bg-emerald-500/10 text-emerald-200";
  }
}

function CapabilityList({
  title,
  items,
  empty,
  limit = 4
}: {
  title: string;
  items: CircleCardCapability[];
  empty: string;
  limit?: number;
}) {
  return (
    <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.slice(0, limit).map((item) => (
            <div key={item.id} className="rounded-xl border border-silver/12 bg-card/42 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <Badge variant="outline" className={cn("normal-case tracking-normal", capabilityStatusClassName(item))}>
                  {CIRCLE_CARD_CAPABILITY_STATUS_LABELS[item.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
            </div>
          ))
        ) : (
          <p className="text-xs leading-relaxed text-muted">{empty}</p>
        )}
      </div>
    </div>
  );
}

function FeaturePreviewList({
  features,
  limit = 4
}: {
  features: CircleCardPlanFeature[];
  limit?: number;
}) {
  return (
    <div className="grid gap-2">
      {features.slice(0, limit).map((feature) => (
        <div
          key={feature.id}
          className="rounded-2xl border border-silver/14 bg-background/22 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{feature.label}</p>
            <Badge variant="outline" className={cn("normal-case tracking-normal", featureStatusClassName(feature))}>
              {CIRCLE_CARD_FEATURE_STATUS_LABELS[feature.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}

function PlanPreviewPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  features,
  href,
  actionLabel,
  priceLabel,
  statusLabel,
  annualPriceLabel,
  annualDiscountLabel,
  iconClassName = "border-gold/20 bg-gold/10 text-gold"
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Crown;
  features: CircleCardPlanFeature[];
  href: string;
  actionLabel: string;
  priceLabel: string;
  statusLabel: string;
  annualPriceLabel?: string | null;
  annualDiscountLabel?: string | null;
  iconClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-silver/14 bg-background/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <details className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{eyebrow}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <Badge variant="outline" className="border-gold/25 text-gold">
                  {priceLabel}
                </Badge>
              </div>
              {annualPriceLabel ? (
                <p className="mt-1 text-xs text-silver">
                  {annualPriceLabel}
                  {annualDiscountLabel ? ` / ${annualDiscountLabel}` : ""}
                </p>
              ) : null}
              <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
              <p className="mt-1 text-xs text-silver">{statusLabel}</p>
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-silver/14 bg-background/30 text-silver">
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-4">
            <FeaturePreviewList features={features} />
          </div>
        </details>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:inline-flex", iconClassName)}>
            <Icon size={17} />
          </span>
          <Link href={href} className="w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="w-full gap-2">
              {actionLabel}
              <ArrowUpRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

function planKeyForPreviewMode(
  mode: CircleCardPlatformOwnerPreviewMode,
  fallback: CircleCardPlanKey
): CircleCardPlanKey {
  switch (mode) {
    case "free":
      return "FREE";
    case "pro":
    case "bcn-included-pro":
    case "platform-owner":
      return "PRO";
    case "teams":
      return "TEAMS";
    default:
      return fallback;
  }
}

function matrixStatusClassName(status: CircleCardPlatformOwnerFeatureMatrixStatus) {
  switch (status) {
    case "Available":
      return "border-emerald-500/28 bg-emerald-500/10 text-emerald-200";
    case "Requires Pro":
      return "border-gold/28 bg-gold/10 text-gold";
    case "Requires Teams":
      return "border-silver/22 bg-silver/10 text-silver";
    case "Platform Preview":
      return "border-cyan-400/28 bg-cyan-400/10 text-cyan-100";
    case "Coming Soon":
    default:
      return "border-border/80 bg-background/32 text-muted";
  }
}

export function CircleCardPlanPanel({
  currentPlanKey,
  cardCount,
  activeFeaturedLinkCount,
  platformOwnerPreviewEnabled = false,
  platformOwnerPreviewMode = "platform-owner",
  platformOwnerCardTypePreviewMode = "personal",
  className
}: CircleCardPlanPanelProps) {
  const [selectedPreviewMode, setSelectedPreviewMode] = useState(platformOwnerPreviewMode);
  const [selectedCardTypeMode, setSelectedCardTypeMode] = useState(
    platformOwnerCardTypePreviewMode
  );
  const displayedPlanKey = platformOwnerPreviewEnabled
    ? planKeyForPreviewMode(selectedPreviewMode, currentPlanKey)
    : currentPlanKey;
  const previewLabel = CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_LABELS[selectedPreviewMode];
  const cardTypePreviewLabel = CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_LABELS[selectedCardTypeMode];
  const cardTypeMatrixRows = resolveCircleCardPlatformOwnerFeatureMatrix({
    membershipMode: selectedPreviewMode,
    cardTypeMode: selectedCardTypeMode
  });
  const selectedCardTypeStatus =
    cardTypeMatrixRows.find((row) => row.id === `${selectedCardTypeMode}-card`)?.status ??
    "Available";
  const currentPlan = CIRCLE_CARD_PLAN_DEFINITIONS[displayedPlanKey];
  const proPlan = CIRCLE_CARD_PLAN_DEFINITIONS.PRO;
  const teamsPlan = CIRCLE_CARD_PLAN_DEFINITIONS.TEAMS;
  const currentCapabilityMap = CIRCLE_CARD_CAPABILITY_MAP[displayedPlanKey];
  const visibleNextCapabilities = platformOwnerPreviewEnabled
    ? currentCapabilityMap.next
    : currentCapabilityMap.next.filter((item) => !item.id.includes("teams"));
  const currentPricing = CIRCLE_CARD_PRICING_CONFIG[displayedPlanKey];
  const proPricing = CIRCLE_CARD_PRICING_CONFIG.PRO;
  const teamsPricing = CIRCLE_CARD_PRICING_CONFIG.TEAMS;
  const teamsAnnualPrice = formatCircleCardAnnualPrice("TEAMS");
  const teamsAnnualDiscount = formatCircleCardAnnualDiscount("TEAMS");

  useEffect(() => {
    if (!platformOwnerPreviewEnabled) {
      return undefined;
    }

    setSelectedPreviewMode(
      readCircleCardPlatformOwnerPreviewMode(platformOwnerPreviewMode)
    );
    setSelectedCardTypeMode(
      readCircleCardPlatformOwnerCardTypePreviewMode(platformOwnerCardTypePreviewMode)
    );

    function handlePreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerPreviewMode }>).detail
        ?.mode;

      if (mode) {
        setSelectedPreviewMode(mode);
      }
    }

    function handleCardTypePreviewChange(event: Event) {
      const mode = (event as CustomEvent<{ mode?: CircleCardPlatformOwnerCardTypePreviewMode }>)
        .detail?.mode;

      if (mode) {
        setSelectedCardTypeMode(mode);
      }
    }

    window.addEventListener(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, handlePreviewChange);
    window.addEventListener(
      CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
      handleCardTypePreviewChange
    );

    return () => {
      window.removeEventListener(CIRCLE_CARD_PLATFORM_OWNER_PREVIEW_EVENT, handlePreviewChange);
      window.removeEventListener(
        CIRCLE_CARD_PLATFORM_OWNER_CARD_TYPE_PREVIEW_EVENT,
        handleCardTypePreviewChange
      );
    };
  }, [platformOwnerCardTypePreviewMode, platformOwnerPreviewEnabled, platformOwnerPreviewMode]);

  const limitItems = [
    {
      label: "Circle Cards",
      value: `${cardCount}/${currentPlan.limits.circleCards}`,
      icon: CheckCircle2
    },
    {
      label: "Featured links",
      value: `${activeFeaturedLinkCount}/${limitValueLabel(currentPlan.limits.activeFeaturedLinks)} active`,
      icon: LinkIcon
    },
    {
      label: "Wallet",
      value: currentPlan.limits.wallet === "company" ? "Company" : "Basic",
      icon: WalletCards
    },
    {
      label: "Analytics",
      value:
        currentPlan.limits.analytics === "team"
          ? "Team"
          : currentPlan.limits.analytics === "advanced"
            ? "Advanced"
            : "Basic",
      icon: BarChart3
    }
  ];

  return (
    <section className={cn("rounded-2xl border border-gold/24 bg-card/70 p-4 shadow-panel-soft sm:p-5", className)}>
      <div className="grid gap-3">
        <details open className="group rounded-2xl border border-gold/18 bg-background/18 p-4">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <Badge variant="outline" className="border-gold/28 text-gold">
                Current Plan: {currentPlan.shortLabel}
              </Badge>
              {platformOwnerPreviewEnabled ? (
                <Badge variant="premium" className="ml-2">
                  Previewing: {previewLabel}
                </Badge>
              ) : null}
              <h2 className="mt-3 font-display text-2xl text-foreground">
                {currentCapabilityMap.relationshipPositioning}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {currentPricing.label}: {formatCircleCardPrice(displayedPlanKey)}. What it does:{" "}
                {currentCapabilityMap.summary}
              </p>
            </div>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </span>
          </summary>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="grid gap-2 sm:grid-cols-2">
              {limitItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-2xl border border-silver/14 bg-background/22 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={16} className="text-gold" />
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <CapabilityList
              title="What is included"
              items={currentCapabilityMap.included}
              empty="Included capabilities appear here as the plan matures."
            />
          </div>

          {platformOwnerPreviewEnabled ? (
            <div className="mt-4 rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-100">
                    Card Type Fit
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {previewLabel} + {cardTypePreviewLabel}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("w-fit normal-case tracking-normal", matrixStatusClassName(selectedCardTypeStatus))}
                >
                  {selectedCardTypeStatus}
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <CapabilityList
              title="What is unlocked"
              items={currentCapabilityMap.unlocked}
              empty="Your current plan is focused on its included relationship tools."
            />
            <CapabilityList
              title="What becomes available next"
              items={visibleNextCapabilities}
              empty="This plan already represents the current top-level Circle Card capability map."
            />
          </div>
        </details>

        <div className={cn("grid gap-3", platformOwnerPreviewEnabled && "xl:grid-cols-2")}>
          <PlanPreviewPanel
            eyebrow="Upgrade preview"
            title={proPlan.shortLabel}
            description="A second card, Circle Studio activation, Business Builder and expanded Creator presentation tools."
            icon={Crown}
            features={CIRCLE_CARD_PRO_FEATURE_PREVIEWS}
            href="/circle-card/pro"
            actionLabel="Explore Pro"
            priceLabel={formatCircleCardPrice("PRO")}
            statusLabel={proPricing.billingStatusLabel}
          />
          {platformOwnerPreviewEnabled ? <PlanPreviewPanel
            eyebrow="Teams preview"
            title={teamsPlan.shortLabel}
            description="Company cards, staff, shared contacts, team analytics and owner control."
            icon={UsersRound}
            features={CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS}
            href="/circle-card/teams"
            actionLabel="Explore Teams"
            priceLabel={formatCircleCardPrice("TEAMS")}
            annualPriceLabel={teamsAnnualPrice}
            annualDiscountLabel={teamsAnnualDiscount}
            statusLabel={teamsPricing.billingStatusLabel}
            iconClassName="border-silver/18 bg-silver/10 text-silver"
          /> : null}
        </div>
      </div>
    </section>
  );
}
