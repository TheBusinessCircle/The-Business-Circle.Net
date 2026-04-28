import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/public/membership-guided-selector.tsx"),
  "utf8"
);

describe("membership guided selector structure", () => {
  it("keeps one semantic selected-tier detail panel", () => {
    const selectedPanelUsages = source.match(/<SelectedPathPanel\b/g) ?? [];
    expect(selectedPanelUsages).toHaveLength(1);
    expect(source).not.toContain("lg:hidden");
  });

  it("keeps all three membership rooms in the selector", () => {
    expect(source).toContain("title: \"Foundation\"");
    expect(source).toContain("title: \"Inner Circle\"");
    expect(source).toContain("title: \"Core\"");
  });

  it("keeps the selected room carrying into account setup", () => {
    expect(source).toContain("buildJoinConfirmationHref");
    expect(source).toContain("Secure Stripe checkout is next");
    expect(source).toContain("Access only opens after payment is confirmed");
  });
});
