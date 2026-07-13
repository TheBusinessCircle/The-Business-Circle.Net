import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_CAPABILITY_MAP,
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

  it("keeps launched Pro capabilities and deferred Teams capabilities separate from Free", () => {
    expect(CIRCLE_CARD_PLAN_DEFINITIONS.FREE.lockedFeatures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "circle-studio", status: "included" }),
        expect.objectContaining({ id: "staff-cards", status: "coming-soon" })
      ])
    );
  });

  it("defines central capability maps for Free, Pro and Teams", () => {
    expect(CIRCLE_CARD_CAPABILITY_MAP.FREE.relationshipPositioning).toBe(
      "Start building relationships."
    );
    expect(CIRCLE_CARD_CAPABILITY_MAP.PRO.unlocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "twenty-five-featured-links" }),
        expect.objectContaining({ id: "lead-capture-tools" })
      ])
    );
    expect(CIRCLE_CARD_CAPABILITY_MAP.TEAMS.unlocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "staff-cards" }),
        expect.objectContaining({ id: "shared-company-wallet" })
      ])
    );
  });

  it("guides onboarding without forcing an upgrade", () => {
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.INDIVIDUAL.suggestedLabel).toBe("Free");
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.FOUNDER.suggestedPlan).toBe("PRO");
    expect(CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE.TEAM.warning).toBe(
      "Free is for personal use. Teams is designed for companies, staff cards and shared relationship visibility."
    );
  });
});
