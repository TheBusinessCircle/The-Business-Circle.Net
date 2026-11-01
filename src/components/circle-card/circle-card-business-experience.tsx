import { ArrowUpRight, Check, Images, Phone, Send } from "lucide-react";
import type { CircleCardBusinessExperience } from "@/config/circle-card-hero-actions";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { circleCardPublicThemeClasses as theme } from "@/lib/circle-card/public-theme-classes";
import { getExternalLinkProps } from "@/lib/links";
import { cn } from "@/lib/utils";

export function CircleCardBusinessSignature({
  experience
}: { experience: CircleCardBusinessExperience }) {
  return (
    <ul aria-label={`Working with ${experience.brandName}`} className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
      {experience.highlights.map(highlight => (
        <li key={highlight} className="inline-flex items-center gap-1.5 text-xs text-silver">
          <Check size={13} aria-hidden="true" className="text-[hsl(var(--cc-theme-accent-hsl))]" />
          {highlight}
        </li>
      ))}
    </ul>
  );
}

export function CircleCardBusinessProjectCta({
  experience,
  phoneHref,
  phoneLabel,
  analyticsCardId
}: {
  experience: CircleCardBusinessExperience;
  phoneHref: string | null;
  phoneLabel: string | null;
  analyticsCardId?: string;
}) {
  return (
    <section aria-labelledby="precision-project-title" className={cn(theme.sectionCard, "relative overflow-hidden")}>
      <div aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-1 bg-[hsl(var(--cc-theme-accent-hsl))]" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,.8fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--cc-theme-accent-hsl))]">Your next project</p>
          <h2 id="precision-project-title" className="mt-2 max-w-lg font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Better walls. A fresh exterior. A place to be proud of.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A single ceiling, a room refresh or a bigger renovation. Send a few photos and tell us what you have in mind.
          </p>
        </div>
        <div className="grid min-w-0 gap-3">
          <CircleCardTrackedLink
            {...getExternalLinkProps(experience.quoteHref)}
            cardId={analyticsCardId ?? ""}
            eventType="WEBSITE_CLICK"
            metadata={{ source: "business_project_quote", url: experience.quoteHref }}
            className={cn(buttonVariants(), theme.primaryButton, "h-auto min-h-12 gap-2 whitespace-normal px-4 py-3")}
          >
            <Send size={16} aria-hidden="true" className="shrink-0" />
            Get my free quote
            <ArrowUpRight size={16} aria-hidden="true" className="shrink-0" />
          </CircleCardTrackedLink>
          {phoneHref && phoneLabel ? (
            <CircleCardTrackedLink
              href={phoneHref}
              cardId={analyticsCardId ?? ""}
              eventType="PHONE_CLICK"
              metadata={{ source: "business_project_call" }}
              className={cn(buttonVariants({ variant: "outline" }), theme.secondaryButton, "h-auto min-h-12 gap-2 whitespace-normal px-4 py-3")}
            >
              <Phone size={16} aria-hidden="true" className="shrink-0" />
              Call {phoneLabel}
            </CircleCardTrackedLink>
          ) : null}
          <p className="text-center text-xs leading-relaxed text-muted">Free quotes. Straightforward next-step advice.</p>
        </div>
      </div>
      <ol aria-label="How to get started" className="mt-7 grid gap-4 border-t border-[color:var(--cc-theme-secondary-border)] pt-5 sm:grid-cols-3">
        {[
          ["01", "Show us the space", "Share photos and the work you are planning."],
          ["02", "Talk it through", "Get clear advice on preparation, scope and the next step."],
          ["03", "Plan the finish", "Agree the work and timing before the job starts."]
        ].map(([number, title, description]) => (
          <li key={number} className="min-w-0">
            <span className="text-xs font-semibold tracking-[.12em] text-[hsl(var(--cc-theme-accent-hsl))]">{number}</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
          </li>
        ))}
      </ol>
      <CircleCardTrackedLink
        {...getExternalLinkProps(experience.projectsHref)}
        cardId={analyticsCardId ?? ""}
        eventType="CUSTOM_LINK_CLICK"
        metadata={{ source: "business_project_portfolio", url: experience.projectsHref }}
        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[hsl(var(--cc-theme-accent-hsl))] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cc-theme-accent-hsl))]"
      >
        <Images size={16} aria-hidden="true" />
        Explore our project portfolio
        <ArrowUpRight size={14} aria-hidden="true" />
      </CircleCardTrackedLink>
    </section>
  );
}
