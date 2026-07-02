import { describe, expect, it } from "vitest";
import {
  circleCardOpeningHoursDayLabel,
  circleCardBookingEnquiryFormSchema,
  circleCardBrandPartnershipFormSchema,
  circleCardBrandPartnershipStatus,
  circleCardAudienceSnapshotFormSchema,
  circleCardAudienceSnapshotStatus,
  circleCardBookingPhoneHref,
  circleCardBookingWhatsAppHref,
  circleCardGalleryItemFormSchema,
  circleCardFeaturedContentItemFormSchema,
  circleCardMediaKitFormSchema,
  circleCardMediaKitStatus,
  circleCardDocumentItemFormSchema,
  circleCardReviewItemFormSchema,
  circleCardProductItemFormSchema,
  circleCardPriceListItemFormSchema,
  circleCardMenuOfferItemFormSchema,
  circleCardCreatorBlockHasContent,
  createCircleCardOpeningHoursPreset,
  isValidCircleCardGalleryImageUrl,
  readCircleCardGalleryItems,
  readCircleCardFeaturedContentItems,
  readCircleCardMediaKit,
  readCircleCardBookingEnquiry,
  readCircleCardBrandPartnerships,
  readCircleCardAudienceSnapshot,
  readCircleCardDocumentItems,
  readCircleCardProductItems,
  readCircleCardPriceListItems,
  readCircleCardMenuOfferItems,
  readCircleCardCreatorBlocks,
  readCircleCardServices,
  readCircleCardReviewItems,
  resolveCircleCardGalleryBuilderMode,
  resolveCircleCardBookingBuilderMode,
  resolveCircleCardDocumentsBuilderMode,
  resolveCircleCardOpeningHoursBuilderMode,
  resolveCircleCardProductsBuilderMode,
  resolveCircleCardPriceListBuilderMode,
  resolveCircleCardMenuOffersBuilderMode,
  resolveCircleCardServicesBuilderMode,
  resolveCircleCardReviewsBuilderMode,
  visibleCircleCardOpeningHours,
  visibleCircleCardBookingEnquiry,
  visibleCircleCardBrandPartnerships,
  visibleCircleCardAudienceSnapshot,
  visibleCircleCardDocumentItems,
  visibleCircleCardProductItems,
  visibleCircleCardPriceListItems,
  visibleCircleCardMenuOfferItems,
  visibleCircleCardGalleryItems,
  visibleCircleCardFeaturedContentItems,
  visibleCircleCardMediaKit,
  visibleCircleCardServices,
  visibleCircleCardReviewItems,
  writeCircleCardOpeningHours,
  writeCircleCardBookingEnquiry,
  writeCircleCardBrandPartnerships,
  writeCircleCardAudienceSnapshot,
  writeCircleCardDocumentItems,
  writeCircleCardProductItems,
  writeCircleCardPriceListItems,
  writeCircleCardMenuOfferItems,
  writeCircleCardGalleryItems,
  writeCircleCardFeaturedContentItems,
  writeCircleCardMediaKit,
  writeCircleCardServices,
  writeCircleCardReviewItems,
  type CircleCardGalleryItem,
  type CircleCardFeaturedContentItem,
  type CircleCardMediaKit,
  type CircleCardBookingEnquiry,
  type CircleCardBrandPartnership,
  type CircleCardAudienceSnapshot,
  type CircleCardDocumentItem,
  type CircleCardProductItem,
  type CircleCardPriceListItem,
  type CircleCardMenuOfferItem,
  type CircleCardServiceItem,
  type CircleCardReviewItem
} from "@/lib/circle-card/content-blocks";

