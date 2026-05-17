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
      "founder.finalCta",
      "founder.heroMobile",
      "founder.storyMobile",
      "founder.growthArchitectureMobile",
      "founder.auditMobile",
      "founder.proofMobile",
      "founder.finalCtaMobile"
    ]) {
      expect(source).toContain(`getVisualMediaPlacement("${key}")`);
    }

    expect(source).toContain("function FounderVisual");
    expect(source).toContain("mobilePlacement");
    expect(source).toContain("mobileImageUrl");
    expect(source).toContain("public-grid-overlay");
    expect(source).toContain("radial-gradient");
    expect(source).toContain("overflow-x-clip");
  });
});
