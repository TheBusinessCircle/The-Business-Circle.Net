import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroAction = {
  href: string;
  label: string;
  variant?: "default" | "outline";
};

type HeroMetric = {
  label: string;
  value: string;
};

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  supportLine?: string;
  callouts?: string[];
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
  metrics?: HeroMetric[];
  className?: string;
  aside?: ReactNode;
};

export function HeroSection({
  eyebrow,
  title,
  description,
  supportLine,
  callouts,
  primaryAction,
  secondaryAction,
  metrics,
  className,
  aside
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2.2rem] border border-border/70 bg-card/56 p-6 shadow-panel backdrop-blur sm:p-9 lg:p-14",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-15" />
      <div className="pointer-events-none absolute -right-16 -top-14 h-56 w-56 rounded-full bg-gold/20 blur-[90px] sm:-right-24 sm:-top-20 sm:h-72 sm:w-72 sm:blur-[100px]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-silver/10 blur-[90px] sm:-left-24 sm:h-72 sm:w-72 sm:blur-[110px]" />

      <div
        className={cn(
          "relative grid min-w-0 items-start gap-8 sm:gap-10 lg:gap-12",
          aside ? "lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch" : "grid-cols-1"
        )}
      >
        <div className="min-w-0 space-y-6 sm:space-y-8">
          {eyebrow ? (
            <p className="premium-kicker max-w-fit">
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-5">
            <h1 className="max-w-4xl font-display text-[clamp(2rem,8.5vw,4.5rem)] leading-[0.98] text-foreground lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-3xl text-[0.98rem] leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryAction.href}
              className={cn(
                buttonVariants({
                  size: "lg",
                  variant: primaryAction.variant ?? "default"
                }),
                "group w-full sm:w-auto"
              )}
            >
              {primaryAction.label}
              <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>

            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: secondaryAction.variant ?? "outline"
                  }),
                  "w-full sm:w-auto"
                )}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>

          {callouts?.length ? (
            <div className="flex flex-wrap gap-2.5">
              {callouts.map((callout) => (
                <span
                  key={callout}
                  className="rounded-full border border-border/80 bg-background/40 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.08em] text-silver"
                >
                  {callout}
                </span>
              ))}
            </div>
          ) : null}

          {supportLine ? (
            <p className="max-w-3xl text-sm leading-relaxed text-silver">{supportLine}</p>
          ) : null}

          {metrics?.length ? (
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-[1.35rem] border border-border/80 bg-background/35 px-4 py-3.5 transition-colors hover:border-gold/30"
                >
                  <p className="font-display text-2xl text-silver">{metric.value}</p>
                  <p className="mt-1 text-xs tracking-wide text-muted uppercase">{metric.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? <div className="relative min-h-0 min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}
