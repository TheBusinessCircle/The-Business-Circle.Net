import { describe, expect, it } from "vitest";
import {
  circleCardOpeningHoursDayLabel,
  createCircleCardOpeningHoursPreset,
  readCircleCardGalleryItems,
  readCircleCardServices,
  resolveCircleCardGalleryBuilderMode,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardServicesBuilderMode,
  visibleCircleCardOpeningHours,
  visibleCircleCardGalleryItems,
  visibleCircleCardServices,
  writeCircleCardOpeningHours,
  writeCircleCardGalleryItems,
  writeCircleCardServices,
  type CircleCardGalleryItem,
  type CircleCardServiceItem
} from "@/lib/circle-card/content-blocks";

const activeGalleryItem: CircleCardGalleryItem = {
  id: "gallery-active",
  imageUrl: "/uploads/circle-card/work.jpg",
  title: "Completed project",
  description: "A finished client project.",
  category: "Branding",
  isActive: true,
  sortOrder: 0
};

const hiddenGalleryItem: CircleCardGalleryItem = {
  ...activeGalleryItem,
  id: "gallery-hidden",
  title: "Hidden project",
  isActive: false,
  sortOrder: 1
};

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

describe("Circle Card opening hours content block", () => {
  const weekdayHours = createCircleCardOpeningHoursPreset("weekdays-9-5");

  it("shows the builder only for an entitled Business Card", () => {
    expect(resolveCircleCardOpeningHoursBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardOpeningHoursBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
  });

  it("shows Free Business Card owners the locked Pro preview", () => {
    expect(resolveCircleCardOpeningHoursBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
  });

  it("returns saved opening hours for a public Business Card", () => {
    const contentBlocks = writeCircleCardOpeningHours({}, weekdayHours);

    expect(visibleCircleCardOpeningHours({ cardType: "BUSINESS", contentBlocks })).toEqual(weekdayHours);
  });

  it("never exposes opening hours on a Personal Card", () => {
    const contentBlocks = writeCircleCardOpeningHours({}, weekdayHours);

    expect(visibleCircleCardOpeningHours({ cardType: "PERSONAL", contentBlocks })).toBeNull();
  });

  it("labels closed days clearly", () => {
    expect(circleCardOpeningHoursDayLabel(weekdayHours.days.saturday)).toBe("Closed");
    expect(circleCardOpeningHoursDayLabel(weekdayHours.days.monday)).toBe("09:00 – 17:00");
  });

  it("preserves Services when opening hours are written", () => {
    const withServices = writeCircleCardServices({}, [activeService]);
    const contentBlocks = writeCircleCardOpeningHours(withServices, weekdayHours);

    expect(readCircleCardServices(contentBlocks)).toEqual([activeService]);
  });
});

describe("Circle Card gallery content block", () => {
  it("enables the gallery builder for entitled Business Cards only", () => {
    expect(resolveCircleCardGalleryBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardGalleryBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardGalleryBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("shows the Pro lock for a Free Business Card", () => {
    expect(resolveCircleCardGalleryBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
  });

  it("exposes active gallery items only on public Business Cards", () => {
    const contentBlocks = writeCircleCardGalleryItems({}, [activeGalleryItem, hiddenGalleryItem]);

    expect(visibleCircleCardGalleryItems({ cardType: "BUSINESS", contentBlocks })).toEqual([activeGalleryItem]);
    expect(visibleCircleCardGalleryItems({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
    expect(visibleCircleCardGalleryItems({ cardType: "CREATOR", contentBlocks })).toEqual([]);
    expect(readCircleCardGalleryItems(contentBlocks)).toHaveLength(2);
  });

  it("preserves existing business blocks when gallery items are written", () => {
    const withServices = writeCircleCardServices({}, [activeService]);
    const contentBlocks = writeCircleCardGalleryItems(withServices, [activeGalleryItem]);

    expect(readCircleCardServices(contentBlocks)).toEqual([activeService]);
    expect(readCircleCardGalleryItems(contentBlocks)).toEqual([activeGalleryItem]);
  });
});