describe("Circle Card creator content block foundation", () => {
  it("normalises a missing creator branch without reading business blocks", () => {
    expect(readCircleCardCreatorBlocks({ business: { PRODUCTS: { items: [{ id: "product-1" }] } } })).toEqual({});
  });

  it("reads recognised creator blocks and ignores unknown keys", () => {
    expect(readCircleCardCreatorBlocks({
      creator: {
        FEATURED_CONTENT: { title: "Latest video" },
        MEDIA_KIT: { headline: "Creator media kit" },
        UNKNOWN_BLOCK: { value: true }
      }
    })).toEqual({
      FEATURED_CONTENT: { title: "Latest video" },
      MEDIA_KIT: { headline: "Creator media kit" }
    });
  });

  it("only treats meaningful creator block values as prepared content", () => {
    expect(circleCardCreatorBlockHasContent({ items: [], title: "" })).toBe(false);
    expect(circleCardCreatorBlockHasContent({ items: [{ title: "Press mention" }] })).toBe(true);
  });
});

describe("Circle Card Featured Content", () => {
  const featured: CircleCardFeaturedContentItem = {
    id: "featured-video",
    title: "My best launch video",
    description: "A behind-the-scenes look at the launch.",
    platform: "YouTube",
    thumbnailUrl: null,
    url: "https://youtube.com/watch?v=abc123XYZ",
    isFeatured: true,
    isActive: true,
    publishedDate: "2026-06-10",
    sortOrder: 1
  };
  const standard: CircleCardFeaturedContentItem = {
    ...featured,
    id: "standard-post",
    title: "Studio notes",
    platform: "Blog",
    url: "https://example.com/studio-notes",
    isFeatured: false,
    sortOrder: 0
  };
  const hidden: CircleCardFeaturedContentItem = {
    ...standard,
    id: "hidden-post",
    title: "Draft post",
    isActive: false,
    sortOrder: 2
  };

  it("stores items under creator.FEATURED_CONTENT without changing business blocks", () => {
    const stored = writeCircleCardFeaturedContentItems(
      { business: { PRODUCTS: { items: [{ id: "product-1" }] } } },
      [standard, featured]
    );
    expect(readCircleCardFeaturedContentItems(stored)).toHaveLength(2);
    expect(stored.business).toEqual({ PRODUCTS: { items: [{ id: "product-1" }] } });
  });

  it("renders Creator items only, hides inactive items and puts featured work first", () => {
    const stored = writeCircleCardFeaturedContentItems({}, [standard, featured, hidden]);
    expect(visibleCircleCardFeaturedContentItems({ cardType: "CREATOR", contentBlocks: stored })
      .map((item) => item.id)).toEqual(["featured-video", "standard-post"]);
    expect(visibleCircleCardFeaturedContentItems({ cardType: "BUSINESS", contentBlocks: stored })).toEqual([]);
    expect(visibleCircleCardFeaturedContentItems({ cardType: "PERSONAL", contentBlocks: stored })).toEqual([]);
  });

  it("accepts credential-free HTTPS and rejects unsafe content URLs", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      title: "A content title",
      description: "A useful description",
      platform: "TikTok",
      thumbnailUrl: "",
      publishedDate: "",
      isFeatured: false,
      isActive: true
    };
    expect(circleCardFeaturedContentItemFormSchema.safeParse({ ...base, url: "https://example.com/post" }).success).toBe(true);
    for (const url of ["javascript:alert(1)", "data:text/plain,test", "ftp://example.com/file", "https://user:pass@example.com/post", "not a url"]) {
      expect(circleCardFeaturedContentItemFormSchema.safeParse({ ...base, url }).success).toBe(false);
    }
  });
});

