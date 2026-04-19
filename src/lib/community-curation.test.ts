import { describe, expect, it } from "vitest";
import {
  buildBcnCuratedCandidate,
  parseCommunityCurationSource
} from "@/lib/community-curation";

describe("community curation parsing and formatting", () => {
  it("parses XML RSS items into normalized source rows", () => {
    const payload = `
      <rss>
        <channel>
          <title>World Business Feed</title>
          <item>
            <guid>item-xml-1</guid>
            <title>Retail operators rethink staffing as consumer demand shifts</title>
            <description><![CDATA[Retail businesses are adjusting staffing, inventory, and store planning as demand patterns move.]]></description>
            <link>https://example.com/retail-demand?utm_source=rss</link>
            <pubDate>Fri, 18 Apr 2026 10:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    expect(parseCommunityCurationSource(payload)).toEqual([
      {
        sourceId: "item-xml-1",
        title: "Retail operators rethink staffing as consumer demand shifts",
        summary:
          "Retail businesses are adjusting staffing, inventory, and store planning as demand patterns move.",
        content:
          "Retail businesses are adjusting staffing, inventory, and store planning as demand patterns move.",
        url: "https://example.com/retail-demand",
        sourceName: "World Business Feed",
        publishedAt: "2026-04-18T10:00:00.000Z"
      }
    ]);
  });

  it("parses Atom entries even when guid is missing and the link uses an href attribute", () => {
    const payload = `
      <feed>
        <title>Global Business Feed</title>
        <entry>
          <title>Regulators tighten AI disclosure expectations for enterprise vendors</title>
          <summary>Software providers are adjusting product messaging and compliance workflows as disclosure rules tighten.</summary>
          <link rel="alternate" href="https://example.com/ai-regulation?utm_medium=rss" />
          <updated>2026-04-18T11:30:00Z</updated>
        </entry>
      </feed>
    `;

    const items = parseCommunityCurationSource(payload);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Regulators tighten AI disclosure expectations for enterprise vendors",
      url: "https://example.com/ai-regulation",
      sourceName: "Global Business Feed",
      publishedAt: "2026-04-18T11:30:00.000Z"
    });
    expect(items[0]?.sourceId).toContain("Global Business Feed");
  });

  it("parses JSON feed items into normalized source rows", () => {
    const payload = JSON.stringify({
      items: [
        {
          id: "item-json-1",
          title: "AI workflow changes are reshaping service delivery",
          summary:
            "Operators are redesigning internal processes around automation and team capacity.",
          url: "https://example.com/ai-workflows",
          publishedAt: "2026-04-18T10:00:00.000Z",
          source: {
            name: "Business Desk"
          }
        }
      ]
    });

    expect(parseCommunityCurationSource(payload)).toEqual([
      {
        sourceId: "item-json-1",
        title: "AI workflow changes are reshaping service delivery",
        summary:
          "Operators are redesigning internal processes around automation and team capacity.",
        content:
          "Operators are redesigning internal processes around automation and team capacity.",
        url: "https://example.com/ai-workflows",
        sourceName: "Business Desk",
        publishedAt: "2026-04-18T10:00:00.000Z"
      }
    ]);
  });

  it("formats relevant items into BCN-style update posts", () => {
    const candidate = buildBcnCuratedCandidate(
      {
        sourceId: "item-2",
        title: "Founders are tightening pricing and delivery after margin pressure",
        summary:
          "Businesses are revisiting pricing, operations, and customer positioning as margins tighten. Teams are simplifying delivery and reducing waste.",
        content:
          "Businesses are revisiting pricing, operations, and customer positioning as margins tighten. Teams are simplifying delivery and reducing waste.",
        url: "https://example.com/margin-pressure",
        sourceName: "Reuters",
        publishedAt: "2026-04-18T09:00:00.000Z"
      },
      "BCN Source"
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.content).toContain("What happened:");
    expect(candidate?.content).toContain("Why this matters:");
    expect(candidate?.content).toContain("Who this affects:");
    expect(candidate?.content).toContain("BCN angle:");
    expect(candidate?.content).toContain("Source:");
    expect(candidate?.content).toContain("Reuters - https://example.com/margin-pressure");
    expect(candidate?.tags).toEqual(
      expect.arrayContaining(["bcn-update", "curated", "growth", "operations", "finance"])
    );
  });

  it("skips weak or off-topic items that are not useful for BCN discussion", () => {
    const celebrityItem = buildBcnCuratedCandidate(
      {
        sourceId: "item-3",
        title: "Celebrity football transfer gossip dominates the weekend",
        summary: "Fans are reacting to the latest entertainment headlines and transfer rumours.",
        content: "Fans are reacting to the latest entertainment headlines and transfer rumours.",
        url: "https://example.com/gossip",
        sourceName: "Example Feed",
        publishedAt: "2026-04-18T08:00:00.000Z"
      },
      "BCN Source"
    );

    const thinBusinessItem = buildBcnCuratedCandidate(
      {
        sourceId: "item-4",
        title: "Markets move",
        summary: "Stocks moved.",
        content: "Stocks moved.",
        url: "https://example.com/markets",
        sourceName: "Example Feed",
        publishedAt: "2026-04-18T08:00:00.000Z"
      },
      "BCN Source"
    );

    expect(celebrityItem).toBeNull();
    expect(thinBusinessItem).toBeNull();
  });
});
