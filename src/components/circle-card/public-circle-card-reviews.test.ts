import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicCircleCardReviews } from "@/components/circle-card/public-circle-card-reviews";
import type { CircleCardReviewItem } from "@/lib/circle-card/content-blocks";

const review: CircleCardReviewItem = {
  id: "review-1",
  reviewerName: "Alex Morgan",
  reviewerRoleOrCompany: "Founder, North Studio",
  reviewText: "Excellent to work with.",
  rating: 5,
  source: "Google Review",
  sourceUrl: "https://example.com/reviews/alex",
  isActive: true,
  sortOrder: 0
};

function renderReviews(items: CircleCardReviewItem[]) {
  return renderToStaticMarkup(createElement(PublicCircleCardReviews, { items }));
}

describe("public Circle Card reviews", () => {
  it("renders active valid client proof", () => {
    const markup = renderReviews([review]);

    expect(markup).toContain("Trusted by your Circle");
    expect(markup).toContain("Alex Morgan");
    expect(markup).toContain("Excellent to work with.");
    expect(markup).toContain("5 out of 5 stars");
    expect(markup).toContain("Google Review");
  });

  it("does not render hidden or invalid reviews", () => {
    expect(renderReviews([{ ...review, isActive: false }])).toBe("");
    expect(renderReviews([{ ...review, reviewerName: "" }])).toBe("");
    expect(renderReviews([{ ...review, reviewText: "" }])).toBe("");
    expect(renderReviews([{ ...review, sourceUrl: "javascript:alert(1)" }])).toBe("");
  });

  it("labels approved wallet testimonials as verified connection proof", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicCircleCardReviews, {
        items: [{ ...review, id: "wallet-review", verifiedConnection: true, relationship: "COLLABORATED" }],
        trustedConnectionCount: 1
      })
    );

    expect(markup).toContain("Verified connection testimonial");
    expect(markup).toContain("1 verified testimonial");
    expect(markup).toContain("Collaborated");
  });
});
