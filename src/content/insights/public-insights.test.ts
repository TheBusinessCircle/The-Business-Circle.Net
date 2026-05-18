import { describe, expect, it } from "vitest";
import { PUBLIC_INSIGHTS } from "@/content/insights/public-insights";

const CURRENT_BANK_START = "2026-05-16";
const HISTORIC_START = "2026-04-10";
const HISTORIC_END = "2026-05-15";

describe("public insight bank", () => {
  it("keeps historic backlog slugs unique", () => {
    const slugs = PUBLIC_INSIGHTS.map((insight) => insight.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("adds a realistic historic bank before the current scheduled cadence", () => {
    const historicInsights = PUBLIC_INSIGHTS.filter(
      (insight) => insight.publishedAt < CURRENT_BANK_START
    );

    expect(historicInsights).toHaveLength(36);
    expect(historicInsights[0]?.publishedAt).toBe(HISTORIC_START);
    expect(historicInsights.at(-1)?.publishedAt).toBe(HISTORIC_END);
    expect(
      PUBLIC_INSIGHTS.filter((insight) => insight.publishedAt >= CURRENT_BANK_START).length
    ).toBeGreaterThan(0);
  });

  it("links historic insights into conversion and authority routes", () => {
    const historicInsights = PUBLIC_INSIGHTS.filter(
      (insight) => insight.publishedAt < CURRENT_BANK_START
    );
    const historicHrefs = Array.from(new Set(
      historicInsights.flatMap((insight) => insight.internalLinks.map((link) => link.href))
    ));

    expect(historicHrefs).toEqual(
      expect.arrayContaining([
        "/membership",
        "/audit",
        "/founder",
        "/business-owner-network-uk",
        "/founder-community-uk",
        "/insights"
      ])
    );
    expect(
      historicInsights.some((insight) =>
        insight.internalLinks.some((link) => link.href.startsWith("/insights/"))
      )
    ).toBe(true);
  });
});
