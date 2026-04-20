import { describe, expect, it } from "vitest";
import {
  getBcnFreshnessLabel,
  getBcnTagLabel,
  getVisibleCommunityTags,
  parseBcnStructuredContent,
  sortBcnSignals
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
          "Key detail:",
          "Several national chains are cutting inventory commitments for the summer range.",
          "",
          "Why this matters:",
          "This affects pricing, stock levels, and margin planning.",
          "",
          "Who this affects:",
          "Retail operators and owner-led teams.",
          "",
          "BCN view:",
          "Worth watching for what it says about live consumer confidence.",
          "",
          "What to watch next:",
          "Watch the next retail trading updates for whether discounting spreads further.",
          "",
          "Source:",
          "Reuters - https://example.com/story"
        ].join("\n")
      )
    ).toEqual({
      articleDetail:
        "Retail demand is softening and operators are revising pricing and stock decisions.",
      whatHappened: "Demand is softening across retail categories.",
      keyDetail: "Several national chains are cutting inventory commitments for the summer range.",
      whyThisMatters: "This affects pricing, stock levels, and margin planning.",
      whoThisAffects: "Retail operators and owner-led teams.",
      bcnView: "Worth watching for what it says about live consumer confidence.",
      whatToWatchNext:
        "Watch the next retail trading updates for whether discounting spreads further.",
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
        "Key detail:",
        "Merchants are shifting budget toward higher-intent channels and tighter stock control.",
        "",
        "Why this matters:",
        "This changes acquisition planning and short-term margin decisions.",
        "",
        "Who this affects:",
        "E-commerce operators and growth leads.",
        "",
        "BCN view:",
        "Worth watching for what it says about real demand quality rather than vanity traffic.",
        "",
        "What to watch next:",
        "Watch the next conversion and stock updates to see whether demand quality recovers.",
        "",
        "Source:",
        "Commerce Desk - https://example.com/story"
      ].join("\n")
    );

    expect(parsed?.articleDetail).toContain("reviewing acquisition costs");
    expect(parsed?.keyDetail).toContain("higher-intent channels");
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

  it("sorts BCN signals by founder relevance before pure recency", () => {
    const sorted = sortBcnSignals([
      {
        title: "Soft market reaction after a political speech",
        content: [
          "Article detail:",
          "Markets moved after a political speech.",
          "",
          "What happened:",
          "Markets moved after a political speech.",
          "",
          "Key detail:",
          "Traders reacted during the afternoon session.",
          "",
          "Why this matters:",
          "This may affect sentiment.",
          "",
          "Who this affects:",
          "Market watchers.",
          "",
          "BCN view:",
          "Worth noting only if it becomes a wider operating change.",
          "",
          "What to watch next:",
          "Watch the next market session.",
          "",
          "Source:",
          "Desk - https://example.com/politics"
        ].join("\n"),
        tags: ["bcn-update", "economy"],
        createdAt: "2026-04-20T08:30:00.000Z",
        commentCount: 0,
        likeCount: 0
      },
      {
        title: "Volvo recalls 48,000 hybrid SUVs across Europe over battery fire risk",
        content: [
          "Article detail:",
          "Volvo is recalling 48,000 hybrid SUVs across Europe after identifying a battery defect linked to overheating and potential fire risk.",
          "",
          "What happened:",
          "Volvo launched a Europe-wide recall on affected hybrid SUV model years.",
          "",
          "Key detail:",
          "The issue affects battery modules supplied into selected XC60 and XC90 hybrid ranges.",
          "",
          "Why this matters:",
          "This matters for fleet confidence, brand trust, aftersales cost, and operational planning.",
          "",
          "Who this affects:",
          "Retail operators, fleet buyers, and automotive suppliers.",
          "",
          "BCN view:",
          "Strong signal when safety issues start changing trust, cost, and commercial execution.",
          "",
          "What to watch next:",
          "Watch whether the recall expands into more markets or deeper supplier scrutiny.",
          "",
          "Source:",
          "Reuters - https://example.com/recall"
        ].join("\n"),
        tags: ["bcn-update", "operations", "retail"],
        createdAt: "2026-04-20T07:00:00.000Z",
        commentCount: 3,
        likeCount: 2
      }
    ]);

    expect(sorted[0]?.title).toContain("Volvo recalls 48,000 hybrid SUVs");
  });

  it("returns a useful freshness label for cards", () => {
    expect(typeof getBcnFreshnessLabel("2026-04-20T08:00:00.000Z")).toBe("string");
  });
});
