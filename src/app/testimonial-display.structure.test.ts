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

    expect(home).toContain("TestimonialSection");
    expect(home).toContain("TestimonialProofType.BCN_MEMBER");
    expect(home).toContain("What owners are saying inside The Business Circle");
    expect(membership).toContain("TestimonialSection");
    expect(membership).toContain("TestimonialProofType.BCN_MEMBER");
    expect(membership).toContain("Proof from the people inside the room");
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

    for (const source of [
      founder,
      founderService,
      memberGrowthArchitect,
      memberGrowthArchitectService
    ]) {
      expect(source).toContain("TestimonialSection");
      expect(source).toContain("TestimonialProofType.GROWTH_ARCHITECT");
    }

    expect(founder).toContain("Proof from Growth Architect work");
    expect(founderService).toContain("Proof from Growth Architect work");
    expect(memberGrowthArchitect).toContain("Member and client feedback");
    expect(memberGrowthArchitectService).toContain("Member and client feedback");
  });

  it("keeps public display backed by the approved testimonial query", () => {
    const component = readSource("src/components/public/testimonial-section.tsx");
    const service = readSource("src/server/testimonials/testimonial.service.ts");

    expect(component).toContain("listApprovedTestimonials(proofType, limit)");
    expect(component).toContain("if (!testimonials.length)");
    expect(service).toContain("status: TestimonialStatus.APPROVED");
    expect(service).toContain("permissionToDisplay: true");
  });
});
