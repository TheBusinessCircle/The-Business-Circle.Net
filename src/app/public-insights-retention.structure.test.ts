import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const insightsHub = readFileSync(
  join(process.cwd(), "src/app/(public)/insights/page.tsx"),
  "utf8"
);
const insightArticle = readFileSync(
  join(process.cwd(), "src/app/(public)/insights/[slug]/page.tsx"),
  "utf8"
);
const homePage = readFileSync(join(process.cwd(), "src/app/(public)/home/page.tsx"), "utf8");

describe("public insights retention structure", () => {
  it("turns the insights hub into a return path, not only a list", () => {
    expect(insightsHub).toContain("Today&apos;s Owner Signal");
    expect(insightsHub).toContain("Most useful for owners right now");
    expect(insightsHub).toContain("Founder clarity");
    expect(insightsHub).toContain("AI Search / GEO");
    expect(insightsHub).toContain("Website trust / CRO");
    expect(insightsHub).toContain("Business owner reality");
    expect(insightsHub).toContain('dynamic = "force-static"');
  });

  it("adds public article conversion and reflection sections", () => {
    expect(insightArticle).toContain("What this means for your business");
    expect(insightArticle).toContain("Questions to ask yourself");
    expect(insightArticle).toContain("Where BCN helps with this");
    expect(insightArticle).toContain("buildFaqSchema");
    expect(insightArticle).toContain("generateStaticParams");
  });

  it("surfaces the public return loop on the homepage", () => {
    expect(homePage).toContain("What BCN is noticing before people join.");
    expect(homePage).toContain("New insight is added daily");
    expect(homePage).toContain("Open insights hub");
  });
});
