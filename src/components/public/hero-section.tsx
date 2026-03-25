import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        "relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/50 p-8 shadow-panel sm:p-12",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-15" />
      <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-gold/20 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-silver/10 blur-[110px]" />

      <div className={cn("relative grid items-start gap-10", aside ? "lg:grid-cols-[1.05fr_0.95fr]" : "grid-cols-1")}>
        <div className="space-y-7">
          {eyebrow ? (
            <p className="premium-kicker">
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-5">
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={primaryAction.href}>
              <Button size="lg" variant={primaryAction.variant ?? "default"} className="group">
                {primaryAction.label}
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {secondaryAction ? (
              <Link href={secondaryAction.href}>
                <Button size="lg" variant={secondaryAction.variant ?? "outline"}>
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : null}
          </div>

          {callouts?.length ? (
            <div className="flex flex-wrap gap-2">
              {callouts.map((callout) => (
                <span
                  key={callout}
                  className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver"
                >
                  {callout}
                </span>
              ))}
            </div>
          ) : null}

          {supportLine ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted">{supportLine}</p>
          ) : null}

          {metrics?.length ? (
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-border/80 bg-background/35 px-4 py-3 transition-colors hover:border-gold/30"
                >
                  <p className="font-display text-2xl text-silver">{metric.value}</p>
                  <p className="mt-1 text-xs tracking-wide text-muted uppercase">{metric.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}
