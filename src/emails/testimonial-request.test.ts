import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TestimonialRequestEmail } from "@/emails/testimonial-request";

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

describe("testimonial request email", () => {
  it("keeps the testimonial request instructions short and non-repetitive", () => {
    const markup = renderToStaticMarkup(
      createElement(TestimonialRequestEmail, {
        recipientName: "Jordan Client",
        proofLabel: "Growth Architect work",
        testimonialUrl: "https://thebusinesscircle.net/testimonial/token_123",
        companyName: "Jordan Studio",
        auditBusinessName: "Website audit",
        contextNote: "A short note about the work.",
        subjectContext: "growth"
      })
    );

    expect(markup).toContain("You have been invited to leave a testimonial");
    expect(markup).toContain("The secure button opens your testimonial page");
    expect(markup).toContain("copy your testimonial from the page and paste it into Google");
    expect(markup).toContain("Your response is reviewed before anything is displayed publicly.");
    expect(countOccurrences(markup, "copy")).toBeLessThanOrEqual(2);
    expect(countOccurrences(markup, "secure button")).toBe(1);
    expect(countOccurrences(markup, "copy your testimonial from the page and paste it into Google")).toBe(1);
    expect(countOccurrences(markup, "optionally copy the same words into a Google review")).toBe(1);
  });
});