describe("Circle Card Creator Brand Partnerships", () => {
  const featured: CircleCardBrandPartnership = {
    id: "brand-featured",
    brandName: "North Studio",
    brandLogo: "/uploads/circle-card/north-logo.png",
    campaignTitle: "Creator Launch Series",
    description: "A three-part launch campaign across video and social content.",
    partnershipType: "Content Series",
    campaignDate: "2026-05-12",
    campaignUrl: "https://example.com/campaign",
    testimonial: "A thoughtful and reliable creative partner.",
    isFeatured: true,
    isActive: true,
    sortOrder: 1
  };
  const standard: CircleCardBrandPartnership = {
    ...featured,
    id: "brand-standard",
    brandName: "Acme",
    brandLogo: null,
    campaignTitle: "Product Review",
    partnershipType: "Product Review",
    testimonial: null,
    isFeatured: false,
    sortOrder: 0
  };
  const hidden: CircleCardBrandPartnership = {
    ...standard,
    id: "brand-hidden",
    brandName: "Hidden Brand",
    isActive: false,
    sortOrder: 2
  };

  it("stores partnerships under creator.BRAND_PARTNERSHIPS without touching other blocks", () => {
    const stored = writeCircleCardBrandPartnerships({ creator: { MEDIA_KIT: { creatorName: "Alex" } } }, [standard, featured]);
    expect(readCircleCardBrandPartnerships(stored)).toHaveLength(2);
    expect(stored.creator).toMatchObject({ MEDIA_KIT: { creatorName: "Alex" } });
    expect(circleCardBrandPartnershipStatus(readCircleCardBrandPartnerships(stored))).toBe("Complete");
  });

  it("renders Creator partnerships only, hides inactive items and puts featured campaigns first", () => {
    const stored = writeCircleCardBrandPartnerships({}, [standard, featured, hidden]);
    expect(visibleCircleCardBrandPartnerships({ cardType: "CREATOR", contentBlocks: stored }).map((item) => item.id))
      .toEqual(["brand-featured", "brand-standard"]);
    expect(visibleCircleCardBrandPartnerships({ cardType: "BUSINESS", contentBlocks: stored })).toEqual([]);
    expect(visibleCircleCardBrandPartnerships({ cardType: "PERSONAL", contentBlocks: stored })).toEqual([]);
  });

  it("accepts safe HTTPS campaign links and rejects unsafe destinations", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      partnershipId: "",
      brandName: "North Studio",
      brandLogo: "",
      campaignTitle: "Launch Campaign",
      description: "A collaborative creator campaign.",
      partnershipType: "Sponsored Content",
      campaignDate: "2026-05-12",
      testimonial: "",
      isFeatured: true,
      isActive: true
    };
    expect(circleCardBrandPartnershipFormSchema.safeParse({ ...base, campaignUrl: "https://example.com/work" }).success).toBe(true);
    for (const campaignUrl of ["javascript:alert(1)", "data:text/plain,test", "ftp://example.com/file", "https://user:pass@example.com/work", "not a url"]) {
      expect(circleCardBrandPartnershipFormSchema.safeParse({ ...base, campaignUrl }).success).toBe(false);
    }
  });
});

