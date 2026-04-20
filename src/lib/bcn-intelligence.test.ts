import { describe, expect, it } from "vitest";
import {
  getBcnTagLabel,
  getVisibleCommunityTags,
  parseBcnStructuredContent
} from "@/lib/bcn-intelligence";

describe("BCN intelligence helpers", () => {
  it("parses the BCN structured post format into reusable sections", () => {
    expect(
      parseBcnStructuredContent(
        [
          "Article detail:",
          "Retail demand is softening and operators are revising pricing and stock decisions.",
          "",
          "What happened:",
          "Demand is softening across retail categories.",
          "",
          "Why this matters:",
          "This affects pricing, stock levels, and margin planning.",
          "",
          "Who this affects:",
          "Retail operators and owner-led teams.",
          "",
          "BCN angle:",
          "Worth watching for what it says about live consumer confidence.",
          "",
          "Source:",
          "Reuters - https://example.com/story"
        ].join("\n")
      )
    ).toEqual({
      articleDetail:
        "Retail demand is softening and operators are revising pricing and stock decisions.",
      whatHappened: "Demand is softening across retail categories.",
      whyThisMatters: "This affects pricing, stock levels, and margin planning.",
      whoThisAffects: "Retail operators and owner-led teams.",
      bcnAngle: "Worth watching for what it says about live consumer confidence.",
      source: "Reuters - https://example.com/story"
    });
  });

  it("keeps article detail separate from the BCN breakdown when both are present", () => {
    const parsed = parseBcnStructuredContent(
      [
        "Article detail:",
        "The source says online merchants are reviewing acquisition costs, stock discipline, and paid spend after weaker conversion performance.",
        "",
        "What happened:",
        "Marketplace sellers are cutting ad spend after conversion rates weakened.",
        "",
        "Why this matters:",
        "This changes acquisition planning and short-term margin decisions.",
        "",
        "Who this affects:",
        "E-commerce operators and growth leads.",
        "",
        "BCN angle:",
        "Worth watching for what it says about real demand quality rather than vanity traffic.",
        "",
        "Source:",
        "Commerce Desk - https://example.com/story"
      ].join("\n")
    );

    expect(parsed?.articleDetail).toContain("reviewing acquisition costs");
    expect(parsed?.whatHappened).toBe(
      "Marketplace sellers are cutting ad spend after conversion rates weakened."
    );
  });

  it("hides BCN meta tags while keeping visible intelligence categories", () => {
    expect(getVisibleCommunityTags(["bcn-update", "curated", "marketing", "growth"])).toEqual([
      "marketing",
      "growth"
    ]);
    expect(getBcnTagLabel("e-commerce")).toBe("E-commerce");
  });
});
