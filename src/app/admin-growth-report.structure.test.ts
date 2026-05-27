import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin growth report structure", () => {
  it("renders the admin-only 12-hour report above the existing metric cards", () => {
    const page = readSource("src/app/(admin)/admin/growth-intelligence/page.tsx");

    expect(page).toContain("await requireAdmin()");
    expect(page).toContain("getCurrentGrowthReport()");
    expect(page).toContain("GrowthReportCard");
    expect(page).toContain("refreshGrowthReportNowAction");
    expect(page.indexOf("<GrowthReportCard")).toBeLessThan(
      page.indexOf("<GrowthIntelligenceSummaryCards")
    );
  });
});
