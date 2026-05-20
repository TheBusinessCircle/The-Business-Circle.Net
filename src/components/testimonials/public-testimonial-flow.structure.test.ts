import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public testimonial Google review flow structure", () => {
  it("shows a helpful message when visitors try to copy an empty testimonial", () => {
    const source = readSource("src/components/testimonials/public-testimonial-request-form.tsx");

    expect(source).toContain("Write your testimonial first, then copy it.");
    expect(source).toContain("setCopyMessage");
    expect(source).toContain("aria-live=\"polite\"");
  });

  it("keeps clipboard fallback support on the active form and thank-you state", () => {
    const formSource = readSource("src/components/testimonials/public-testimonial-request-form.tsx");
    const thankYouSource = readSource("src/components/testimonials/public-testimonial-thank-you.tsx");

    expect(formSource).toContain("navigator.clipboard?.writeText");
    expect(formSource).toContain("document.execCommand(\"copy\")");
    expect(thankYouSource).toContain("navigator.clipboard?.writeText");
    expect(thankYouSource).toContain("document.execCommand(\"copy\")");
  });

  it("keeps the submitted testimonial copy and Google actions in the thank-you state", () => {
    const source = readSource("src/components/testimonials/public-testimonial-thank-you.tsx");

    expect(source).toContain("Your submitted testimonial");
    expect(source).toContain("Copy testimonial");
    expect(source).toContain("Leave Google review");
    expect(source).toContain("target=\"_blank\"");
    expect(source).toContain("rel=\"noopener noreferrer\"");
  });
});
