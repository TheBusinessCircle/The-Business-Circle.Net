import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const router = readFileSync(
  join(root, "src/components/circle-card/circle-card-section-router.tsx"),
  "utf8"
);

describe("Business Builder module launcher", () => {
  it("makes active modules actionable without foundation badges", () => {
    expect(dashboard).not.toContain("Foundation only");
    expect(dashboard).toContain('hash: "business-card-services"');
    expect(dashboard).toContain('hash: "business-card-gallery"');
    expect(dashboard).toContain('hash: "business-card-opening-hours"');
    expect(dashboard).toContain('hash: "business-card-reviews"');
    expect(dashboard).toContain("Add your first service");
    expect(dashboard).toContain("Add your first gallery image");
    expect(dashboard).toContain("Set your opening hours");
    expect(dashboard).toContain("Add first review");
    expect(dashboard).toContain("Manage Reviews");
    expect(dashboard).toContain("Reviews are included with Circle Card Pro.");
  });

  it("keeps future business modules visible and inactive", () => {
    expect(dashboard).toContain("Coming Soon");
    expect(dashboard).toContain("blockDefinitions.map");
    expect(dashboard).toContain('definition.family === "BUSINESS" && !definition.publicEditingEnabled');
  });

  it("opens module details and scrolls smoothly with reduced-motion safety", () => {
    expect(dashboard).toContain("data-circle-card-module-details");
    expect(router).toContain("moduleDetails.open = true");
    expect(router).toContain('behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"');
  });
});
