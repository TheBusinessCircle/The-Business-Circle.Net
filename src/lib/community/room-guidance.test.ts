import { describe, expect, it } from "vitest";
import { COMMUNITY_CHANNEL_BLUEPRINTS } from "@/config/community";
import {
  getCommunityRoomGuidance,
  listCommunityRoomGuidance
} from "@/lib/community/room-guidance";

describe("community room guidance", () => {
  it("provides guidance for every configured community channel", () => {
    for (const channel of COMMUNITY_CHANNEL_BLUEPRINTS) {
      const guidance = getCommunityRoomGuidance(channel.slug);

      expect(guidance, `missing guidance for ${channel.slug}`).not.toBeNull();
      expect(guidance?.title).toBeTruthy();
      expect(guidance?.shortIntro).toBeTruthy();
      expect(guidance?.whatThisRoomIsFor).toBeTruthy();
      expect(guidance?.howToPost.length).toBeGreaterThan(0);
      expect(guidance?.suggestedPrompts.length).toBeGreaterThan(0);
      expect(guidance?.examplePost).toBeTruthy();
      expect(guidance?.pinnedCtaLabel).toBeTruthy();
      expect(guidance?.emptyState.description).toBeTruthy();
    }
  });

  it("makes introductions the clear first member action", () => {
    const guidance = getCommunityRoomGuidance("introductions");

    expect(guidance?.title).toBe("Start Here: Introduce Yourself");
    expect(guidance?.pinnedCtaLabel).toBe("Introduce yourself");
    expect(guidance?.examplePost).toContain("Hi, I am [name]");
  });

  it("keeps guidance config code-backed and non-duplicating", () => {
    const guidance = listCommunityRoomGuidance();
    const slugs = guidance.map((item) => item.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("introductions");
    expect(slugs).toContain("premium-discussions");
  });
});
