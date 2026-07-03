import { ExternalLink, Quote, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  isValidCircleCardReviewItem,
  type CircleCardReviewItem
} from "@/lib/circle-card/content-blocks";
import { circleCardWalletTestimonialRelationshipLabel } from "@/lib/circle-card/wallet-testimonials";

export function PublicCircleCardReviews({
  items,
  id = "business-reviews",
  trustedConnectionCount = 0
}: {
  items: CircleCardReviewItem[];
  id?: string;
  trustedConnectionCount?: number;
}) {
  const visibleItems = items.filter(
    (item) => item.isActive && isValidCircleCardReviewItem(item)
  );

  if (!visibleItems.length) {
    return null;
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-[1.75rem] border border-gold/18 bg-[linear-gradient(145deg,rgba(12,25,32,0.88),rgba(4,10,24,0.96))] p-4 shadow-panel-soft sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gold">Verified Trust</p>
          <h2 id={`${id}-title`} className="mt-1 font-display text-2xl text-foreground">
            Trusted by your Circle
          </h2>
          {trustedConnectionCount > 0 ? (
            <p className="mt-2 text-xs font-medium text-silver">
              {trustedConnectionCount} verified testimonial{trustedConnectionCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold">
          <Quote size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {visibleItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-silver/14 bg-white/[0.04] p-4 sm:p-5">
            {item.verifiedConnection ? (
              <Badge variant="outline" className="mb-3 border-emerald-400/24 text-emerald-200">
                Verified connection testimonial
              </Badge>
            ) : null}
            {item.rating ? (
              <div className="flex text-gold" aria-label={`${item.rating} out of 5 stars`}>
                {Array.from({ length: item.rating }, (_, index) => (
                  <Star key={index} size={15} fill="currentColor" aria-hidden="true" />
                ))}
              </div>
            ) : null}
            <blockquote className={item.rating ? "mt-3" : ""}>
              <p className="text-sm leading-relaxed text-foreground sm:text-base">“{item.reviewText}”</p>
            </blockquote>
            <footer className="mt-4 border-t border-silver/12 pt-3">
              <p className="text-sm font-semibold text-foreground">{item.reviewerName}</p>
              {item.reviewerRoleOrCompany ? (
                <p className="mt-0.5 text-xs text-muted">{item.reviewerRoleOrCompany}</p>
              ) : null}
              {item.relationship ? (
                <p className="mt-2 text-xs text-muted">
                  {circleCardWalletTestimonialRelationshipLabel(item.relationship)}
                </p>
              ) : null}
              {item.source || item.sourceUrl ? (
                item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold underline-offset-4 hover:underline"
                  >
                    {item.source || "View source"}
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-2 text-xs font-medium text-silver">{item.source}</p>
                )
              ) : null}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
