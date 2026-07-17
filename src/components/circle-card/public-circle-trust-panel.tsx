import { CircleCardRuntimeLink as Link } from "@/components/circle-card/circle-card-runtime-link";
import { ArrowRight, CheckCircle2, ChevronDown, Quote, ShieldCheck, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { CircleTrustSummary } from "@/lib/circle-card/circle-trust";
import { circleCardPublicThemeClasses } from "@/lib/circle-card/public-theme-classes";
import { circleCardWalletTestimonialRelationshipLabel } from "@/lib/circle-card/wallet-testimonials";
import { cn } from "@/lib/utils";

type PublicCircleTrustPanelProps = {
  trust: CircleTrustSummary;
  slug: string;
  testimonialHref?: string | null;
  showLatestTestimonials?: boolean;
  creator?: boolean;
};

export function PublicCircleTrustPanel({
  trust,
  slug,
  testimonialHref,
  showLatestTestimonials = true,
  creator = false
}: PublicCircleTrustPanelProps) {
  const latestTestimonials = trust.latestVerifiedTestimonials.slice(0, 2);

  return (
    <section
      id="circle-card-trust"
      aria-labelledby="circle-card-trust-title"
      className={cn(
        circleCardPublicThemeClasses.trustPanel,
        creator ? "shadow-[var(--cc-theme-hero-shadow)]" : null
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold">Circle Trust</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
            <h2 id="circle-card-trust-title" className="font-display text-5xl font-semibold leading-none text-foreground sm:text-6xl">
              {trust.score}
            </h2>
            <p className="pb-1 text-sm font-medium text-silver">Trusted by your Circle</p>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{trust.summary}</p>
        </div>
        <span className={cn(circleCardPublicThemeClasses.iconSurface, "h-12 w-12 rounded-2xl")}>
          <ShieldCheck size={21} aria-hidden="true" />
        </span>
      </div>

      <details className="cc-theme-card group mt-5 rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Built from</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {trust.signals.length}
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2">
          {trust.signals.map((signal) => (
            <div key={signal.id} className="cc-theme-card flex items-start gap-2.5 rounded-xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {signal.count !== undefined ? `${signal.count} ` : ""}{signal.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{signal.description}</p>
              </div>
            </div>
          ))}
          {!trust.signals.length ? (
            <p className="cc-theme-card rounded-xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3 text-xs leading-relaxed text-muted sm:col-span-2">No public trust signals have been recorded yet.</p>
          ) : null}
        </div>
      </details>

      {showLatestTestimonials && latestTestimonials.length ? (
        <details className="cc-theme-card group mt-3 rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2"><Quote size={14} className="text-gold" />Latest verified trust signals</span>
            <ChevronDown size={15} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-silver/12 p-3 sm:grid-cols-2">
            {latestTestimonials.map((testimonial) => (
              <article key={testimonial.id} className="cc-theme-card rounded-xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-3">
                {testimonial.rating ? (
                  <div className="flex text-gold" aria-label={`${testimonial.rating} out of 5 stars`}>
                    {Array.from({ length: testimonial.rating }, (_, index) => (
                      <Star key={index} size={12} fill="currentColor" aria-hidden="true" />
                    ))}
                  </div>
                ) : null}
                <p className={cn("line-clamp-3 text-sm leading-relaxed text-silver", testimonial.rating && "mt-2")}>
                  &ldquo;{testimonial.testimonialText}&rdquo;
                </p>
                <p className="mt-3 text-xs font-semibold text-foreground">{testimonial.reviewerName}</p>
                {testimonial.relationship ? (
                  <p className="mt-1 text-[11px] text-muted">
                    {circleCardWalletTestimonialRelationshipLabel(testimonial.relationship)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <Link href={`/card/${slug}/trust`} className={cn(buttonVariants(), "min-h-11 gap-2")}>
          Trusted by my Circle <ArrowRight size={15} />
        </Link>
        {testimonialHref ? (
          <Link href={testimonialHref} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}>
            <ShieldCheck size={15} /> Build their Circle Trust
          </Link>
        ) : null}
      </div>
    </section>
  );
}
