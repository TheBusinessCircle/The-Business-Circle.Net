import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
  CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE,
  CIRCLE_CARD_PLAN_DEFINITIONS
} from "@/lib/circle-card/plans";

describe("circle card plan boundaries", () => {
  it("defines Free as one personal card with the existing active featured-link limit", () => {
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.circleCards).toBe(1);
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.activeFeaturedLinks).toBe(
      CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT
    );
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.notFor).toContain("Staff cards");
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.notFor).toContain("Team analytics");
  });

  it("keeps Pro and Teams placeholders separate from Free", () => {
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.lockedFeatures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "advanced-analytics", status: "pro-later" }),
        expect.objectContaining({ id: "employee-cards", status: "coming-soon" })
      ])
    );
  });

  it("guides onboarding without forcing an upgrade", () => {
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.INDIVIDUAL.suggestedLabel).toBe(
      "Free or Pro Personal"
    );
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.FOUNDER.suggestedPlan).toBe("PRO");
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.TEAM.warning).toBe(
      "Free is for personal use. Teams is designed for companies, staff and shared contacts."
    );
  });
});
