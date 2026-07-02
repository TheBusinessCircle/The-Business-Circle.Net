export const BUSINESS_PROFILE_COMPLETION_ITEM_IDS = [
  "business-name",
  "about",
  "brand-image",
  "location",
  "contact-route",
  "services",
  "opening-hours",
  "gallery",
  "products",
  "price-list",
  "documents",
  "booking",
  "menu-offers",
  "circle-trust"
] as const;

export type BusinessProfileCompletionItemId =
  (typeof BUSINESS_PROFILE_COMPLETION_ITEM_IDS)[number];

export type BusinessProfileCompletionInput = {
  businessName?: string | null;
  about?: string | null;
  profileImageUrl?: string | null;
  businessLogoUrl?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  activeServiceCount: number;
  hasOpeningHours: boolean;
  activeGalleryCount: number;
  activeProductCount: number;
  activePriceCount: number;
  activeDocumentCount: number;
  bookingActive: boolean;
  activeMenuOfferCount: number;
  trustSignalCount: number;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function calculateBusinessProfileCompletion(input: BusinessProfileCompletionInput) {
  const items: Array<{
    id: BusinessProfileCompletionItemId;
    complete: boolean;
  }> = [
    { id: "business-name", complete: hasText(input.businessName) },
    { id: "about", complete: hasText(input.about) },
    {
      id: "brand-image",
      complete: hasText(input.profileImageUrl) || hasText(input.businessLogoUrl)
    },
    { id: "location", complete: hasText(input.location) },
    {
      id: "contact-route",
      complete: hasText(input.websiteUrl) || hasText(input.email) || hasText(input.phone)
    },
    { id: "services", complete: input.activeServiceCount > 0 },
    { id: "opening-hours", complete: input.hasOpeningHours },
    { id: "gallery", complete: input.activeGalleryCount > 0 },
    { id: "products", complete: input.activeProductCount > 0 },
    { id: "price-list", complete: input.activePriceCount > 0 },
    { id: "documents", complete: input.activeDocumentCount > 0 },
    { id: "booking", complete: input.bookingActive },
    { id: "menu-offers", complete: input.activeMenuOfferCount > 0 },
    { id: "circle-trust", complete: input.trustSignalCount > 0 }
  ];
  const completedCount = items.filter((item) => item.complete).length;

  return {
    score: Math.round((completedCount / items.length) * 100),
    completedCount,
    totalCount: items.length,
    items,
    nextIncompleteId: items.find((item) => !item.complete)?.id ?? null
  };
}
