import { describe, expect, it } from "vitest";
import {
  buildBcnCuratedCandidate,
  parseCommunityCurationSource
} from "@/lib/community-curation";

describe("community curation parsing and formatting", () => {
  it("parses JSON feed items into normalized source rows", () => {
    const payload = JSON.stringify({
      items: [
        {
          id: "item-1",
          title: "AI workflow changes are reshaping service delivery",
          summary: "Operators are redesigning internal processes around automation and team capacity.",
          url: "https://example.com/ai-workflows",
          publishedAt: "2026-04-18T10:00:00.000Z"
        }
      ]
    });

    expect(parseCommunityCurationSource(payload)).toEqual([
      {
        sourceId: "item-1",
        title: "AI workflow changes are reshaping service delivery",
        summary: "Operators are redesigning internal processes around automation and team capacity.",
        content: "Operators are redesigning internal processes around automation and team capacity.",
        url: "https://example.com/ai-workflows",
        publishedAt: "2026-04-18T10:00:00.000Z"
      }
    ]);
  });

  it("formats relevant items into BCN-structured community posts", () => {
    const candidate = buildBcnCuratedCandidate(
      {
        sourceId: "item-2",
        title: "Founders are tightening pricing and delivery after margin pressure",
        summary:
          "Businesses are revisiting pricing, operations, and customer positioning as margins tighten. Teams are simplifying delivery and reducing waste.",
        content:
          "Businesses are revisiting pricing, operations, and customer positioning as margins tighten. Teams are simplifying delivery and reducing waste.",
        url: "https://example.com/margin-pressure",
        publishedAt: "2026-04-18T09:00:00.000Z"
      },
      "BCN Source"
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.content).toContain("Why this matters for BCN members:");
    expect(candidate?.content).toContain("Key takeaways:");
    expect(candidate?.content).toContain("Source:");
    expect(candidate?.tags).toEqual(
      expect.arrayContaining(["bcn-update", "curated", "strategy", "growth", "operations"])
    );
  });

  it("skips items that are not relevant to business discussion", () => {
    const candidate = buildBcnCuratedCandidate(
      {
        sourceId: "item-3",
        title: "Celebrity football transfer gossip dominates the weekend",
        summary: "Fans are reacting to the latest entertainment headlines and transfer rumours.",
        content: "Fans are reacting to the latest entertainment headlines and transfer rumours.",
        url: "https://example.com/gossip",
        publishedAt: "2026-04-18T08:00:00.000Z"
      },
      "BCN Source"
    );

    expect(candidate).toBeNull();
  });
});
