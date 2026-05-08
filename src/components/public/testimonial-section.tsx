import type { TestimonialProofType } from "@prisma/client";
import { Quote, Star, TrendingUp } from "lucide-react";
import { SectionHeading } from "@/components/public/section-heading";
import { cn } from "@/lib/utils";
import {
  listApprovedTestimonials,
  type ApprovedTestimonial
} from "@/server/testimonials";

type TestimonialSectionVariant = "public" | "compact" | "member";

type TestimonialSectionProps = {
  proofType: TestimonialProofType;
  title: string;
  eyebrow?: string;
  intro?: string;
  limit?: number;
  variant?: TestimonialSectionVariant;
};

function ratingStars(rating: number) {
  const safeRating = Math.min(Math.max(Math.round(rating), 1), 5);

  return (
    <div className="flex items-center gap-1 text-gold" aria-label={`${safeRating} out of 5`}>
      {Array.from({ length: safeRating }).map((_, index) => (
        <Star key={index} size={14} className="fill-current" />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: ApprovedTestimonial }) {
  return (
    <article className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-card/64 p-5 shadow-panel-soft backdrop-blur sm:p-6">
      <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <Quote size={16} />
          </span>
          {testimonial.rating ? ratingStars(testimonial.rating) : null}
        </div>

        <blockquote className="text-base leading-relaxed text-white/82">
          &quot;{testimonial.quote}&quot;
        </blockquote>

        {testimonial.outcome ? (
          <div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-gold">
              <TrendingUp size={13} />
              Outcome
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/78">{testimonial.outcome}</p>
          </div>
        ) : null}

        <footer className="mt-auto border-t border-white/10 pt-4">
          <p className="font-medium text-foreground">{testimonial.authorName}</p>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs uppercase tracking-[0.08em] text-silver">
            {testimonial.authorRole ? <span>{testimonial.authorRole}</span> : null}
            {testimonial.authorRole && testimonial.businessName ? <span>/</span> : null}
            {testimonial.businessName ? (
              testimonial.businessWebsite ? (
                <a
                  href={testimonial.businessWebsite}
                  className="transition-colors hover:text-gold"
                  rel="noreferrer"
                  target="_blank"
                >
                  {testimonial.businessName}
                </a>
              ) : (
                <span>{testimonial.businessName}</span>
              )
            ) : null}
          </div>
        </footer>
      </div>
    </article>
  );
}

export async function TestimonialSection({
  proofType,
  title,
  eyebrow,
  intro,
  limit = 6,
  variant = "public"
}: TestimonialSectionProps) {
  const testimonials = await listApprovedTestimonials(proofType, limit);

  if (!testimonials.length) {
    return null;
  }

  const isMember = variant === "member";

  return (
    <section
      className={cn(
        isMember
          ? "premium-surface space-y-5 p-5 sm:p-6 lg:p-7"
          : "public-section",
        variant === "compact" ? "space-y-5" : ""
      )}
      data-testid="testimonial-section"
    >
      <SectionHeading
        label={eyebrow}
        title={title}
        description={intro}
        align={isMember ? "left" : "center"}
      />

      <div
        className={cn(
          "grid gap-4",
          testimonials.length === 1
            ? "mx-auto max-w-3xl"
            : "md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}
