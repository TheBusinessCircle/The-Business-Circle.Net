import { describe, expect, it } from "vitest";
import {
  getBcnIntelligenceSourceRegistry,
  inferBcnCategories
} from "@/lib/bcn-intelligence-sources";

describe("BCN intelligence source registry", () => {
  it("loads more enabled sources than BBC", () => {
    const enabledSources = getBcnIntelligenceSourceRegistry().filter((source) => source.enabled);
    const bbcSources = enabledSources.filter((source) => source.domain.includes("bbc"));

    expect(enabledSources.length).toBeGreaterThan(bbcSources.length);
    expect(enabledSources.some((source) => source.name === "HMRC Updates")).toBe(true);
    expect(enabledSources.some((source) => source.name === "Bank of England News")).toBe(true);
  });

  it("keeps restricted or unreliable sources disabled by default", () => {
    const sources = getBcnIntelligenceSourceRegistry();

    expect(sources.find((source) => source.id === "financial-times-manual")).toMatchObject({
      enabled: false,
      type: "MANUAL"
    });
    expect(sources.find((source) => source.id === "ons-updates")).toMatchObject({
      enabled: false,
      type: "MANUAL"
    });
  });

  it("maps business-owner categories from source metadata and keywords", () => {
    expect(
      inferBcnCategories({
        title: "HMRC confirms VAT reporting change for sole traders",
        summary: "Making Tax Digital changes the timing and reporting work for small businesses."
      })[0]
    ).toBe("Tax");

    expect(
      inferBcnCategories({
        title: "Microsoft Copilot automation changes enterprise workflows",
        summary: "AI tools are reshaping team productivity and software adoption."
      })[0]
    ).toBe("AI");
  });
});

