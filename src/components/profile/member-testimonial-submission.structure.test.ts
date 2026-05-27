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

  it("uses the same simplified fields as the public testimonial form", () => {
    const formSource = readSource("src/components/profile/member-testimonial-submission-form.tsx");

    expect(formSource).toContain("submitMemberTestimonialAction");
    expect(formSource).toContain("Business name");
    expect(formSource).toContain("Owner name (optional)");
    expect(formSource).toContain("Testimonial title (optional)");
    expect(formSource).toContain("Your full review");
    expect(formSource).toContain("Rating (optional)");
    expect(formSource).toContain("I&apos;m happy for this testimonial to be displayed publicly");
    expect(formSource).toContain('name="returnPath"');
    expect(formSource).not.toContain("Display preference");
    expect(formSource).not.toContain("LinkedIn");
    expect(formSource).not.toContain("Website, optional");
  });

  it("prefills known member details from profile and dashboard surfaces", () => {
    const source = readSource("src/components/profile/member-testimonial-submission.tsx");
    const profilePage = readSource("src/app/(member)/profile/page.tsx");
    const dashboardPage = readSource("src/app/(member)/dashboard/page.tsx");

    expect(source).toContain("defaultOwnerName={memberName ?? \"\"}");
    expect(source).toContain("defaultBusinessName={businessName ?? \"\"}");
    expect(profilePage).toContain("memberName={user.name}");
    expect(profilePage).toContain("businessName={user.profile?.business?.companyName}");
    expect(dashboardPage).toContain("<MemberTestimonialSubmission");
    expect(dashboardPage).toContain('returnPath="/dashboard"');
  });

  it("shows the Google review copy-paste step only after a submitted testimonial", () => {
    const source = readSource("src/components/profile/member-testimonial-submission.tsx");
    const ctaSource = readSource("src/components/testimonials/google-review-cta.tsx");

    expect(source).toContain("<GoogleReviewCta");
    expect(source).toContain('feedback === "sent"');
    expect(source).toContain("Thank you, your testimonial has been received.");
    expect(ctaSource).toContain("Would you also be happy to leave this as a Google review?");
    expect(ctaSource).toContain("Tap copy, open Google, paste the review and submit.");
    expect(ctaSource).toContain("Copy review");
  });
});
