import { describe, expect, it } from "vitest";
import { buildFirstThreeMovesActivation } from "@/lib/community/first-three-moves";

describe("first three moves activation", () => {
  it("builds the first member actions in the intended order", () => {
    const activation = buildFirstThreeMovesActivation({
      hasIntroduced: false,
      hasStartedUsefulPost: false,
      hasSupportedAnotherMember: false
    });

    expect(activation.steps.map((step) => step.title)).toEqual([
      "Introduce yourself",
      "Start one useful conversation",
      "Look for one person to support"
    ]);
    expect(activation.completedCount).toBe(0);
    expect(activation.isComplete).toBe(false);
    expect(activation.weeklyPrompt).toContain("make clearer");
  });

  it("uses first-party completion signals without requiring new schema state", () => {
    const activation = buildFirstThreeMovesActivation({
      hasIntroduced: true,
      hasStartedUsefulPost: false,
      hasSupportedAnotherMember: true,
      exploreHref: "/community/post/post_1"
    });

    expect(activation.completedCount).toBe(2);
    expect(activation.isComplete).toBe(false);
    expect(activation.steps[0]?.complete).toBe(true);
    expect(activation.steps[1]?.complete).toBe(false);
    expect(activation.steps[2]?.href).toBe("/community/post/post_1");
  });
});
