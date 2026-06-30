import { describe, expect, it } from "vitest";
import {
  circleCardOpeningHoursDayLabel,
  circleCardGalleryItemFormSchema,
  circleCardReviewItemFormSchema,
  createCircleCardOpeningHoursPreset,
  isValidCircleCardGalleryImageUrl,
  readCircleCardGalleryItems,
  readCircleCardServices,
  readCircleCardReviewItems,
  resolveCircleCardGalleryBuilderMode,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardServicesBuilderMode,
  resolveCircleCardReviewsBuilderMode,
  visibleCircleCardOpeningHours,
  visibleCircleCardGalleryItems,
  visibleCircleCardServices,
  visibleCircleCardReviewItems,
  writeCircleCardOpeningHours,
  writeCircleCardGalleryItems,
  writeCircleCardServices,
  writeCircleCardReviewItems,
  type CircleCardGalleryItem,
  type CircleCardServiceItem,
  type CircleCardReviewItem
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

const activeReview: CircleCardReviewItem = {
  id: "review-active",
  reviewerName: "Alex Morgan",
  reviewerRoleOrCompany: "Founder, North Studio",
  reviewText: "Thoughtful, reliable and excellent to work with.",
  rating: 5,
  source: "Google Review",
  sourceUrl: "https://example.com/reviews/alex",
  isActive: true,
  sortOrder: 0
};

const hiddenReview: CircleCardReviewItem = {
  ...activeReview,
  id: "review-hidden",
  reviewerName: "Sam Taylor",
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
  it("accepts safe local and HTTPS images but rejects empty, malformed, and unsafe URLs", () => {
    expect(isValidCircleCardGalleryImageUrl("/uploads/circle-card/user-gallery-image.jpg")).toBe(true);
    expect(isValidCircleCardGalleryImageUrl("/uploads/profiles/member-avatar.png")).toBe(true);
    expect(isValidCircleCardGalleryImageUrl("/uploads/links/featured-link.webp")).toBe(true);
    expect(isValidCircleCardGalleryImageUrl("https://res.cloudinary.com/demo/image/upload/v1/work.webp")).toBe(true);
    expect(isValidCircleCardGalleryImageUrl("https://cdn.example.com/work.png")).toBe(true);
    expect(isValidCircleCardGalleryImageUrl("")).toBe(false);
    expect(isValidCircleCardGalleryImageUrl("   ")).toBe(false);
    expect(isValidCircleCardGalleryImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidCircleCardGalleryImageUrl("http://example.com/work.jpg")).toBe(false);
    expect(isValidCircleCardGalleryImageUrl("not a URL")).toBe(false);
    expect(isValidCircleCardGalleryImageUrl("/uploads/circle-card/../private.png")).toBe(false);

    expect(circleCardGalleryItemFormSchema.safeParse({
      cardId: "cm12345678901234567890123",
      galleryItemId: "",
      imageUrl: "",
      title: "Missing image",
      description: "",
      category: "",
      isActive: true
    }).success).toBe(false);
  });

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

  it("retains broken legacy items for dashboard repair but excludes them publicly", () => {
    const contentBlocks = {
      business: {
        GALLERY_PORTFOLIO: {
          items: [{
            id: "legacy-broken",
            imageUrl: "javascript:alert(1)",
            title: "Legacy item",
            isActive: true,
            sortOrder: 0
          }]
        }
      }
    };

    expect(readCircleCardGalleryItems(contentBlocks)).toEqual([
      expect.objectContaining({ id: "legacy-broken", imageUrl: "" })
    ]);
    expect(visibleCircleCardGalleryItems({ cardType: "BUSINESS", contentBlocks })).toEqual([]);
  });
});

describe("Circle Card reviews content block", () => {
  it("stores reviews under business.REVIEWS_TESTIMONIALS.items", () => {
    const contentBlocks = writeCircleCardReviewItems({}, [activeReview]);

    expect(contentBlocks).toMatchObject({
      business: {
        REVIEWS_TESTIMONIALS: {
          items: [activeReview]
        }
      }
    });
    expect(readCircleCardReviewItems(contentBlocks)).toEqual([activeReview]);
  });

  it("rejects empty reviews, invalid ratings, and unsafe source URLs", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      reviewItemId: "",
      reviewerName: "Alex Morgan",
      reviewerRoleOrCompany: "",
      reviewText: "Excellent work.",
      rating: "5",
      source: "Google",
      sourceUrl: "https://example.com/review",
      isActive: "on"
    };

    expect(circleCardReviewItemFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, reviewerName: "" }).success).toBe(false);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, reviewText: "" }).success).toBe(false);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, rating: "0" }).success).toBe(false);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, rating: "6" }).success).toBe(false);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(circleCardReviewItemFormSchema.safeParse({ ...base, sourceUrl: "ftp://example.com/review" }).success).toBe(false);
  });

  it("exposes only active valid reviews on Business Cards", () => {
    const contentBlocks = writeCircleCardReviewItems({}, [activeReview, hiddenReview]);

    expect(visibleCircleCardReviewItems({ cardType: "BUSINESS", contentBlocks })).toEqual([activeReview]);
    expect(visibleCircleCardReviewItems({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
    expect(visibleCircleCardReviewItems({ cardType: "CREATOR", contentBlocks })).toEqual([]);
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardReviewsBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardReviewsBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardReviewsBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
  });
});
