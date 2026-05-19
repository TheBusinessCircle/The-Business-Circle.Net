import { describe, expect, it } from "vitest";
import {
  GOOGLE_REVIEW_TESTIMONIAL_MIN_LENGTH,
  googleReviewCtaIsActive,
  shouldShowGoogleReviewPendingState,
  testimonialIsReadyForGoogleReview
} from "@/components/testimonials/google-review.logic";

describe("Google review CTA logic", () => {
  it("enables the Google review CTA when the URL and admin settings are enabled", () => {
    expect(
      googleReviewCtaIsActive({
        enabled: true,
        showButton: true,
        googleReviewUrl: "https://business.google.com/review/example"
      })
    ).toBe(true);
  });

  it("does not activate the Google review CTA when the URL is missing", () => {
    expect(
      googleReviewCtaIsActive({
        enabled: true,
        showButton: true,
        googleReviewUrl: ""
      })
    ).toBe(false);
  });

  it("shows the pending state only when admin says to show the Google review button", () => {
    expect(
      shouldShowGoogleReviewPendingState({
        enabled: true,
        showButton: true,
        googleReviewUrl: null
      })
    ).toBe(true);

    expect(
      shouldShowGoogleReviewPendingState({
        enabled: true,
        showButton: false,
        googleReviewUrl: null
      })
    ).toBe(false);
  });

  it("keeps the Google button disabled until testimonial text is long enough", () => {
    expect(testimonialIsReadyForGoogleReview("Too short")).toBe(false);
    expect(testimonialIsReadyForGoogleReview("x".repeat(GOOGLE_REVIEW_TESTIMONIAL_MIN_LENGTH))).toBe(true);
  });
});
