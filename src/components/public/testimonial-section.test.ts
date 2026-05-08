import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TestimonialProofType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listApprovedTestimonialsMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/testimonials", () => ({
  listApprovedTestimonials: listApprovedTestimonialsMock
}));

import { TestimonialSection } from "@/components/public/testimonial-section";

const createdAt = new Date("2026-05-08T10:00:00Z");

async function renderSection(input: Parameters<typeof TestimonialSection>[0]) {
  const element = await TestimonialSection(input);

  return element ? renderToStaticMarkup(element as ReactElement) : "";
}

describe("TestimonialSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render a public testimonial section when no approved testimonials exist", async () => {
    listApprovedTestimonialsMock.mockResolvedValue([]);

    const markup = await renderSection({
      proofType: TestimonialProofType.BCN_MEMBER,
      eyebrow: "MEMBER PROOF",
      title: "What owners are saying inside The Business Circle",
      intro: "Real feedback from business owners using BCN to find clearer conversations, stronger direction, and better rooms.",
      limit: 6
    });

    expect(markup).toBe("");
    expect(listApprovedTestimonialsMock).toHaveBeenCalledWith(
      TestimonialProofType.BCN_MEMBER,
      6
    );
  });

  it("renders approved BCN member testimonials for home and membership surfaces", async () => {
    listApprovedTestimonialsMock.mockResolvedValue([
      {
        id: "testimonial_1",
        proofType: TestimonialProofType.BCN_MEMBER,
        quote: "The room helped me make a clearer decision before I moved.",
        outcome: "A stronger first action.",
        rating: 5,
        authorName: "Alex Owner",
        authorRole: "Founder",
        businessName: "Alex Studio",
        businessWebsite: "https://alex.example.com",
        imageUrl: null,
        approvedAt: createdAt,
        createdAt
      }
    ]);

    const markup = await renderSection({
      proofType: TestimonialProofType.BCN_MEMBER,
      eyebrow: "WHY MEMBERS JOIN",
      title: "Proof from the people inside the room",
      intro: "Approved member feedback from the private environment.",
      limit: 6
    });

    expect(markup).toContain("Proof from the people inside the room");
    expect(markup).toContain("The room helped me make a clearer decision before I moved.");
    expect(markup).toContain("Alex Owner");
    expect(markup).toContain("Alex Studio");
    expect(markup).toContain("A stronger first action.");
  });

  it("renders approved Growth Architect testimonials for founder surfaces", async () => {
    listApprovedTestimonialsMock.mockResolvedValue([
      {
        id: "testimonial_2",
        proofType: TestimonialProofType.GROWTH_ARCHITECT,
        quote: "The work named the real constraint and gave us a cleaner order.",
        outcome: null,
        rating: null,
        authorName: "Jordan Client",
        authorRole: "Director",
        businessName: null,
        businessWebsite: null,
        imageUrl: null,
        approvedAt: createdAt,
        createdAt
      }
    ]);

    const markup = await renderSection({
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      eyebrow: "CLIENT PROOF",
      title: "Proof from Growth Architect work",
      intro: "Feedback from business owners who have worked directly with Trevor on clarity, positioning, conversion, or growth direction.",
      limit: 6
    });

    expect(markup).toContain("Proof from Growth Architect work");
    expect(markup).toContain("The work named the real constraint");
    expect(markup).toContain("Jordan Client");
  });

  it("does not render pending testimonials when the approved query returns none", async () => {
    listApprovedTestimonialsMock.mockResolvedValue([]);

    const markup = await renderSection({
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      title: "Member and client feedback",
      limit: 6,
      variant: "member"
    });

    expect(markup).toBe("");
  });

  it("does not render testimonials without display permission when the approved query returns none", async () => {
    listApprovedTestimonialsMock.mockResolvedValue([]);

    const markup = await renderSection({
      proofType: TestimonialProofType.BCN_MEMBER,
      title: "What owners are saying inside The Business Circle",
      limit: 6
    });

    expect(markup).toBe("");
  });
});
