import { describe, expect, it } from "vitest";
import {
  readCircleCardServices,
  resolveCircleCardServicesBuilderMode,
  visibleCircleCardServices,
  writeCircleCardServices,
  type CircleCardServiceItem
} from "@/lib/circle-card/content-blocks";

const activeService: CircleCardServiceItem = {
  id: "service-active",
  title: "Strategy session",
  description: "A focused session for clearer priorities.",
  startingPrice: "From £250",
  imageUrl: null,
  ctaLabel: "Enquire",
  ctaUrl: "https://example.com/contact",
  isActive: true,
  sortOrder: 0
};

const hiddenService: CircleCardServiceItem = {
  ...activeService,
  id: "service-hidden",
  title: "Hidden service",
  isActive: false,
  sortOrder: 1
};

describe("Circle Card services content block", () => {
  it("shows the enabled builder only for an entitled Business Card", () => {
    expect(resolveCircleCardServicesBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardServicesBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
  });

  it("shows Free Business Card owners the locked Pro preview", () => {
    expect(resolveCircleCardServicesBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
  });

  it("allows the Platform Owner Business preview without attaching services to a Personal Card", () => {
    expect(resolveCircleCardServicesBuilderMode({
      cardType: "PERSONAL",
      hasProAccess: true,
      isPlatformOwner: true,
      platformPreviewCardType: "business"
    })).toBe("preview");
  });

  it("returns only active services for a public Business Card", () => {
    const contentBlocks = writeCircleCardServices({}, [activeService, hiddenService]);

    expect(visibleCircleCardServices({ cardType: "BUSINESS", contentBlocks })).toEqual([activeService]);
    expect(readCircleCardServices(contentBlocks)).toHaveLength(2);
  });

  it("never exposes services on a Personal Card", () => {
    const contentBlocks = writeCircleCardServices({}, [activeService]);

    expect(visibleCircleCardServices({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
  });

  it("preserves unrelated content blocks when services are written", () => {
    const contentBlocks = writeCircleCardServices({
      creator: { CURRENT_OFFER: { title: "Existing offer" } },
      business: { PRODUCTS: { items: [{ id: "product-1" }] } }
    }, [activeService]);

    expect(contentBlocks.creator).toEqual({ CURRENT_OFFER: { title: "Existing offer" } });
    expect(contentBlocks.business).toMatchObject({ PRODUCTS: { items: [{ id: "product-1" }] } });
  });
});
