import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("member tier value pages and profile signals", () => {
  it("upgrades the Inner Circle page positioning and upgrade path", () => {
    const source = readSource("src/app/(member)/inner-circle/page.tsx");

    expect(source).toContain("Move from access to momentum.");
    expect(source).toContain("What changes at Inner Circle");
    expect(source).toContain("Why upgrade from Foundation?");
    expect(source).toContain("Enhanced profile tier badge");
    expect(source).toContain("/membership?tier=inner-circle");
  });

  it("adds the Core page as the highest signal tier", () => {
    const source = readSource("src/app/(member)/core/page.tsx");

    expect(source).toContain("The highest-signal room inside The Business Circle.");
    expect(source).toContain("What changes at Core");
    expect(source).toContain("Why Core is different");
    expect(source).toContain("Core profile tier badge and premium profile styling");
    expect(source).toContain("/membership?tier=core");
  });

  it("shows tier presentation in member profile cards and profile views", () => {
    const card = readSource("src/components/profile/member-profile-card.tsx");
    const profile = readSource("src/components/profile/public-member-profile-view.tsx");

    expect(card).toContain("getMemberTierPresentation");
    expect(card).toContain("tierPresentation.profileLabel");
    expect(card).toContain("tierPresentation.shouldShowProfileSignal");
    expect(profile).toContain("getMemberTierPresentation");
    expect(profile).toContain("tierPresentation.profileLabel");
    expect(profile).toContain("tierPresentation.shouldShowProfileSignal");
  });
});
