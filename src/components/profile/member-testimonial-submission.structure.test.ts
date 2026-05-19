import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("member testimonial submission panel structure", () => {
  it("keeps the testimonial form collapsed unless feedback needs attention", () => {
    const source = readSource("src/components/profile/member-testimonial-submission.tsx");

    expect(source).toContain('const testimonialPanelDefaultOpen = feedback === "sent" || feedback === "invalid";');
    expect(source).toContain('open={testimonialPanelDefaultOpen}');
    expect(source).toContain("<details");
    expect(source).toContain("Share your experience");
    expect(source).toContain("Toggle testimonial form");
    expect(source).toContain("Latest sent {formatDate(latestCreatedAt)}");
  });

  it("keeps testimonial submission and Google review follow-up wiring intact", () => {
    const source = readSource("src/components/profile/member-testimonial-submission.tsx");

    expect(source).toContain("submitMemberTestimonialAction");
    expect(source).toContain("<GoogleReviewCta");
    expect(source).toContain('feedback === "sent"');
    expect(source).toContain('feedback === "invalid"');
    expect(source).toContain('name="permissionToFeaturePublicly"');
    expect(source).toContain('name="quote"');
  });
});
