import { z } from "zod";

export const CIRCLE_CARD_RECOMMENDATION_CATEGORIES = [
  "Web Design",
  "Digital Marketing",
  "SEO",
  "Photography",
  "Videography",
  "Accounting",
  "Legal",
  "Trades",
  "Venue",
  "Food & Drink",
  "Health & Wellness",
  "Coaching",
  "Consultancy",
  "Recruitment",
  "Retail",
  "Creative",
  "Events",
  "Technology",
  "Other"
] as const;

export const CIRCLE_CARD_RECOMMENDATION_VISIBILITIES = ["PRIVATE", "PUBLIC"] as const;
export const CIRCLE_CARD_RECOMMENDATION_STATUS_ACTIONS = ["HIDDEN", "REMOVED"] as const;

export type CircleCardRecommendationCategory =
  (typeof CIRCLE_CARD_RECOMMENDATION_CATEGORIES)[number];

const optionalReason = z.string().trim().max(360).optional().or(z.literal(""));

export const circleCardRecommendationFormSchema = z.object({
  recommendationId: z.string().cuid().optional().or(z.literal("")),
  walletContactId: z.string().cuid(),
  category: z.enum(CIRCLE_CARD_RECOMMENDATION_CATEGORIES),
  reason: optionalReason,
  visibility: z.enum(CIRCLE_CARD_RECOMMENDATION_VISIBILITIES).default("PRIVATE")
});

export const circleCardRecommendationStatusSchema = z.object({
  recommendationId: z.string().cuid(),
  status: z.enum(CIRCLE_CARD_RECOMMENDATION_STATUS_ACTIONS),
  returnPath: z.string().trim().max(600).optional().or(z.literal(""))
});

export function circleCardRecommendationVisibilityLabel(value: string | null | undefined) {
  return value === "PUBLIC" ? "Public recommendation" : "Private note only";
}
