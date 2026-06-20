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
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CIRCLE_CARD_FEATURE_STATUS_LABELS,
  CIRCLE_CARD_PLAN_DEFINITIONS,
  CIRCLE_CARD_PRO_FEATURE_PREVIEWS,
  CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS,
  type CircleCardPlanFeature,
  type CircleCardPlanKey
} from "@/lib/circle-card/plans";
import { cn } from "@/lib/utils";

type CircleCardPlanPanelProps = {
  currentPlanKey: CircleCardPlanKey;
  cardCount: number;
  activeFeaturedLinkCount: number;
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
  iconClassName = "border-gold/20 bg-gold/10 text-gold"
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Crown;
  features: CircleCardPlanFeature[];
  href: string;
  actionLabel: string;
  iconClassName?: string;
}) {
  return (
    <article className="rounded-2xl border border-silver/14 bg-background/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <details className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">{eyebrow}</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
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

export function CircleCardPlanPanel({
  currentPlanKey,
  cardCount,
  activeFeaturedLinkCount,
  className
}: CircleCardPlanPanelProps) {
  const currentPlan = CIRCLE_CARD_PLAN_DEFINITIONS[currentPlanKey];
  const proPlan = CIRCLE_CARD_PLAN_DEFINITIONS.PRO;
  const teamsPlan = CIRCLE_CARD_PLAN_DEFINITIONS.TEAMS;

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
              <h2 className="mt-3 font-display text-2xl text-foreground">Circle Card plan status</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Good for: {currentPlan.goodFor}. Next unlock: {currentPlan.upgradeMessaging.nextUnlock}.
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

            {currentPlan.notFor?.length ? (
              <div className="rounded-2xl border border-silver/14 bg-background/18 p-4">
                <p className="text-sm font-medium text-foreground">Free is not designed for</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentPlan.notFor.map((item) => (
                    <Badge key={item} variant="outline" className="border-silver/18 text-silver">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <div className="grid gap-3 xl:grid-cols-2">
          <PlanPreviewPanel
            eyebrow="Upgrade preview"
            title={proPlan.shortLabel}
            description="Individual visibility, analytics, lead capture and relationship growth."
            icon={Crown}
            features={CIRCLE_CARD_PRO_FEATURE_PREVIEWS}
            href="/circle-card/pro"
            actionLabel="Explore Pro"
          />
          <PlanPreviewPanel
            eyebrow="Teams preview"
            title={teamsPlan.shortLabel}
            description="Company cards, staff, shared contacts, team analytics and owner control."
            icon={UsersRound}
            features={CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS}
            href="/circle-card/teams"
            actionLabel="Explore Teams"
            iconClassName="border-silver/18 bg-silver/10 text-silver"
          />
        </div>
      </div>
    </section>
  );
}
