import { buttonVariants } from "@/components/ui/button";
import { TrackedPublicCtaLink } from "@/components/public/tracked-public-cta-link";
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
  analyticsSource?: "home" | "about" | "membership" | "audit" | "insights" | "contact" | "intent" | "unknown";
  className?: string;
};

export function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  analyticsSource = "unknown",
  className
}: CTASectionProps) {
  return (
    <section
      className={cn(
        "surface-accent public-hero-spacing relative overflow-hidden rounded-[2.1rem]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.42)_100%),linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.52)_100%)]" />

      <div className="relative mx-auto max-w-4xl space-y-5 text-center sm:space-y-6">
        <p className="premium-kicker mx-auto">Next step</p>
        <h2 className="font-display text-4xl leading-[1.02] tracking-tight text-foreground lg:text-5xl">
          {title}
        </h2>
        <p className="mx-auto max-w-3xl text-lg leading-relaxed text-white/80">{description}</p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <TrackedPublicCtaLink
            href={primaryAction.href}
            label={primaryAction.label}
            source={analyticsSource}
            showArrow
            className={cn(
              buttonVariants({
                size: "lg",
                variant: primaryAction.variant ?? "default"
              }),
              "group w-full sm:w-auto"
            )}
          />
          {secondaryAction ? (
            <TrackedPublicCtaLink
              href={secondaryAction.href}
              label={secondaryAction.label}
              source={analyticsSource}
              className={cn(
                buttonVariants({
                  size: "lg",
                  variant: secondaryAction.variant ?? "outline"
                }),
                "w-full sm:w-auto"
              )}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
