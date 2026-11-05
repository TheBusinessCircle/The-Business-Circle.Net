import { describe, expect, it } from "vitest";
import { discoverAfterFirstCardTypeSelection, stepAfterFirstCircleCardSave } from "@/lib/circle-card/onboarding-flow-state";

describe("first Circle Card onboarding navigation", () => {
  it("advances a successful Step 1 save to Step 2", () => {
    expect(stepAfterFirstCircleCardSave(0, true)).toBe(1);
  });

  it("keeps the current step when the action fails", () => {
    expect(stepAfterFirstCircleCardSave(0, false)).toBe(0);
  });

  it("does not advance beyond the final step", () => {
    expect(stepAfterFirstCircleCardSave(2, true)).toBe(2);
  });
});

describe("Business Discover defaults", () => {
  it("enables Discover when Business is selected without a previous choice", () => {
    expect(discoverAfterFirstCardTypeSelection("BUSINESS", false, false)).toBe(true);
  });
  it.each(["PERSONAL", "CREATOR"] as const)("keeps %s hidden by default", (type) => {
    expect(discoverAfterFirstCardTypeSelection(type, false, false)).toBe(false);
  });
  it("preserves an explicit off choice when Business is selected again", () => {
    expect(discoverAfterFirstCardTypeSelection("BUSINESS", false, true)).toBe(false);
  });
  it("preserves an explicit on choice when changing card type", () => {
    expect(discoverAfterFirstCardTypeSelection("PERSONAL", true, true)).toBe(true);
  });
});
