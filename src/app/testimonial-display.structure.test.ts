import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("testimonial display placement", () => {
  it("wires approved BCN member testimonials into home and membership pages", () => {
    const home = readSource("src/app/(public)/home/page.tsx");
    const membership = readSource("src/app/(public)/membership/page.tsx");
    const join = readSource("src/app/(auth)/join/page.tsx");
    const publicTrustProof = readSource("src/components/public/public-trust-proof-section.tsx");

    expect(home).toContain("TestimonialCarousel");
    expect(home).toContain("listApprovedTestimonials({");
    expect(home).toContain("TestimonialProofType.BCN_MEMBER");
    expect(home).toContain("TestimonialDisplayLocation.BCN_HOME");
    expect(home).not.toContain("PublicTrustProofSection");
    expect(home).not.toContain("<TestimonialSection");
    expect(membership).toContain("PublicTrustProofSection");
    expect(membership).toContain('source="membership"');
    expect(join).toContain("PublicTrustProofSection");
    expect(join).toContain('source="join"');
    expect(publicTrustProof).toContain("TestimonialSection");
    expect(publicTrustProof).toContain("TestimonialProofType.BCN_MEMBER");
    expect(publicTrustProof).toContain("Approved member feedback from The Business Circle");
  });

  it("keeps the home testimonial carousel single-card, randomised and swipe-enabled", () => {
    const carousel = readSource("src/components/public/testimonial-carousel.tsx");

    expect(carousel).toContain('aria-label="Approved member testimonials"');
    expect(carousel).toContain("Math.random()");
    expect(carousel).toContain("onTouchStart");
    expect(carousel).toContain("onTouchEnd");
    expect(carousel).toContain('aria-label="Show previous testimonial"');
    expect(carousel).toContain('aria-label="Show next testimonial"');
    expect(carousel).toContain("aria-current");
    expect(carousel).toContain("new Map");
  });

  it("wires approved Growth Architect testimonials into founder pages", () => {
    const founder = readSource("src/app/(public)/founder/page.tsx");
    const founderService = readSource("src/app/(public)/founder/services/[slug]/page.tsx");
    const memberGrowthArchitect = readSource(
      "src/app/(member)/member/growth-architect/page.tsx"
    );
    const memberGrowthArchitectService = readSource(
      "src/app/(member)/member/growth-architect/services/[slug]/page.tsx"
    );

    for (const source of [founderService, memberGrowthArchitect, memberGrowthArchitectService]) {
      expect(source).toContain("TestimonialSection");
      expect(source).toContain("TestimonialProofType.GROWTH_ARCHITECT");
    }

    expect(founder).toContain("listApprovedTestimonials({");
    expect(founder).toContain("TestimonialProofType.GROWTH_ARCHITECT");
    expect(founder).toContain("Results, Feedback & Founder Proof");
    expect(founder).toContain("overflow-x-auto");
    expect(founderService).toContain("Proof from Growth Architect work");
    expect(memberGrowthArchitect).toContain("Member and client feedback");
    expect(memberGrowthArchitectService).toContain("Member and client feedback");
  });

  it("keeps public display backed by the approved testimonial query", () => {
    const component = readSource("src/components/public/testimonial-section.tsx");
    const service = readSource("src/server/testimonials/testimonial.service.ts");

    expect(component).toContain("listApprovedTestimonials({");
    expect(component).toContain("if (!testimonials.length)");
    expect(service).toContain("status: TestimonialStatus.APPROVED");
    expect(service).toContain("permissionToFeaturePublicly: true");
  });
});
