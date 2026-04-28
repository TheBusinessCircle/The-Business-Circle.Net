import { describe, expect, it } from "vitest";
import { resolveVisualPlacementAltText } from "@/components/visual-media/visual-placement";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";

function placement(
  overrides: Partial<VisualMediaRenderablePlacement> = {}
): VisualMediaRenderablePlacement {
  return {
    key: "membership.hero",
    label: "Test",
    variant: "HERO",
    imageUrl: "https://example.com/image.jpg",
    mobileImageUrl: null,
    altText: null,
    isActive: true,
    overlayStyle: "SOFT_DARK",
    objectPosition: null,
    focalPointX: null,
    focalPointY: null,
    supportsMobile: false,
    recommendedAspectRatio: "16:9",
    ...overrides
  };
}

describe("visual media alt text", () => {
  it("keeps decorative placements silent", () => {
    expect(resolveVisualPlacementAltText(placement({ altText: "Specific alt" }), true)).toBe("");
  });

  it("uses specific admin alt text when it is useful", () => {
    expect(
      resolveVisualPlacementAltText(
        placement({ altText: "Business owners collaborating inside a private room" }),
        false
      )
    ).toBe("Business owners collaborating inside a private room");
  });

  it("does not expose placeholder alt text publicly", () => {
    expect(resolveVisualPlacementAltText(placement({ altText: "Image: Test" }), false)).toBe(
      "The Business Circle Network membership room preview"
    );
  });
});
