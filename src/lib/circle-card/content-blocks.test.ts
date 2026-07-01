import { describe, expect, it } from "vitest";
import {
  circleCardOpeningHoursDayLabel,
  circleCardBookingEnquiryFormSchema,
  circleCardBookingPhoneHref,
  circleCardBookingWhatsAppHref,
  circleCardGalleryItemFormSchema,
  circleCardDocumentItemFormSchema,
  circleCardReviewItemFormSchema,
  circleCardProductItemFormSchema,
  createCircleCardOpeningHoursPreset,
  isValidCircleCardGalleryImageUrl,
  readCircleCardGalleryItems,
  readCircleCardBookingEnquiry,
  readCircleCardDocumentItems,
  readCircleCardProductItems,
  readCircleCardServices,
  readCircleCardReviewItems,
  resolveCircleCardGalleryBuilderMode,
  resolveCircleCardBookingBuilderMode,
  resolveCircleCardDocumentsBuilderMode,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardProductsBuilderMode,
  resolveCircleCardServicesBuilderMode,
  resolveCircleCardReviewsBuilderMode,
  visibleCircleCardOpeningHours,
  visibleCircleCardBookingEnquiry,
  visibleCircleCardDocumentItems,
  visibleCircleCardProductItems,
  visibleCircleCardGalleryItems,
  visibleCircleCardServices,
  visibleCircleCardReviewItems,
  writeCircleCardOpeningHours,
  writeCircleCardBookingEnquiry,
  writeCircleCardDocumentItems,
  writeCircleCardProductItems,
  writeCircleCardGalleryItems,
  writeCircleCardServices,
  writeCircleCardReviewItems,
  type CircleCardGalleryItem,
  type CircleCardBookingEnquiry,
  type CircleCardDocumentItem,
  type CircleCardProductItem,
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

const activeProduct: CircleCardProductItem = {
  id: "product-active",
  title: "Business toolkit",
  description: "A practical toolkit for business owners.",
  price: "£49",
  salePrice: "£39",
  imageUrl: "/uploads/circle-card/toolkit.webp",
  category: "Digital products",
  ctaLabel: "Buy Now",
  ctaUrl: "https://example.com/toolkit",
  isActive: true,
  isFeatured: false,
  sortOrder: 0
};

const featuredProduct: CircleCardProductItem = {
  ...activeProduct,
  id: "product-featured",
  title: "Featured toolkit",
  isFeatured: true,
  sortOrder: 1
};

const hiddenProduct: CircleCardProductItem = {
  ...activeProduct,
  id: "product-hidden",
  title: "Hidden toolkit",
  isActive: false,
  sortOrder: 2
};

const activeDocument: CircleCardDocumentItem = {
  id: "document-active",
  title: "Business brochure",
  description: "Our current services and approach.",
  fileUrl: "/api/circle-card/link-file/1700000000000-deadbeefdeadbeef.pdf",
  fileName: "business-brochure.pdf",
  fileType: "application/pdf",
  category: "Brochures",
  ctaLabel: "View Brochure",
  isActive: true,
  isFeatured: false,
  sortOrder: 0
};

const featuredDocument: CircleCardDocumentItem = {
  ...activeDocument,
  id: "document-featured",
  title: "Featured menu",
  fileUrl: "https://example.com/menu.pdf",
  isFeatured: true,
  sortOrder: 1
};

const hiddenDocument: CircleCardDocumentItem = {
  ...activeDocument,
  id: "document-hidden",
  title: "Hidden form",
  isActive: false,
  sortOrder: 2
};

const activeBooking: CircleCardBookingEnquiry = {
  heading: "Ready to take the next step?",
  description: "Book a call or contact our team.",
  primaryCtaLabel: "Book a Call",
  primaryCtaUrl: "https://example.com/book",
  secondaryCtaLabel: "Request a Quote",
  secondaryCtaUrl: "https://example.com/quote",
  enquiryEmail: "hello@example.com",
  phoneNumber: "+44 20 1234 5678",
  whatsappNumber: "+44 7700 900123",
  isActive: true,
  showOnPublicCard: true,
  sortOrder: 0
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

describe("Circle Card products content block", () => {
  it("stores products under business.PRODUCTS.items and preserves other blocks", () => {
    const withServices = writeCircleCardServices({}, [activeService]);
    const contentBlocks = writeCircleCardProductItems(withServices, [activeProduct]);

    expect(contentBlocks).toMatchObject({
      business: { PRODUCTS: { items: [activeProduct] } }
    });
    expect(readCircleCardServices(contentBlocks)).toEqual([activeService]);
    expect(readCircleCardProductItems(contentBlocks)).toEqual([activeProduct]);
  });

  it("renders active featured products first on Business Cards only", () => {
    const contentBlocks = writeCircleCardProductItems({}, [activeProduct, featuredProduct, hiddenProduct]);

    expect(visibleCircleCardProductItems({ cardType: "BUSINESS", contentBlocks })).toEqual([
      featuredProduct,
      activeProduct
    ]);
    expect(visibleCircleCardProductItems({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
    expect(visibleCircleCardProductItems({ cardType: "CREATOR", contentBlocks })).toEqual([]);
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardProductsBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardProductsBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardProductsBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardProductsBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("requires product content and an external CTA URL", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      productItemId: "",
      title: "Business toolkit",
      description: "A practical toolkit.",
      price: "£49",
      salePrice: "£39",
      imageUrl: "/uploads/circle-card/toolkit.webp",
      category: "Digital",
      ctaLabel: "Buy Now",
      ctaUrl: "https://example.com/toolkit",
      isFeatured: true,
      isActive: true
    };

    expect(circleCardProductItemFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardProductItemFormSchema.safeParse({ ...base, price: "" }).success).toBe(false);
    expect(circleCardProductItemFormSchema.safeParse({ ...base, ctaUrl: "/checkout" }).success).toBe(false);
    expect(circleCardProductItemFormSchema.safeParse({ ...base, ctaUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("Circle Card booking and enquiry content block", () => {
  it("stores booking settings under business.BOOKING_ENQUIRY_LINK and preserves products", () => {
    const withProducts = writeCircleCardProductItems({}, [activeProduct]);
    const contentBlocks = writeCircleCardBookingEnquiry(withProducts, activeBooking);

    expect(contentBlocks).toMatchObject({
      business: { BOOKING_ENQUIRY_LINK: activeBooking }
    });
    expect(readCircleCardProductItems(contentBlocks)).toEqual([activeProduct]);
    expect(readCircleCardBookingEnquiry(contentBlocks)).toEqual(activeBooking);
  });

  it("renders active visible booking settings on Business Cards only", () => {
    const contentBlocks = writeCircleCardBookingEnquiry({}, activeBooking);
    const hiddenBlocks = writeCircleCardBookingEnquiry({}, { ...activeBooking, showOnPublicCard: false });
    const inactiveBlocks = writeCircleCardBookingEnquiry({}, { ...activeBooking, isActive: false });

    expect(visibleCircleCardBookingEnquiry({ cardType: "BUSINESS", contentBlocks })).toEqual(activeBooking);
    expect(visibleCircleCardBookingEnquiry({ cardType: "BUSINESS", contentBlocks: hiddenBlocks })).toBeNull();
    expect(visibleCircleCardBookingEnquiry({ cardType: "BUSINESS", contentBlocks: inactiveBlocks })).toBeNull();
    expect(visibleCircleCardBookingEnquiry({ cardType: "PERSONAL", contentBlocks })).toBeNull();
    expect(visibleCircleCardBookingEnquiry({ cardType: "CREATOR", contentBlocks })).toBeNull();
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardBookingBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardBookingBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardBookingBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardBookingBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("rejects unsafe URLs, malformed emails and unsafe phone values", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      ...activeBooking
    };

    expect(circleCardBookingEnquiryFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardBookingEnquiryFormSchema.safeParse({ ...base, primaryCtaUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(circleCardBookingEnquiryFormSchema.safeParse({ ...base, secondaryCtaUrl: "data:text/html,test" }).success).toBe(false);
    expect(circleCardBookingEnquiryFormSchema.safeParse({ ...base, enquiryEmail: "not-an-email" }).success).toBe(false);
    expect(circleCardBookingEnquiryFormSchema.safeParse({ ...base, phoneNumber: "tel:+441234567890" }).success).toBe(false);
    expect(circleCardBookingEnquiryFormSchema.safeParse({ ...base, whatsappNumber: "hello" }).success).toBe(false);
  });

  it("builds safe call and WhatsApp contact links", () => {
    expect(circleCardBookingPhoneHref("+44 20 1234 5678")).toBe("tel:+442012345678");
    expect(circleCardBookingWhatsAppHref("+44 7700 900123")).toBe("https://wa.me/447700900123");
    expect(circleCardBookingPhoneHref("javascript:alert(1)")).toBeNull();
    expect(circleCardBookingWhatsAppHref("data:text/plain,1")).toBeNull();
  });
});

describe("Circle Card downloads and documents content block", () => {
  it("stores documents under business.DOWNLOADS_DOCUMENTS.items and preserves products", () => {
    const withProducts = writeCircleCardProductItems({}, [activeProduct]);
    const contentBlocks = writeCircleCardDocumentItems(withProducts, [activeDocument]);

    expect(contentBlocks).toMatchObject({
      business: { DOWNLOADS_DOCUMENTS: { items: [activeDocument] } }
    });
    expect(readCircleCardProductItems(contentBlocks)).toEqual([activeProduct]);
    expect(readCircleCardDocumentItems(contentBlocks)).toEqual([activeDocument]);
  });

  it("renders active featured documents first on Business Cards only", () => {
    const contentBlocks = writeCircleCardDocumentItems({}, [activeDocument, featuredDocument, hiddenDocument]);

    expect(visibleCircleCardDocumentItems({ cardType: "BUSINESS", contentBlocks })).toEqual([
      featuredDocument,
      activeDocument
    ]);
    expect(visibleCircleCardDocumentItems({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
    expect(visibleCircleCardDocumentItems({ cardType: "CREATOR", contentBlocks })).toEqual([]);
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardDocumentsBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardDocumentsBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardDocumentsBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardDocumentsBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("accepts supported local files and safe external URLs", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      documentItemId: "",
      title: "Business brochure",
      description: "",
      fileUrl: activeDocument.fileUrl,
      fileName: "business-brochure.pdf",
      fileType: "application/pdf",
      category: "Brochures",
      ctaLabel: "View Brochure",
      isFeatured: true,
      isActive: true
    };

    expect(circleCardDocumentItemFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardDocumentItemFormSchema.safeParse({ ...base, fileUrl: "https://example.com/form.docx" }).success).toBe(true);
    expect(circleCardDocumentItemFormSchema.safeParse({ ...base, fileUrl: "/api/circle-card/link-file/1700000000000-deadbeefdeadbeef.zip" }).success).toBe(false);
    expect(circleCardDocumentItemFormSchema.safeParse({ ...base, fileUrl: "javascript:alert(1)" }).success).toBe(false);
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
