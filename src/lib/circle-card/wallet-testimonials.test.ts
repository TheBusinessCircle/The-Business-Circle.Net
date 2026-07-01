import { describe, expect, it } from "vitest";
import {
  circleCardTestimonialFlowHref,
  circleCardTrustSummary,
  circleCardWalletTestimonialSubmitSchema,
  isEligibleCircleCardWalletTestimonialTarget
} from "@/lib/circle-card/wallet-testimonials";

const liveBusinessCard = {
  userId: "target-user",
  cardType: "BUSINESS",
  isPublished: true,
  archivedAt: null,
  user: { suspended: false }
};

describe("Circle Card wallet testimonial validation", () => {
  it("uses honest public trust copy and a target-preserving dashboard route", () => {
    expect(circleCardTrustSummary(0)).toBe("Building trust");
    expect(circleCardTrustSummary(1)).toBe("Trusted by 1 connection");
    expect(circleCardTrustSummary(5)).toBe("Trusted by 5 connections");
    expect(circleCardTestimonialFlowHref("cm12345678901234567890123")).toBe(
      "/dashboard/circle-card/testimonial?cardId=cm12345678901234567890123"
    );
  });

  it("accepts valid testimonial input and optional relationship context", () => {
    const result = circleCardWalletTestimonialSubmitSchema.parse({
      targetCardId: "cm12345678901234567890123",
      testimonialText: "A trusted and thoughtful collaborator.",
      rating: "5",
      relationship: "COLLABORATED"
    });

    expect(result.rating).toBe(5);
    expect(result.relationship).toBe("COLLABORATED");
  });

  it("rejects empty text and ratings outside 1 to 5", () => {
    const base = {
      targetCardId: "cm12345678901234567890123",
      testimonialText: "Trusted connection",
      relationship: ""
    };

    expect(circleCardWalletTestimonialSubmitSchema.safeParse({ ...base, testimonialText: "" }).success).toBe(false);
    expect(circleCardWalletTestimonialSubmitSchema.safeParse({ ...base, rating: "0" }).success).toBe(false);
    expect(circleCardWalletTestimonialSubmitSchema.safeParse({ ...base, rating: "6" }).success).toBe(false);
  });

  it("allows only another owner's live, non-archived Business Card", () => {
    expect(isEligibleCircleCardWalletTestimonialTarget(liveBusinessCard, "reviewer-user")).toBe(true);
    expect(isEligibleCircleCardWalletTestimonialTarget(liveBusinessCard, "target-user")).toBe(false);
    expect(isEligibleCircleCardWalletTestimonialTarget({ ...liveBusinessCard, isPublished: false }, "reviewer-user")).toBe(false);
    expect(isEligibleCircleCardWalletTestimonialTarget({ ...liveBusinessCard, archivedAt: new Date() }, "reviewer-user")).toBe(false);
    expect(isEligibleCircleCardWalletTestimonialTarget({ ...liveBusinessCard, cardType: "PERSONAL" }, "reviewer-user")).toBe(false);
    expect(isEligibleCircleCardWalletTestimonialTarget({ ...liveBusinessCard, user: { suspended: true } }, "reviewer-user")).toBe(false);
  });
});
