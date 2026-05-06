import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Circle Blueprint build history section", () => {
  it("adds the compact build history panel before the roadmap canvas", () => {
    const pageSource = readSource("src/app/(member)/blueprint/page.tsx");
    const buildHistorySource = readSource("src/components/blueprint/build-history-panel.tsx");

    expect(pageSource).toContain("<BuildHistoryPanel sections={blueprint.roadmapSections} />");
    expect(pageSource.indexOf("<BuildHistoryPanel")).toBeLessThan(
      pageSource.indexOf("<RoadmapCanvas")
    );
    expect(buildHistorySource).toContain("BUILD HISTORY");
    expect(buildHistorySource).toContain("From idea to now");
    expect(buildHistorySource).toContain("View build history");
    expect(buildHistorySource).toContain("Hide build history");
  });

  it("keeps the member build history collapsed behind a mobile-friendly summary control", () => {
    const buildHistorySource = readSource("src/components/blueprint/build-history-panel.tsx");

    expect(buildHistorySource).toContain("<details");
    expect(buildHistorySource).toContain("<summary");
    expect(buildHistorySource).toContain("[&::-webkit-details-marker]:hidden");
    expect(buildHistorySource).toContain("Completed roadmap history will appear here");
  });
});
