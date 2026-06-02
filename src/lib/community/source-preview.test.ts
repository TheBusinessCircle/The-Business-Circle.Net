import { describe, expect, it } from "vitest";
import {
  buildCommunitySourcePreviewPlaceholder,
  resolveCommunitySourcePreview
} from "@/lib/community/source-preview";

describe("community source preview media", () => {
  it("returns a premium fallback when image data is missing", () => {
    const preview = resolveCommunitySourcePreview({
      title: "Bank rate decision affects finance planning",
      sourceName: "Bank of England",
      sourceDomain: "bankofengland.co.uk"
    });

    expect(preview.kind).toBe("placeholder");
    expect(preview.url).toContain("data:image/svg+xml");
    expect(preview.alt).toBe(
      "Bank rate decision affects finance planning source preview unavailable"
    );
    expect(preview.alt).not.toMatch(/placeholder/i);
  });

  it("proxies external images so blocked hotlinks are not rendered directly", () => {
    const preview = resolveCommunitySourcePreview({
      title: "AI platforms change paid search workflows",
      previewImageUrl: "https://example.com/preview.jpg",
      sourceUrl: "https://example.com/story",
      sourceDomain: "example.com"
    });

    expect(preview.url).toBe(
      "/api/intelligence/preview-image?src=https%3A%2F%2Fexample.com%2Fpreview.jpg"
    );
  });

  it("can build fallback cards with category context for image failure swaps", () => {
    const fallback = buildCommunitySourcePreviewPlaceholder({
      title: "Companies House filing change affects directors",
      sourceName: "Companies House Updates",
      sourceDomain: "gov.uk",
      category: "Regulation"
    });

    expect(decodeURIComponent(fallback)).toContain("Regulation");
    expect(decodeURIComponent(fallback)).toContain("Companies House Updates");
  });
});

