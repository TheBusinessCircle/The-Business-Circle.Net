import { z } from "zod";

export const CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIPS = [
  "WORKED_WITH",
  "BOUGHT_FROM",
  "MET_AT_EVENT",
  "COLLABORATED",
  "OTHER"
] as const;

export type CircleCardWalletTestimonialRelationship =
  (typeof CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIPS)[number];

export type CircleCardWalletTestimonialStatus = "PENDING" | "APPROVED" | "REJECTED";

export const CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIP_LABELS: Record<
  CircleCardWalletTestimonialRelationship,
  string
> = {
  WORKED_WITH: "Worked with them",
  BOUGHT_FROM: "Bought from them",
  MET_AT_EVENT: "Met at event",
  COLLABORATED: "Collaborated",
  OTHER: "Other"
};

const optionalRating = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().int().min(1).max(5).optional()
);

export const circleCardWalletTestimonialSubmitSchema = z.object({
  targetCardId: z.string().cuid(),
  testimonialText: z.string().trim().min(1, "Add your testimonial.").max(1200),
  rating: optionalRating,
  relationship: z
    .enum(CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIPS)
    .optional()
    .or(z.literal(""))
});

export const circleCardWalletTestimonialModerationSchema = z.object({
  testimonialId: z.string().cuid(),
  targetCardId: z.string().cuid()
});

export function circleCardWalletTestimonialRelationshipLabel(
  relationship?: string | null
) {
  return relationship && relationship in CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIP_LABELS
    ? CIRCLE_CARD_WALLET_TESTIMONIAL_RELATIONSHIP_LABELS[
        relationship as CircleCardWalletTestimonialRelationship
      ]
    : null;
}

export function isEligibleCircleCardWalletTestimonialTarget(
  card: {
    userId: string;
    cardType: string;
    isPublished: boolean;
    archivedAt: Date | string | null;
    user: { suspended: boolean };
  } | null | undefined,
  reviewerUserId: string
) {
  return Boolean(
    card &&
      card.cardType === "BUSINESS" &&
      card.userId !== reviewerUserId &&
      card.isPublished &&
      !card.archivedAt &&
      !card.user.suspended
  );
}

export function circleCardTrustSummary(approvedConnectionCount: number) {
  return approvedConnectionCount > 0
    ? `Trusted by ${approvedConnectionCount} connection${approvedConnectionCount === 1 ? "" : "s"}`
    : "Building trust";
}

export function circleCardTestimonialFlowHref(targetCardId: string) {
  return `/dashboard/circle-card/testimonial?cardId=${encodeURIComponent(targetCardId)}`;
}
