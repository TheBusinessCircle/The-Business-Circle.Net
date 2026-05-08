import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  MessageCircle
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FIRST_SEVEN_DAYS_ITEMS = [
  "Set up your member profile",
  "Choose your room and visibility level",
  "Explore the member directory",
  "Vote on The Circle Blueprint",
  "Read your first resource",
  "Start one meaningful conversation",
  "Decide whether Foundation, Inner Circle, or Core fits your next move"
] as const;

const TIER_OUTCOMES = [
  {
    tier: "Foundation",
    outcome: "Best for entering the environment and building from a clearer base.",
    icon: Compass,
    featured: false
  },
  {
    tier: "Inner Circle",
    outcome: "Best for stronger conversations, visibility, and momentum.",
    icon: MessageCircle,
    featured: false
  },
  {
    tier: "Core",
    outcome: "Best for highest-signal access, stronger profile presence, and deeper opportunities.",
    icon: BadgeCheck,
    featured: true
  }
] as const;

type FramedBlock = "section" | "panel";

type FirstSevenDaysBlockProps = {
  frame?: FramedBlock;
  variant?: "public" | "audit" | "member";
  className?: string;
};

export function FirstSevenDaysBlock({
  frame = "section",
  variant = "public",
  className
}: FirstSevenDaysBlockProps) {
  const isPanel = frame === "panel";

  return (
    <section
      className={cn(
        isPanel
          ? "min-w-0 rounded-[1.85rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6"
          : "public-section",
        variant === "audit" ? "border-gold/24 bg-background/24" : "",
        className
      )}
      data-testid="first-seven-days-block"
    >
      <div className="min-w-0 space-y-5">
        <div className="max-w-3xl space-y-2">
          <p className="premium-kicker">First 7 days</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Your first 7 days inside The Business Circle
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            A simple first path so new members know exactly how to enter, orient, and make the
            first useful move.
          </p>
        </div>

        <ol className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {FIRST_SEVEN_DAYS_ITEMS.map((item, index) => (
            <li
              key={item}
              className="min-w-0 rounded-[1.25rem] border border-white/10 bg-background/24 p-4 shadow-panel-soft"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/24 bg-gold/10 text-xs font-semibold text-gold">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{item}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function TierOutcomeComparison() {
  return (
    <section className="public-section" data-testid="tier-outcome-comparison">
      <div className="space-y-2">
        <p className="premium-kicker">Room outcomes</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          Choose by outcome, not just features.
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Each tier gives you a different level of room, signal, and opportunity around the work.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {TIER_OUTCOMES.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.tier}
              className={cn(
                "min-w-0 rounded-[1.75rem] border bg-card/66 p-5 shadow-panel-soft sm:p-6",
                item.featured
                  ? "border-gold/38 bg-gradient-to-br from-gold/14 via-card/82 to-card/70 shadow-gold-soft"
                  : "border-border/80"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    {item.featured ? "Highest signal" : "Outcome"}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-foreground">{item.tier}</h3>
                </div>
                <span
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                    item.featured
                      ? "border-gold/30 bg-gold/10 text-gold"
                      : "border-white/10 bg-background/24 text-silver"
                  )}
                >
                  <Icon size={18} />
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">{item.outcome}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AuditFitCta() {
  return (
    <section className="public-section-tight" data-testid="audit-fit-cta">
      <div className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="premium-kicker">Room fit</p>
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">
              Still unsure where you fit?
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              Run the Founder Audit and get a guided room recommendation.
            </p>
          </div>
          <Link href="/audit" className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}>
            Start the Founder Audit
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function InsightsRoomCta() {
  return (
    <section
      className="rounded-[2rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/70 p-6 shadow-gold-soft sm:p-8"
      data-testid="insights-room-cta"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="premium-kicker">Next step</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            You do not need more noise.
            <span className="block">You need the right room.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/audit" className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}>
            Start the Founder Audit
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/membership"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            Explore Membership
          </Link>
        </div>
      </div>
    </section>
  );
}

type GrowthArchitectSupportCtaProps = {
  href: string;
  variant?: "public" | "member";
};

export function GrowthArchitectSupportCta({
  href,
  variant = "public"
}: GrowthArchitectSupportCtaProps) {
  const isMember = variant === "member";

  return (
    <section
      className={cn(
        isMember ? "premium-surface p-5 sm:p-6 lg:p-7" : "public-section-tight"
      )}
      data-testid="growth-architect-support-cta"
    >
      <div
        className={cn(
          "rounded-[1.8rem] border border-silver/18 bg-card/66 p-5 shadow-panel-soft sm:p-6",
          isMember ? "bg-background/24" : ""
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="premium-kicker">Direct support</p>
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">
              For owners who need direct support:
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              Growth Architect support is a separate founder-led service for clarity, positioning,
              conversion, or growth direction.
            </p>
          </div>
          <Link href={href} className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}>
            Request Growth Architect support
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
