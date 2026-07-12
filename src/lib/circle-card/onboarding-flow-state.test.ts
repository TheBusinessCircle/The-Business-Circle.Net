import { describe, expect, it } from "vitest";
import { stepAfterFirstCircleCardSave } from "@/lib/circle-card/onboarding-flow-state";

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
