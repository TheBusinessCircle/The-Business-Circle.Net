import type { ReactNode } from "react";
import { ChevronRight, Star } from "lucide-react";
import type { CircleCardHeroReviewAction } from "@/config/circle-card-hero-actions";
import { CircleCardTrackedLink } from "@/components/circle-card/circle-card-tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { circleCardPublicThemeClasses } from "@/lib/circle-card/public-theme-classes";
import { getExternalLinkProps } from "@/lib/links";
import { cn } from "@/lib/utils";

export function CircleCardBusinessHeroActions({
  primaryAction,
  reviewAction,
  analyticsCardId
}: {
  primaryAction: ReactNode;
  reviewAction: CircleCardHeroReviewAction | null;
  analyticsCardId?: string;
}) {
  return (
    <div
      className={reviewAction
        ? "mx-auto mt-6 flex w-full max-w-sm flex-col gap-3"
        : "mt-6 flex justify-center"}
    >
      {primaryAction}
      {reviewAction ? (
        <CircleCardTrackedLink
          {...getExternalLinkProps(reviewAction.href)}
          cardId={analyticsCardId ?? ""}
          eventType="CUSTOM_LINK_CLICK"
          metadata={{ source: "business_hero_review_cta", url: reviewAction.href }}
          className={cn(
            buttonVariants({ variant: "outline" }),
            circleCardPublicThemeClasses.secondaryButton,
            "h-auto min-h-12 min-w-0 gap-2 whitespace-normal border-[color:var(--cc-theme-button-border)] px-4 py-3 text-[hsl(var(--cc-theme-accent-hsl))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--cc-theme-accent-hsl))]"
          )}
        >
          <Star size={18} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1 text-center">{reviewAction.label}</span>
          <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
        </CircleCardTrackedLink>
      ) : null}
    </div>
  );
}
