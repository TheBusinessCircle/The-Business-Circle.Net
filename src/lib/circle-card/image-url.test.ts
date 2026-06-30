import { describe, expect, it } from "vitest";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";

describe("Circle Card image URL contract", () => {
  it.each([
    "/uploads/circle-card/member-gallery.png",
    "/uploads/profiles/member-avatar.jpg",
    "/uploads/links/featured-link.webp",
    "https://res.cloudinary.com/demo/image/upload/v1/card.png",
    "https://cdn.example.com/card.jpg?width=800"
  ])("accepts safe image URL %s", (value) => {
    expect(isSafeCircleCardImageUrl(value)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "http://example.com/image.png",
    "ftp://example.com/image.png",
    "/uploads/other/image.png",
    "/uploads/circle-card/../private.png",
    "https://user:password@example.com/image.png"
  ])("rejects unsafe image URL %s", (value) => {
    expect(isSafeCircleCardImageUrl(value)).toBe(false);
  });
});
