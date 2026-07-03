import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Quote, ShieldCheck, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { CircleTrustSummary } from "@/lib/circle-card/circle-trust";
import { circleCardWalletTestimonialRelationshipLabel } from "@/lib/circle-card/wallet-testimonials";
import { cn } from "@/lib/utils";

type PublicCircleTrustPanelProps = {
  trust: CircleTrustSummary;
  slug: string;
  testimonialHref?: string | null;
  showLatestTestimonials?: boolean;
};

export function PublicCircleTrustPanel({
  trust,
  slug,
  testimonialHref,
  showLatestTestimonials = true
}: PublicCircleTrustPanelProps) {
  const latestTestimonials = trust.latestVerifiedTestimonials.slice(0, 2);

  return (
    <section
      id="circle-card-trust"
      aria-labelledby="circle-card-trust-title"
      className="scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-gold/24 bg-[radial-gradient(circle_at_top_right,rgba(212,175,95,0.11),transparent_34%),linear-gradient(145deg,rgba(12,25,32,0.94),rgba(4,10,24,0.98))] p-5 shadow-panel-soft sm:p-6"
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
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/28 bg-gold/10 text-gold">
          <ShieldCheck size={21} aria-hidden="true" />
        </span>
      </div>

      <details className="group mt-5 rounded-2xl border border-silver/14 bg-white/[0.035]" open>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Trust Signals</span>
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            {trust.signals.length}
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="grid gap-2 border-t border-silver/12 p-3 sm:grid-cols-2">
          {trust.signals.map((signal) => (
            <div key={signal.id} className="flex items-start gap-2.5 rounded-xl border border-silver/10 bg-background/24 p-3">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {signal.count !== undefined ? `${signal.count} ` : ""}{signal.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </details>

      {showLatestTestimonials && latestTestimonials.length ? (
        <details className="group mt-3 rounded-2xl border border-silver/14 bg-white/[0.035]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2"><Quote size={14} className="text-gold" />Latest verified testimonials</span>
            <ChevronDown size={15} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-silver/12 p-3 sm:grid-cols-2">
            {latestTestimonials.map((testimonial) => (
              <article key={testimonial.id} className="rounded-xl border border-silver/10 bg-background/24 p-3">
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
          View Circle Trust <ArrowRight size={15} />
        </Link>
        {testimonialHref ? (
          <Link href={testimonialHref} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}>
            <ShieldCheck size={15} /> Help build my Circle Trust
          </Link>
        ) : null}
      </div>
    </section>
  );
}
