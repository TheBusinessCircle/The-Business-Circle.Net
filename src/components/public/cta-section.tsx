import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
        "relative overflow-hidden rounded-[2.2rem] border border-gold/35 bg-gradient-to-br from-gold/14 via-card/70 to-card/78 p-6 shadow-gold-soft sm:p-10 lg:p-12",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-14 h-60 w-60 rounded-full bg-gold/25 blur-[90px] sm:-right-24 sm:-top-20 sm:h-80 sm:w-80 sm:blur-[110px]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-silver/10 blur-[90px] sm:-left-24 sm:h-72 sm:w-72 sm:blur-[100px]" />

      <div className="relative mx-auto max-w-4xl space-y-6 text-center">
        <p className="premium-kicker mx-auto">Next step</p>
        <h2 className="font-display text-2xl leading-tight text-foreground sm:text-4xl">{title}</h2>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted">{description}</p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
      </div>
    </section>
  );
}
