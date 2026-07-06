import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeCircleCardCurrentCardId } from "@/lib/circle-card/current-card-preference";

const selectorSource = readFileSync(
  "src/components/circle-card/circle-card-current-card-selector.tsx",
  "utf8"
);
const dashboardSource = readFileSync(
  "src/app/(member)/dashboard/circle-card/page.tsx",
  "utf8"
);
const studioSource = readFileSync(
  "src/components/circle-card/circle-studio.tsx",
  "utf8"
);

describe("Circle Card current workspace selection", () => {
  it("accepts only bounded opaque card identifiers", () => {
    expect(normalizeCircleCardCurrentCardId("card_123-abc")).toBe("card_123-abc");
    expect(normalizeCircleCardCurrentCardId("../../private")).toBeNull();
    expect(normalizeCircleCardCurrentCardId("x".repeat(129))).toBeNull();
  });

  it("persists selection without a page reload", () => {
    expect(selectorSource).toContain("persistCircleCardCurrentCardPreference");
    expect(selectorSource).toContain("router.replace");
    expect(selectorSource).not.toContain("window.location.assign");
    expect(selectorSource).not.toContain("window.location.replace");
    expect(studioSource).toContain("persistCircleCardCurrentCardPreference(card.id)");
  });

  it("keeps workspace preference separate from the default public card", () => {
    expect(dashboardSource).toContain("selectedExistingCard ?? persistedCard ?? defaultCard");
    expect(dashboardSource).toContain("candidate.id === persistedCardId && candidate.isPublished");
    expect(dashboardSource).toContain("candidate.isPublished && (candidate.isDefaultCard || candidate.isPrimary)");
    expect(selectorSource).toContain("Default Public Card");
    expect(selectorSource).toContain("explicitCard?.isLive");
  });
});
