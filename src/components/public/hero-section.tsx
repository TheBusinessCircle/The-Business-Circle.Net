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
        "surface-card-strong public-hero-spacing relative overflow-hidden rounded-[2.1rem] shadow-[0_28px_80px_rgba(2,6,23,0.28)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-15" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(0,0,0,0.58)_100%),linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.72)_44%,rgba(0,0,0,0.85)_100%)]" />

      <div
        className={cn(
          "relative grid min-w-0 items-start gap-7 sm:gap-8 lg:gap-10",
          aside ? "lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch" : "grid-cols-1"
        )}
      >
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {eyebrow ? (
            <p className="premium-kicker max-w-fit">
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-4 sm:space-y-5">
            <h1 className="max-w-5xl font-display text-[clamp(2.65rem,8vw,5rem)] leading-[0.95] tracking-tight text-foreground">
              {title}
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
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
                  className="surface-pill"
                >
                  {callout}
                </span>
              ))}
            </div>
          ) : null}

          {supportLine ? (
            <p className="max-w-3xl text-base leading-relaxed text-white/70">{supportLine}</p>
          ) : null}

          {metrics?.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="surface-subtle min-w-0 rounded-[1.35rem] px-5 py-4 hover:border-gold/30 lg:px-6"
                >
                  <p className="font-display text-2xl text-foreground">{metric.value}</p>
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
