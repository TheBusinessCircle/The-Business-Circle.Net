import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync("src/components/circle-card/circle-studio.tsx", "utf8");
const fineTuneSource = readFileSync(
  "src/components/circle-card/circle-studio-fine-tune.tsx",
  "utf8"
);
const actionSource = readFileSync("src/actions/circle-card.actions.ts", "utf8");

describe("Circle Studio guarded fine tuning", () => {
  it("keeps fine tuning secondary to curated presets", () => {
    expect(studioSource.indexOf("Personality presets")).toBeLessThan(
      studioSource.indexOf("<CircleStudioFineTune")
    );
    expect(fineTuneSource).toContain("Fine-tune your style");
    expect(fineTuneSource).toContain("Use preset colours");
    expect(fineTuneSource).not.toContain("custom CSS");
  });

  it("supports image palettes and protected background uploads", () => {
    expect(fineTuneSource).toContain("Use colours from my profile image");
    expect(fineTuneSource).toContain("Use colours from my business logo");
    expect(fineTuneSource).toContain('uploadKind="background-image"');
    expect(fineTuneSource).toContain('min="62"');
    expect(fineTuneSource).toContain("fallbackPalette");
  });

  it("validates activation on both client and server", () => {
    expect(studioSource).toContain("disabled={fineTuneIssues.length > 0}");
    expect(actionSource).toContain("getCircleStudioFineTuneIssues(fineTune).length");
    expect(actionSource).toContain('redirectWithError(returnPath, "studio-pro-required")');
    expect(actionSource).toContain("themeMetadata: metadata as Prisma.InputJsonValue");
  });
});
