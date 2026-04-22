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
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_HERO_PRIMARY.key).toBe("home.hero.primary");
    expect(VISUAL_MEDIA_PLACEMENTS.MEMBERSHIP_HERO_PRIMARY.key).toBe("membership.hero.primary");
    expect(VISUAL_MEDIA_PLACEMENTS.JOIN_HERO_PRIMARY.key).toBe("join.hero.primary");
  });

  it("recognizes only approved placement keys", () => {
    expect(isVisualMediaPlacementKey("home.hero.primary")).toBe(true);
    expect(isVisualMediaPlacementKey("unknown.hero.primary")).toBe(false);
  });

  it("requires positive, intentional sort ordering", () => {
    expect(VISUAL_MEDIA_PLACEMENT_LIST.every((item) => item.sortOrder > 0)).toBe(true);
  });
});
