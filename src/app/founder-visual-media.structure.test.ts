import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("founder visual media placement wiring", () => {
  it("renders the founder page from managed visual media slots with fallback shells", () => {
    const source = readSource("src/app/(public)/founder/page.tsx");

    for (const key of [
      "founder.hero",
      "founder.story",
      "founder.growthArchitecture",
      "founder.audit",
      "founder.proof",
      "founder.finalCta"
    ]) {
      expect(source).toContain(`getVisualMediaPlacement("${key}")`);
    }

    expect(source).toContain("function FounderVisual");
    expect(source).toContain("public-grid-overlay");
    expect(source).toContain("radial-gradient");
  });
});