describe("Circle Card Creator Media Kit", () => {
  const mediaKit: CircleCardMediaKit = {
    creatorName: "Alex Creator",
    creatorTagline: "Thoughtful travel stories for curious audiences.",
    whatICreate: ["Travel guides", "Behind the scenes", "Short-form videos"],
    primaryNiche: "Travel",
    secondaryNiche: "Food",
    location: "London",
    languages: ["English", "Spanish"],
    availableWorldwide: true,
    creatorEmail: "alex@example.com",
    businessEnquiriesEmail: "brands@example.com",
    websiteUrl: "https://example.com",
    communityUrl: "https://example.com/community",
    yearsCreating: 6,
    availableFor: ["Sponsored Posts", "Podcast Guest"],
    primaryPlatform: "YouTube",
    secondaryPlatform: "Instagram",
    followers: "125K",
    subscribers: "80K",
    monthlyViews: "1.2M",
    averageReach: "90K",
    mediaKitFileUrl: "/api/circle-card/link-file/media-kit.pdf",
    mediaKitFileName: "Alex Media Kit.pdf",
    mediaKitFileMimeType: "application/pdf",
    externalMediaKitUrl: null
  };

  it("stores the profile under creator.MEDIA_KIT and reports completion", () => {
    const stored = writeCircleCardMediaKit({ business: { PRODUCTS: { items: [] } } }, mediaKit);
    expect(readCircleCardMediaKit(stored)).toEqual(mediaKit);
    expect(circleCardMediaKitStatus(readCircleCardMediaKit(stored))).toBe("Complete");
    expect(stored.business).toEqual({ PRODUCTS: { items: [] } });
  });

  it("only exposes populated Media Kits on Creator Cards", () => {
    const stored = writeCircleCardMediaKit({}, mediaKit);
    expect(visibleCircleCardMediaKit({ cardType: "CREATOR", contentBlocks: stored })?.creatorName).toBe("Alex Creator");
    expect(visibleCircleCardMediaKit({ cardType: "BUSINESS", contentBlocks: stored })).toBeNull();
    expect(visibleCircleCardMediaKit({ cardType: "PERSONAL", contentBlocks: stored })).toBeNull();
  });

  it("accepts a managed PDF or safe external URL and rejects unsafe combinations", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      creatorName: "Alex",
      creatorTagline: "",
      whatICreate: "Tutorials, Reviews",
      primaryNiche: "Travel",
      secondaryNiche: "",
      location: "",
      languages: "English",
      availableWorldwide: true,
      creatorEmail: "alex@example.com",
      businessEnquiriesEmail: "",
      websiteUrl: "https://example.com",
      communityUrl: "",
      yearsCreating: "5",
      availableFor: ["UGC"],
      primaryPlatform: "YouTube",
      secondaryPlatform: "",
      followers: "100K",
      subscribers: "",
      monthlyViews: "",
      averageReach: "",
      fileUrl: "",
      fileName: "",
      fileMimeType: "",
      externalMediaKitUrl: "https://example.com/media-kit"
    };
    expect(circleCardMediaKitFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardMediaKitFormSchema.safeParse({ ...base, externalMediaKitUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(circleCardMediaKitFormSchema.safeParse({
      ...base,
      fileUrl: "/api/circle-card/link-file/media-kit.docx",
      fileName: "media-kit.docx",
      fileMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      externalMediaKitUrl: ""
    }).success).toBe(false);
    expect(circleCardMediaKitFormSchema.safeParse({
      ...base,
      fileUrl: "/api/circle-card/link-file/media-kit.pdf",
      fileName: "media-kit.pdf",
      fileMimeType: "application/pdf"
    }).success).toBe(false);
  });
});

describe("Circle Card Creator Audience Snapshot", () => {
  const snapshot: CircleCardAudienceSnapshot = {
    primaryPlatform: "YouTube",
    secondaryPlatform: "Instagram",
    primaryContentType: "Technology",
    primaryAudience: "Developers",
    audienceAge: "18–34",
    audienceGender: "Mixed",
    topCountry: "United Kingdom",
    additionalCountries: ["United States", "Canada"],
    averageMonthlyReach: "850K",
    averageMonthlyViews: "2.4M",
    followers: "120K",
    subscribers: "65K",
    postingFrequency: "Weekly",
    bestPerformingContent: "Practical product tutorials.",
    audienceInterests: ["Technology", "Productivity"],
    creatorNotes: "Audience values detailed, honest explanations."
  };

  it("stores the snapshot separately under creator.AUDIENCE_SNAPSHOT", () => {
    const stored = writeCircleCardAudienceSnapshot({
      creator: { MEDIA_KIT: { creatorName: "Alex" } },
      business: { PRODUCTS: { items: [] } }
    }, snapshot);
    expect(readCircleCardAudienceSnapshot(stored)).toEqual(snapshot);
    expect(circleCardAudienceSnapshotStatus(readCircleCardAudienceSnapshot(stored))).toBe("Complete");
    expect(stored.creator).toMatchObject({ MEDIA_KIT: { creatorName: "Alex" } });
    expect(stored.business).toEqual({ PRODUCTS: { items: [] } });
  });

  it("only exposes populated snapshots on Creator Cards", () => {
    const stored = writeCircleCardAudienceSnapshot({}, snapshot);
    expect(visibleCircleCardAudienceSnapshot({ cardType: "CREATOR", contentBlocks: stored })?.followers).toBe("120K");
    expect(visibleCircleCardAudienceSnapshot({ cardType: "BUSINESS", contentBlocks: stored })).toBeNull();
    expect(visibleCircleCardAudienceSnapshot({ cardType: "PERSONAL", contentBlocks: stored })).toBeNull();
  });

  it("accepts creator-entered values without analytics or API fields", () => {
    const result = circleCardAudienceSnapshotFormSchema.safeParse({
      cardId: "cm12345678901234567890123",
      primaryPlatform: "YouTube",
      secondaryPlatform: "",
      primaryContentType: "Education",
      primaryAudience: "Students",
      audienceAge: "18–24",
      audienceGender: "Mixed",
      topCountry: "United Kingdom",
      additionalCountries: "United States, Canada",
      averageMonthlyReach: "500K",
      averageMonthlyViews: "1.5M",
      followers: "90K",
      subscribers: "45K",
      postingFrequency: "Weekly",
      bestPerformingContent: "Step-by-step tutorials",
      audienceInterests: "Education, technology",
      creatorNotes: "All figures are creator supplied."
    });
    expect(result.success).toBe(true);
  });
});

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

const activeMenuOffer: CircleCardMenuOfferItem = {
  id: "menu-offer-active",
  title: "Lunch special",
  description: "A weekday lunch offer.",
  imageUrl: "/uploads/circle-card/lunch.webp",
  category: "Lunch",
  price: "£12",
  previousPrice: "£16",
  badge: "Special Offer",
  ctaLabel: "Order Now",
  ctaUrl: "https://example.com/order",
  isFeatured: false,
  isActive: true,
  expiryDate: "2026-07-31",
  sortOrder: 0
};

const activePriceItem: CircleCardPriceListItem = {
  id: "price-active",
  title: "Website Audit",
  description: "A focused review of your website.",
  price: "£249",
  priceNote: "One-off fixed price",
  category: "Audits",
  ctaLabel: "Get Started",
  ctaUrl: "https://example.com/pricing",
  isActive: true,
  isFeatured: false,
  sortOrder: 0
};

const featuredPriceItem: CircleCardPriceListItem = {
  ...activePriceItem,
  id: "price-featured",
  title: "Consultation",
  price: "Free",
  isFeatured: true,
  sortOrder: 1
};

const hiddenPriceItem: CircleCardPriceListItem = {
  ...activePriceItem,
  id: "price-hidden",
  title: "Hidden price",
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

describe("Circle Card Price List content block", () => {
  it("stores prices under business.PRICE_LIST.items and preserves other blocks", () => {
    const withProducts = writeCircleCardProductItems({}, [activeProduct]);
    const contentBlocks = writeCircleCardPriceListItems(withProducts, [activePriceItem]);

    expect(contentBlocks).toMatchObject({
      business: { PRICE_LIST: { items: [activePriceItem] } }
    });
    expect(readCircleCardProductItems(contentBlocks)).toEqual([activeProduct]);
    expect(readCircleCardPriceListItems(contentBlocks)).toEqual([activePriceItem]);
  });

  it("shows active featured prices first on Business Cards only", () => {
    const contentBlocks = writeCircleCardPriceListItems({}, [
      activePriceItem,
      featuredPriceItem,
      hiddenPriceItem
    ]);

    expect(visibleCircleCardPriceListItems({ cardType: "BUSINESS", contentBlocks })).toEqual([
      featuredPriceItem,
      activePriceItem
    ]);
    expect(visibleCircleCardPriceListItems({ cardType: "PERSONAL", contentBlocks })).toEqual([]);
    expect(visibleCircleCardPriceListItems({ cardType: "CREATOR", contentBlocks })).toEqual([]);
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardPriceListBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardPriceListBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardPriceListBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardPriceListBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("rejects unsafe, credentialed and incomplete optional CTA links", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      priceListItemId: "",
      title: "Website Audit",
      description: "A focused review.",
      price: "£249",
      priceNote: "Fixed price",
      category: "Audits",
      ctaLabel: "Get Started",
      ctaUrl: "https://example.com/pricing",
      isFeatured: true,
      isActive: true
    };

    expect(circleCardPriceListItemFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaLabel: "", ctaUrl: "" }).success).toBe(true);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaUrl: "data:text/html,test" }).success).toBe(false);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaUrl: "https://user:secret@example.com" }).success).toBe(false);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaUrl: "/pricing" }).success).toBe(false);
    expect(circleCardPriceListItemFormSchema.safeParse({ ...base, ctaUrl: "" }).success).toBe(false);
  });
});

