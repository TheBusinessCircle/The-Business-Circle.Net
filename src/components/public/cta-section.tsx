import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CTAAction = {
  href: string;
  label: string;
  variant?: "default" | "outline";
};

type CTASectionProps = {
  title: string;
  description: string;
  primaryAction: CTAAction;
  secondaryAction?: CTAAction;
  className?: string;
};

export function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  className
}: CTASectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-gold/35 bg-gradient-to-br from-gold/14 via-card/65 to-card/75 p-8 shadow-gold-soft sm:p-10 lg:p-12",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-gold/25 blur-[110px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-silver/10 blur-[100px]" />

      <div className="relative mx-auto max-w-4xl space-y-6 text-center">
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
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
      </div>
    </section>
  );
}
