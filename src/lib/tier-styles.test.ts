import { describe, expect, it } from "vitest";
import { getMemberTierPresentation } from "@/lib/tier-styles";

describe("member tier presentation", () => {
  it("keeps Foundation profile treatment standard", () => {
    const presentation = getMemberTierPresentation("FOUNDATION");

    expect(presentation.label).toBe("Foundation");
    expect(presentation.shouldShowProfileSignal).toBe(false);
    expect(presentation.cardClassName).toContain("border-border");
    expect(presentation.badgeClassName).toBe("");
  });

  it("gives Inner Circle an elevated profile signal", () => {
    const presentation = getMemberTierPresentation("INNER_CIRCLE");

    expect(presentation.label).toBe("Inner Circle");
    expect(presentation.profileLabel).toBe("Inner Circle member");
    expect(presentation.shouldShowProfileSignal).toBe(true);
    expect(presentation.badgeClassName).toContain("violet");
    expect(presentation.avatarRingClassName).toContain("violet");
  });

  it("gives Core the strongest premium profile signal", () => {
    const presentation = getMemberTierPresentation("CORE");

    expect(presentation.label).toBe("Core");
    expect(presentation.profileLabel).toBe("Core member");
    expect(presentation.shouldShowProfileSignal).toBe(true);
    expect(presentation.description).toContain("Highest signal tier");
    expect(presentation.badgeClassName).toContain("gold");
    expect(presentation.avatarRingClassName).toContain("gold");
  });
});
