import { describe, expect, it } from "vitest";
import {
  circleCardOpeningHoursDayLabel,
  createCircleCardOpeningHoursPreset,
  readCircleCardServices,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardServicesBuilderMode,
  visibleCircleCardOpeningHours,
  visibleCircleCardServices,
  writeCircleCardOpeningHours,
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
