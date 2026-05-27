import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public testimonial flow structure", () => {
  it("keeps the public form short and direct", () => {
    const source = readSource("src/components/testimonials/public-testimonial-request-form.tsx");

    expect(source).toContain("Business name");
    expect(source).toContain("Owner name (optional)");
    expect(source).toContain("Testimonial title (optional)");
    expect(source).toContain("Your full review");
    expect(source).toContain("Rating (optional)");
    expect(source).toContain("I&apos;m happy for this testimonial to be displayed publicly");
    expect(source).toContain("Email is not required for public testimonials");
    expect(source).not.toContain("Display preference");
    expect(source).not.toContain("Role/title");
    expect(source).not.toContain("LinkedIn");
  });

  it("keeps modern email domains optional and avoids browser TLD blocking", () => {
    const formSource = readSource("src/components/testimonials/public-testimonial-request-form.tsx");
    const actionSource = readSource("src/actions/testimonial.actions.ts");

    expect(formSource).toContain('name="submittedEmail"');
    expect(formSource).toContain('type="text"');
    expect(formSource).toContain('inputMode="email"');
    expect(actionSource).toContain("modernEmailPattern");
    expect(actionSource).toContain("optionalModernEmail");
  });

  it("shows the submitted testimonial copy and Google actions after submit", () => {
    const thankYouSource = readSource("src/components/testimonials/public-testimonial-thank-you.tsx");
    const ctaSource = readSource("src/components/testimonials/google-review-cta.tsx");

    expect(thankYouSource).toContain("Your submitted testimonial");
    expect(thankYouSource).toContain("Would you also be happy to leave this as a Google review?");
    expect(thankYouSource).toContain("Tap copy, open Google, paste the review and submit.");
    expect(thankYouSource).toContain("Copy review");
    expect(thankYouSource).toContain("Leave Google review");
    expect(thankYouSource).toContain("navigator.clipboard?.writeText");
    expect(thankYouSource).toContain('document.execCommand("copy")');
    expect(ctaSource).toContain("Would you also be happy to leave this as a Google review?");
    expect(ctaSource).toContain("Tap copy, open Google, paste the review and submit.");
  });

  it("supports clean public review routes", () => {
    const pageSource = readSource("src/components/testimonials/public-testimonial-experience.tsx");
    const reviewSource = readSource("src/app/(public)/review/page.tsx");
    const adminSource = readSource("src/app/(admin)/admin/testimonials/page.tsx");

    expect(pageSource).toContain("<PublicTestimonialRequestForm");
    expect(pageSource).toContain('formReturnPath = "/testimonial"');
    expect(reviewSource).toContain('formReturnPath: "/review"');
    expect(adminSource).toContain("`${SITE_CONFIG.url}/review`");
  });
});
