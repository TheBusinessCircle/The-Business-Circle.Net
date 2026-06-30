import { describe, expect, it } from "vitest";
import { circleCardGalleryItemFormSchema } from "@/lib/circle-card/content-blocks";
import { circleCardLinkFormSchema } from "@/lib/circle-card/schema";

const cardId = "clx0000000000000000000001";

describe("Circle Card image form contract", () => {
  it("passes gallery imageUrl through validation", () => {
    const result = circleCardGalleryItemFormSchema.parse({
      cardId,
      galleryItemId: "",
      imageUrl: "/uploads/circle-card/gallery.png",
      title: "Finished work",
      description: "",
      category: "",
      isActive: "on"
    });

    expect(result.imageUrl).toBe("/uploads/circle-card/gallery.png");
  });

  it("blocks a gallery save with an empty imageUrl", () => {
    const result = circleCardGalleryItemFormSchema.safeParse({
      cardId,
      galleryItemId: "",
      imageUrl: "",
      title: "Finished work",
      description: "",
      category: "",
      isActive: "on"
    });

    expect(result.success).toBe(false);
  });

  it("preserves a featured-link imageUrl", () => {
    const result = circleCardLinkFormSchema.parse({
      cardId,
      linkId: "",
      type: "PORTFOLIO",
      label: "See my work",
      url: "https://example.com/portfolio",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/featured.webp",
      isActive: "on"
    });

    expect(result.imageUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/featured.webp"
    );
  });
});
