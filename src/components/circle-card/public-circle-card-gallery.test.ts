import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicCircleCardGallery } from "@/components/circle-card/public-circle-card-gallery";
import type { CircleCardGalleryItem } from "@/lib/circle-card/content-blocks";

const localItem: CircleCardGalleryItem = {
  id: "local-work",
  imageUrl: "/uploads/circle-card/local.png",
  title: "Local portfolio work",
  description: null,
  category: null,
  isActive: true,
  sortOrder: 0
};

function renderGallery(items: CircleCardGalleryItem[]) {
  return renderToStaticMarkup(createElement(PublicCircleCardGallery, { items }));
}

describe("public Circle Card gallery", () => {
  it("renders active managed local images as lazy-loaded cards", () => {
    const markup = renderGallery([localItem]);

    expect(markup).toContain("Selected work");
    expect(markup).toContain('src="/uploads/circle-card/local.png"');
    expect(markup).toContain('alt="Local portfolio work"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).not.toContain("invisible");
  });

  it("renders active Cloudinary images", () => {
    const markup = renderGallery([{
      ...localItem,
      id: "cloudinary-work",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/work.png"
    }]);

    expect(markup).toContain("https://res.cloudinary.com/demo/image/upload/v1/work.png");
  });

  it("hides the section when no valid active items remain", () => {
    expect(renderGallery([])).toBe("");
    expect(renderGallery([{ ...localItem, imageUrl: "" }])).toBe("");
    expect(renderGallery([{ ...localItem, isActive: false }])).toBe("");
  });
});
