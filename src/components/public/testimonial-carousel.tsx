"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type CarouselTestimonial = {
  id: string;
  quote: string;
  outcome: string | null;
  rating: number | null;
  authorName: string;
  authorRole: string | null;
  businessName: string | null;
  businessWebsite: string | null;
};

type TestimonialCarouselProps = {
  testimonials: CarouselTestimonial[];
  initialIndex?: number;
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

export function TestimonialCarousel({
  testimonials,
  initialIndex = 0
}: TestimonialCarouselProps) {
  const uniqueTestimonials = useMemo(
    () => Array.from(new Map(testimonials.map((item) => [item.id, item])).values()),
    [testimonials]
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    uniqueTestimonials.length ? initialIndex % uniqueTestimonials.length : 0
  );
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const activeTestimonial = uniqueTestimonials[activeIndex];
  const hasMultiple = uniqueTestimonials.length > 1;

  useEffect(() => {
    if (!hasMultiple) {
      return;
    }

    setActiveIndex(Math.floor(Math.random() * uniqueTestimonials.length));
  }, [hasMultiple, uniqueTestimonials.length]);

  if (!activeTestimonial) {
    return null;
  }

  const showPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? uniqueTestimonials.length - 1 : current - 1
    );
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % uniqueTestimonials.length);
  };

  return (
    <div
      role="region"
      aria-label="Approved member testimonials"
      className="relative"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) {
          setTouchStart({ x: touch.clientX, y: touch.clientY });
        }
      }}
      onTouchEnd={(event) => {
        if (!touchStart || !hasMultiple) {
          return;
        }

        const touch = event.changedTouches[0];
        if (!touch) {
          return;
        }

        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;

        setTouchStart(null);

        if (Math.abs(deltaX) < 46 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
          return;
        }

        if (deltaX < 0) {
          showNext();
        } else {
          showPrevious();
        }
      }}
    >
      <article className="relative overflow-hidden rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/78 to-card/68 p-5 shadow-gold-soft sm:p-7">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.08]" />
        <div className="relative grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <Quote size={18} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                Approved member proof
              </p>
              {activeTestimonial.rating ? ratingStars(activeTestimonial.rating) : null}
            </div>

            <blockquote className="mt-4 text-xl leading-relaxed text-white/86 sm:text-2xl">
              &quot;{activeTestimonial.quote}&quot;
            </blockquote>

            {activeTestimonial.outcome ? (
              <p className="mt-4 rounded-2xl border border-gold/20 bg-background/24 px-4 py-3 text-sm leading-relaxed text-muted">
                {activeTestimonial.outcome}
              </p>
            ) : null}

            <footer className="mt-5 border-t border-white/10 pt-4">
              <p className="font-medium text-foreground">{activeTestimonial.authorName}</p>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs uppercase tracking-[0.08em] text-silver">
                {activeTestimonial.authorRole ? <span>{activeTestimonial.authorRole}</span> : null}
                {activeTestimonial.authorRole && activeTestimonial.businessName ? <span>/</span> : null}
                {activeTestimonial.businessName ? (
                  activeTestimonial.businessWebsite ? (
                    <a
                      href={activeTestimonial.businessWebsite}
                      className="transition-colors hover:text-gold"
                      rel="noreferrer"
                      target="_blank"
                    >
                      {activeTestimonial.businessName}
                    </a>
                  ) : (
                    <span>{activeTestimonial.businessName}</span>
                  )
                ) : null}
              </div>
            </footer>
          </div>
        </div>
      </article>

      {hasMultiple ? (
        <>
          <div className="mt-4 hidden items-center justify-between gap-3 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={showPrevious}
              aria-label="Show previous testimonial"
            >
              <ChevronLeft size={15} />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={showNext}
              aria-label="Show next testimonial"
            >
              Next
              <ChevronRight size={15} />
            </Button>
          </div>

          <div className="mt-4 flex justify-center gap-2" aria-label="Testimonial position">
            {uniqueTestimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                aria-label={`Show testimonial ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-8 bg-gold"
                    : "w-2.5 border border-silver/24 bg-silver/18"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
