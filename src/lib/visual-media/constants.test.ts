import { describe, expect, it } from "vitest";
import {
  VISUAL_MEDIA_PLACEMENT_KEYS,
  VISUAL_MEDIA_PLACEMENT_LIST,
  VISUAL_MEDIA_PLACEMENTS,
  isVisualMediaPlacementKey
} from "@/lib/visual-media/constants";

describe("visual media placement registry", () => {
  it("keeps placement keys unique", () => {
    expect(new Set(VISUAL_MEDIA_PLACEMENT_KEYS).size).toBe(VISUAL_MEDIA_PLACEMENT_KEYS.length);
  });

  it("includes the key placements needed for the public site rollout", () => {
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_HERO.key).toBe("home.hero");
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_PLATFORM.key).toBe("home.section.platform");
    expect(VISUAL_MEDIA_PLACEMENTS.MEMBERSHIP_FOUNDERS.key).toBe(
      "membership.section.founders"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.INTELLIGENCE_HERO.key).toBe("intelligence.hero");
    expect(VISUAL_MEDIA_PLACEMENTS.SERVICES_APPROACH.key).toBe(
      "services.section.approach"
    );
  });

  it("recognizes only approved placement keys", () => {
    expect(isVisualMediaPlacementKey("home.hero")).toBe(true);
    expect(isVisualMediaPlacementKey("membership.section.rooms")).toBe(true);
    expect(isVisualMediaPlacementKey("unknown.hero.primary")).toBe(false);
  });

  it("requires positive, intentional sort ordering", () => {
    expect(VISUAL_MEDIA_PLACEMENT_LIST.every((item) => item.sortOrder > 0)).toBe(true);
  });
});
