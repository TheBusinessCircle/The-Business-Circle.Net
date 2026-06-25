import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Circle Card first-card creation UX", () => {
  it("shows a simplified first-card creation flow separate from the full edit flow", () => {
    const dashboard = readSource("src/app/(member)/dashboard/circle-card/page.tsx");

    expect(dashboard).toContain("isFirstCardCreateFlow");
    expect(dashboard).toContain("Under 30 seconds");
    expect(dashboard).toContain("Optional setup comes next");
    expect(dashboard).toContain("Create Circle Card");
    expect(dashboard).toContain("Save Circle Card");
  });

  it("keeps slug guidance, validation messaging and success confirmation visible", () => {
    const dashboard = readSource("src/app/(member)/dashboard/circle-card/page.tsx");
    const action = readSource("src/actions/circle-card.actions.ts");

    expect(dashboard).toContain("first-card-slug");
    expect(dashboard).toContain("That public link is already taken");
    expect(dashboard).toContain("Your Circle Card has been created");
    expect(action).toContain("created=1#circle-card-created");
  });

  it("adds mobile sticky save and local draft protection for first-card creation", () => {
    const dashboard = readSource("src/app/(member)/dashboard/circle-card/page.tsx");
    const helper = readSource("src/components/circle-card/circle-card-first-card-form-helper.tsx");

    expect(dashboard).toContain("sticky bottom-2");
    expect(dashboard).toContain("CircleCardFirstCardFormHelper");
    expect(helper).toContain("window.localStorage.setItem");
    expect(helper).toContain("scrollIntoView");
    expect(helper).toContain("slugifyDraftValue");
  });
});
