import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Circle Card public visibility", () => {
  it("keeps the public switcher compact and hidden for a single live card", () => {
    const profile = readSource(
      "src/components/circle-card/public-circle-card-profile.tsx"
    );

    expect(profile).toContain("card.ownerCards.length <= 1");
    expect(profile).toContain("mt-3 flex flex-wrap items-center gap-2");
    expect(profile).toContain("inline-flex min-h-11");
    expect(profile).not.toContain("Choose a Circle Card");
  });

  it("filters public cards by owner, publication, archive and account availability", () => {
    const service = readSource("src/server/circle-card/public-card.service.ts");

    expect(service).toContain("userId: card.userId");
    expect(service).toContain("isPublished: true");
    expect(service).toContain("archivedAt: null");
    expect(service).toContain("suspended: false");
  });

  it("keeps hidden-card controls and default-card safeguards in the dashboard", () => {
    const action = readSource("src/actions/circle-card.actions.ts");
    const dashboard = readSource("src/app/(member)/dashboard/circle-card/page.tsx");
    const control = readSource(
      "src/components/circle-card/circle-card-visibility-control.tsx"
    );

    expect(action).toContain("setCircleCardVisibilityAction");
    expect(action).toContain('redirectWithError(returnPath, "card-hidden-default")');
    expect(action).toContain("nextDefaultCard");
    expect(dashboard).toContain('label: "Hidden"');
    expect(dashboard).toContain(
      "isOnlyLiveCard={ownedCard.isPublished && liveCardCount === 1}"
    );
    expect(dashboard).toContain(
      "disabled={ownedCard.isDefaultCard || !ownedCard.isPublished}"
    );
    expect(control).toContain("Set Live");
    expect(control).toContain("Hide Card");
    expect(control).toContain("This is your only live Circle Card.");
  });
});