describe("Circle Card Menu & Offers content block", () => {
  it("stores items under business.MENU_OFFERS.items and preserves other blocks", () => {
    const withProducts = writeCircleCardProductItems({}, [activeProduct]);
    const contentBlocks = writeCircleCardMenuOfferItems(withProducts, [activeMenuOffer]);

    expect(contentBlocks).toMatchObject({
      business: { MENU_OFFERS: { items: [activeMenuOffer] } }
    });
    expect(readCircleCardProductItems(contentBlocks)).toEqual([activeProduct]);
    expect(readCircleCardMenuOfferItems(contentBlocks)).toEqual([activeMenuOffer]);
  });

  it("shows active, unexpired, featured items first on Business Cards only", () => {
    const featured = { ...activeMenuOffer, id: "menu-featured", isFeatured: true, sortOrder: 1 };
    const hidden = { ...activeMenuOffer, id: "menu-hidden", isActive: false, sortOrder: 2 };
    const expired = { ...activeMenuOffer, id: "menu-expired", expiryDate: "2026-06-30", sortOrder: 3 };
    const contentBlocks = writeCircleCardMenuOfferItems({}, [activeMenuOffer, featured, hidden, expired]);
    const now = new Date("2026-07-02T12:00:00.000Z");

    expect(visibleCircleCardMenuOfferItems({ cardType: "BUSINESS", contentBlocks, now })).toEqual([
      featured,
      activeMenuOffer
    ]);
    expect(visibleCircleCardMenuOfferItems({ cardType: "PERSONAL", contentBlocks, now })).toEqual([]);
    expect(visibleCircleCardMenuOfferItems({ cardType: "CREATOR", contentBlocks, now })).toEqual([]);
  });

  it("uses the shared Business Card Pro access mode", () => {
    expect(resolveCircleCardMenuOffersBuilderMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("enabled");
    expect(resolveCircleCardMenuOffersBuilderMode({ cardType: "BUSINESS", hasProAccess: false })).toBe("locked");
    expect(resolveCircleCardMenuOffersBuilderMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCircleCardMenuOffersBuilderMode({ cardType: "CREATOR", hasProAccess: true })).toBe("hidden");
  });

  it("accepts optional prices and rejects unsafe or credentialed CTA URLs", () => {
    const base = {
      cardId: "cm12345678901234567890123",
      menuOfferItemId: "",
      title: "Lunch special",
      description: "A weekday lunch offer.",
      imageUrl: "/uploads/circle-card/lunch.webp",
      category: "Lunch",
      price: "",
      previousPrice: "",
      badge: "Special Offer",
      ctaLabel: "Order Now",
      ctaUrl: "https://example.com/order",
      expiryDate: "2026-07-31",
      isFeatured: true,
      isActive: true
    };

    expect(circleCardMenuOfferItemFormSchema.safeParse(base).success).toBe(true);
    expect(circleCardMenuOfferItemFormSchema.safeParse({ ...base, ctaUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(circleCardMenuOfferItemFormSchema.safeParse({ ...base, ctaUrl: "data:text/html,test" }).success).toBe(false);
    expect(circleCardMenuOfferItemFormSchema.safeParse({ ...base, ctaUrl: "https://user:pass@example.com" }).success).toBe(false);
    expect(circleCardMenuOfferItemFormSchema.safeParse({ ...base, ctaUrl: "not a url" }).success).toBe(false);
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
