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
    const formSource = readSource("src/components/profile/member-testimonial-submission-form.tsx");

    expect(source).toContain("<MemberTestimonialSubmissionForm");
    expect(formSource).toContain("submitMemberTestimonialAction");
    expect(source).toContain("<GoogleReviewCta");
    expect(source).toContain('feedback === "sent"');
    expect(source).toContain('feedback === "invalid"');
    expect(formSource).toContain('name="permissionToFeaturePublicly"');
    expect(formSource).toContain('name="quote"');
    expect(source).toContain("testimonialText={postSubmitTestimonialText}");
    expect(source).toContain("label={googleReviewButtonLabel}");
  });

  it("shows live copy controls in the member testimonial form before submission", () => {
    const formSource = readSource("src/components/profile/member-testimonial-submission-form.tsx");

    expect(formSource).toContain('"use client";');
    expect(formSource).toContain('value={testimonialText}');
    expect(formSource).toContain("setTestimonialText(event.target.value)");
    expect(formSource).toContain("Copy testimonial text");
    expect(formSource).toContain("Copied");
    expect(formSource).toContain('type="button"');
    expect(formSource).toContain("disabled={!testimonialReady}");
    expect(formSource).toContain("navigator.clipboard.writeText(testimonialText)");
  });

  it("shows the enabled Google review journey inside the member form", () => {
    const formSource = readSource("src/components/profile/member-testimonial-submission-form.tsx");

    expect(formSource).toContain("googleReviewCtaIsActive");
    expect(formSource).toContain("Leave this on Google too");
    expect(formSource).toContain("Copy your testimonial first, then open Google and paste the same words into The");
    expect(formSource).toContain("Business Circle Network LTD review box");
    expect(formSource).toContain("Copy testimonial");
    expect(formSource).toContain("Open Google review page");
    expect(formSource).toContain('window.open(googleReviewUrl, "_blank", "noopener,noreferrer")');
    expect(formSource).toContain('fetch("/api/testimonials/google-intent"');
  });

  it("keeps Google review pending settings visible only when admin opts to show them", () => {
    const formSource = readSource("src/components/profile/member-testimonial-submission-form.tsx");
    const pageSource = readSource("src/app/(member)/profile/page.tsx");

    expect(formSource).toContain("shouldShowGoogleReviewPendingState");
    expect(formSource).toContain("{googleReviewPendingMessage}");
    expect(formSource).toContain("{googleReviewButtonLabel}");
    expect(pageSource).toContain("googleReviewButtonLabel={reviewSettings.googleReviewButtonLabel}");
  });
});
