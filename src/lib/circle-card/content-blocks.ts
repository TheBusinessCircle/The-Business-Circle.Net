import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import {
  isSafeCircleCardExternalUrl,
  isSafeCircleCardLinkDestination,
  normalizeCircleCardUrl
} from "@/lib/circle-card/schema";

export const CIRCLE_CARD_CREATOR_BLOCK_TYPES = [
  "INTRO_VIDEO",
  "FEATURED_CONTENT",
  "CURRENT_PROJECT",
  "CURRENT_OFFER",
  "LATEST_LAUNCH",
  "MEDIA_KIT",
  "BRAND_PARTNERSHIPS",
  "AUDIENCE_SNAPSHOT",
  "CREATOR_OFFERS",
  "PRESS_PROOF",
  "CREATOR_TRUST"
] as const;

export const CIRCLE_CARD_BUSINESS_BLOCK_TYPES = [
  "SERVICES",
  "PRODUCTS",
  "PRICE_LIST",
  "OPENING_HOURS",
  "GALLERY_PORTFOLIO",
  "REVIEWS_TESTIMONIALS",
  "BOOKING_ENQUIRY_LINK",
  "DOWNLOADS_DOCUMENTS",
  "MENU_OFFERS"
] as const;

export type CircleCardCreatorBlockType =
  (typeof CIRCLE_CARD_CREATOR_BLOCK_TYPES)[number];

export type CircleCardBusinessBlockType =
  (typeof CIRCLE_CARD_BUSINESS_BLOCK_TYPES)[number];

export type CircleCardContentBlockType =
  | CircleCardCreatorBlockType
  | CircleCardBusinessBlockType;

export type CircleCardContentBlockDefinition = {
  type: CircleCardContentBlockType;
  family: "CREATOR" | "BUSINESS";
  label: string;
  publicEditingEnabled: boolean;
};

export const CIRCLE_CARD_CONTENT_BLOCK_DEFINITIONS = [
  {
    type: "INTRO_VIDEO",
    family: "CREATOR",
    label: "Intro video",
    publicEditingEnabled: false
  },
  {
    type: "FEATURED_CONTENT",
    family: "CREATOR",
    label: "Featured content",
    publicEditingEnabled: false
  },
  {
    type: "CURRENT_PROJECT",
    family: "CREATOR",
    label: "Current project",
    publicEditingEnabled: false
  },
  {
    type: "CURRENT_OFFER",
    family: "CREATOR",
    label: "Current offer",
    publicEditingEnabled: false
  },
  {
    type: "LATEST_LAUNCH",
    family: "CREATOR",
    label: "Latest launch",
    publicEditingEnabled: false
  },
  {
    type: "MEDIA_KIT",
    family: "CREATOR",
    label: "Media Kit",
    publicEditingEnabled: false
  },
  {
    type: "BRAND_PARTNERSHIPS",
    family: "CREATOR",
    label: "Brand Partnerships",
    publicEditingEnabled: false
  },
  {
    type: "AUDIENCE_SNAPSHOT",
    family: "CREATOR",
    label: "Audience Snapshot",
    publicEditingEnabled: false
  },
  {
    type: "CREATOR_OFFERS",
    family: "CREATOR",
    label: "Creator Offers",
    publicEditingEnabled: false
  },
  {
    type: "PRESS_PROOF",
    family: "CREATOR",
    label: "Press / Proof",
    publicEditingEnabled: false
  },
  {
    type: "CREATOR_TRUST",
    family: "CREATOR",
    label: "Circle Trust",
    publicEditingEnabled: false
  },
  {
    type: "SERVICES",
    family: "BUSINESS",
    label: "Services",
    publicEditingEnabled: true
  },
  {
    type: "PRODUCTS",
    family: "BUSINESS",
    label: "Products",
    publicEditingEnabled: true
  },
  {
    type: "PRICE_LIST",
    family: "BUSINESS",
    label: "Price List",
    publicEditingEnabled: true
  },
  {
    type: "OPENING_HOURS",
    family: "BUSINESS",
    label: "Opening Hours",
    publicEditingEnabled: true
  },
  {
    type: "GALLERY_PORTFOLIO",
    family: "BUSINESS",
    label: "Gallery / Portfolio",
    publicEditingEnabled: true
  },
  {
    type: "REVIEWS_TESTIMONIALS",
    family: "BUSINESS",
    label: "Reviews / Testimonials",
    publicEditingEnabled: true
  },
  {
    type: "BOOKING_ENQUIRY_LINK",
    family: "BUSINESS",
    label: "Booking / Enquiry Link",
    publicEditingEnabled: true
  },
  {
    type: "DOWNLOADS_DOCUMENTS",
    family: "BUSINESS",
    label: "Downloads / Documents",
    publicEditingEnabled: true
  },
  {
    type: "MENU_OFFERS",
    family: "BUSINESS",
    label: "Menu & Offers",
    publicEditingEnabled: true
  }
] as const satisfies readonly CircleCardContentBlockDefinition[];

export const CIRCLE_CARD_CONTENT_BLOCK_REGISTRY = {
  creator: CIRCLE_CARD_CREATOR_BLOCK_TYPES,
  business: CIRCLE_CARD_BUSINESS_BLOCK_TYPES
} as const;

export type CircleCardContentBlocksState = {
  creator?: Partial<Record<CircleCardCreatorBlockType, Record<string, unknown>>>;
  business?: Partial<Record<CircleCardBusinessBlockType, Record<string, unknown>>>;
};

export type CircleCardServiceItem = {
  id: string;
  title: string;
  description: string;
  startingPrice: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export const CIRCLE_CARD_SERVICE_LIMIT = 12;

export const CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS = [
  "TikTok",
  "YouTube",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "X",
  "Threads",
  "Pinterest",
  "Spotify",
  "Apple Podcasts",
  "Podcast RSS",
  "Twitch",
  "Kick",
  "Website",
  "Blog",
  "Newsletter",
  "Other"
] as const;

export type CircleCardFeaturedContentPlatform =
  (typeof CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS)[number];

export type CircleCardFeaturedContentItem = {
  id: string;
  title: string;
  description: string;
  platform: CircleCardFeaturedContentPlatform;
  thumbnailUrl: string | null;
  url: string;
  isFeatured: boolean;
  isActive: boolean;
  publishedDate: string | null;
  sortOrder: number;
};

export const CIRCLE_CARD_FEATURED_CONTENT_FREE_LIMIT = 3;
export const CIRCLE_CARD_FEATURED_CONTENT_PRO_LIMIT = 100;

export const CIRCLE_CARD_MEDIA_KIT_WORK_TYPES = [
  "Sponsored Posts",
  "UGC",
  "Affiliate Campaigns",
  "Events",
  "Public Speaking",
  "Podcast Guest",
  "Brand Ambassador",
  "Long-term Partnerships",
  "Digital Products",
  "Consulting"
] as const;

export type CircleCardMediaKitWorkType = (typeof CIRCLE_CARD_MEDIA_KIT_WORK_TYPES)[number];

export type CircleCardMediaKit = {
  creatorName: string | null;
  creatorTagline: string | null;
  whatICreate: string[];
  primaryNiche: string | null;
  secondaryNiche: string | null;
  location: string | null;
  languages: string[];
  availableWorldwide: boolean;
  creatorEmail: string | null;
  businessEnquiriesEmail: string | null;
  websiteUrl: string | null;
  communityUrl: string | null;
  yearsCreating: number | null;
  availableFor: CircleCardMediaKitWorkType[];
  primaryPlatform: CircleCardFeaturedContentPlatform | null;
  secondaryPlatform: CircleCardFeaturedContentPlatform | null;
  followers: string | null;
  subscribers: string | null;
  monthlyViews: string | null;
  averageReach: string | null;
  mediaKitFileUrl: string | null;
  mediaKitFileName: string | null;
  mediaKitFileMimeType: string | null;
  externalMediaKitUrl: string | null;
};

export type CircleCardMediaKitStatus = "Not Started" | "Active" | "Complete";

export const CIRCLE_CARD_AUDIENCE_CONTENT_TYPES = [
  "Education", "Comedy", "Gaming", "Business", "Technology", "Lifestyle", "Fitness",
  "Food", "Travel", "Fashion", "Beauty", "Music", "Parenting", "Finance", "DIY",
  "Reviews", "Other"
] as const;

export const CIRCLE_CARD_PRIMARY_AUDIENCES = [
  "Business Owners", "Parents", "Students", "Creators", "Developers", "Gamers",
  "Professionals", "Small Businesses", "Women", "Men", "General Public", "Other"
] as const;

export const CIRCLE_CARD_POSTING_FREQUENCIES = [
  "Daily", "Several Times Per Week", "Weekly", "Fortnightly", "Monthly"
] as const;

export type CircleCardAudienceContentType = (typeof CIRCLE_CARD_AUDIENCE_CONTENT_TYPES)[number];
export type CircleCardPrimaryAudience = (typeof CIRCLE_CARD_PRIMARY_AUDIENCES)[number];
export type CircleCardPostingFrequency = (typeof CIRCLE_CARD_POSTING_FREQUENCIES)[number];

export type CircleCardAudienceSnapshot = {
  primaryPlatform: CircleCardFeaturedContentPlatform | null;
  secondaryPlatform: CircleCardFeaturedContentPlatform | null;
  primaryContentType: CircleCardAudienceContentType | null;
  primaryAudience: CircleCardPrimaryAudience | null;
  audienceAge: string | null;
  audienceGender: string | null;
  topCountry: string | null;
  additionalCountries: string[];
  averageMonthlyReach: string | null;
  averageMonthlyViews: string | null;
  followers: string | null;
  subscribers: string | null;
  postingFrequency: CircleCardPostingFrequency | null;
  bestPerformingContent: string | null;
  audienceInterests: string[];
  creatorNotes: string | null;
};

export type CircleCardAudienceSnapshotStatus = "Not Started" | "Active" | "Complete";

export type CircleCardProductItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  salePrice: string | null;
  imageUrl: string | null;
  category: string | null;
  ctaLabel: string;
  ctaUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

export const CIRCLE_CARD_PRODUCT_PRO_LIMIT = 100;

export type CircleCardPriceListItem = {
  id: string;
  title: string;
  description: string | null;
  price: string;
  priceNote: string | null;
  category: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

export const CIRCLE_CARD_MENU_OFFER_BADGES = [
  "New",
  "Popular",
  "Limited Time",
  "Best Seller",
  "Special Offer",
  "Seasonal",
  "Chef's Choice",
  "Recommended"
] as const;

export type CircleCardMenuOfferBadge = (typeof CIRCLE_CARD_MENU_OFFER_BADGES)[number];

export type CircleCardMenuOfferItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string | null;
  price: string | null;
  previousPrice: string | null;
  badge: CircleCardMenuOfferBadge | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  expiryDate: string | null;
  sortOrder: number;
};

export const CIRCLE_CARD_MENU_OFFER_PRO_LIMIT = 100;

export type CircleCardDocumentItem = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
  category: string | null;
  ctaLabel: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

export const CIRCLE_CARD_DOCUMENT_PRO_LIMIT = 50;

export type CircleCardBookingEnquiry = {
  heading: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  enquiryEmail: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  isActive: boolean;
  showOnPublicCard: boolean;
  sortOrder: number;
};

export type CircleCardGalleryItem = {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
};

export const CIRCLE_CARD_GALLERY_PRO_LIMIT = 20;
export const CIRCLE_CARD_GALLERY_TEAMS_LIMIT = 100;

export type CircleCardReviewItem = {
  id: string;
  reviewerName: string;
  reviewerRoleOrCompany: string | null;
  reviewText: string;
  rating: number | null;
  source: string | null;
  sourceUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  verifiedConnection?: boolean;
  relationship?: string | null;
};

export const CIRCLE_CARD_REVIEW_PRO_LIMIT = 20;
export const CIRCLE_CARD_REVIEW_TEAMS_LIMIT = 100;

export const CIRCLE_CARD_WEEKDAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" }
] as const;

export type CircleCardWeekday = (typeof CIRCLE_CARD_WEEKDAYS)[number]["key"];

export type CircleCardOpeningHoursDay = {
  isOpen: boolean;
  openingTime: string | null;
  closingTime: string | null;
  note: string | null;
};

export type CircleCardOpeningHours = {
  days: Record<CircleCardWeekday, CircleCardOpeningHoursDay>;
};

export const CIRCLE_CARD_OPENING_HOURS_PRESETS = [
  "weekdays-9-5",
  "open-7-days",
  "weekends-closed",
  "appointment-only"
] as const;

export type CircleCardOpeningHoursPreset =
  (typeof CIRCLE_CARD_OPENING_HOURS_PRESETS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalServiceUrl(message: string) {
  return z
    .string()
    .trim()
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((value) => normalizeCircleCardUrl(value))
    .refine((value) => !value || /^https?:\/\//i.test(value), { message });
}

function readSafeServiceUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeCircleCardUrl(value);
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

export const circleCardServiceFormSchema = z.object({
  cardId: z.string().cuid(),
  serviceId: z.string().trim().max(64).optional().or(z.literal("")),
  title: z.string().trim().min(1, "Add a service title.").max(80),
  description: z.string().trim().min(1, "Add a short description.").max(280),
  startingPrice: z.string().trim().max(60).optional().or(z.literal("")),
  imageUrl: optionalServiceUrl("Use a valid image web address."),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaUrl: optionalServiceUrl("Use a valid enquiry web address."),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
}).superRefine((value, context) => {
  if (value.ctaLabel && !value.ctaUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctaUrl"],
      message: "Add an enquiry link when using a CTA label."
    });
  }

  if (value.ctaUrl && !value.ctaLabel) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctaLabel"],
      message: "Add a CTA label for the enquiry link."
    });
  }
});

export const circleCardServiceIdSchema = z.object({
  cardId: z.string().cuid(),
  serviceId: z.string().trim().min(1).max(64)
});

const productImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || isSafeCircleCardImageUrl(value), {
    message: "Upload a valid product image."
  });

const productExternalUrlSchema = z
  .string()
  .trim()
  .min(1, "Add a CTA URL.")
  .max(2048)
  .transform((value) => normalizeCircleCardUrl(value))
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Use an external http or https URL."
  });

export const circleCardProductItemFormSchema = z.object({
  cardId: z.string().cuid(),
  productItemId: z.string().trim().max(64).optional().or(z.literal("")),
  title: z.string().trim().min(1, "Add a product title.").max(100),
  description: z.string().trim().min(1, "Add a short description.").max(500),
  price: z.string().trim().min(1, "Add a price.").max(60),
  salePrice: z.string().trim().max(60).optional().or(z.literal("")),
  imageUrl: productImageUrlSchema,
  category: z.string().trim().max(60).optional().or(z.literal("")),
  ctaLabel: z.string().trim().min(1, "Add CTA button text.").max(40),
  ctaUrl: productExternalUrlSchema,
  isFeatured: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
});

export const circleCardProductItemIdSchema = z.object({
  cardId: z.string().cuid(),
  productItemId: z.string().trim().min(1).max(64)
});

function normalizeSafePriceListUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeCircleCardUrl(value);
  try {
    const url = new URL(normalized);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export const circleCardPriceListItemFormSchema = z
  .object({
    cardId: z.string().cuid(),
    priceListItemId: z.string().trim().max(64).optional().or(z.literal("")),
    title: z.string().trim().min(1, "Add a price title.").max(100),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    price: z.string().trim().min(1, "Add a price.").max(80),
    priceNote: z.string().trim().max(120).optional().or(z.literal("")),
    category: z.string().trim().max(60).optional().or(z.literal("")),
    ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
    ctaUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .or(z.literal(""))
      .transform((value, context) => {
        if (!value) {
          return "";
        }
        const safeUrl = normalizeSafePriceListUrl(value);
        if (!safeUrl) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use a safe external http or https URL."
          });
          return z.NEVER;
        }
        return safeUrl;
      }),
    isFeatured: z.preprocess(
      (value) => value === true || value === "true" || value === "on" || value === "1",
      z.boolean()
    ),
    isActive: z.preprocess(
      (value) => value === true || value === "true" || value === "on" || value === "1",
      z.boolean()
    )
  })
  .superRefine((value, context) => {
    if (value.ctaLabel && !value.ctaUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaUrl"],
        message: "Add a CTA URL when using a CTA label."
      });
    }
    if (value.ctaUrl && !value.ctaLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaLabel"],
        message: "Add a CTA label for the link."
      });
    }
  });

export const circleCardPriceListItemIdSchema = z.object({
  cardId: z.string().cuid(),
  priceListItemId: z.string().trim().min(1).max(64)
});

function normalizeSafeMenuOfferUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeCircleCardUrl(value);
  return isSafeCircleCardExternalUrl(normalized) ? normalized : null;
}

function isValidCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeSafeFeaturedContentUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeCircleCardUrl(value);
  return isSafeCircleCardExternalUrl(normalized) ? normalized : null;
}

export const circleCardFeaturedContentItemFormSchema = z.object({
  cardId: z.string().cuid(),
  featuredContentItemId: z.string().trim().max(64).optional().or(z.literal("")),
  title: z.string().trim().min(1, "Add a title.").max(120),
  description: z.string().trim().min(1, "Add a short description.").max(600),
  platform: z.enum(CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS),
  thumbnailUrl: productImageUrlSchema,
  url: z.string().trim().max(2048).transform((value, context) => {
    const safeUrl = normalizeSafeFeaturedContentUrl(value);
    if (!safeUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a safe https:// URL without credentials."
      });
      return z.NEVER;
    }
    return safeUrl;
  }),
  publishedDate: z.string().trim().optional().or(z.literal("")).refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && isValidCalendarDate(value),
    { message: "Choose a valid published date." }
  ),
  isFeatured: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
});

export const circleCardFeaturedContentItemIdSchema = z.object({
  cardId: z.string().cuid(),
  featuredContentItemId: z.string().trim().min(1).max(64)
});

const optionalMediaKitText = (maximum: number) =>
  z.string().trim().max(maximum);

const optionalMediaKitEmail = z.string().trim().max(254).refine(
  (value) => !value || z.string().email().safeParse(value).success,
  "Enter a valid email address."
);

const optionalSafeMediaKitUrl = z.string().trim().max(2048).transform(
  (value, context) => {
    if (!value) return "";
    const safeUrl = normalizeSafeFeaturedContentUrl(value);
    if (!safeUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a safe https:// URL without credentials."
      });
      return z.NEVER;
    }
    return safeUrl;
  }
);

export const circleCardMediaKitFormSchema = z.object({
  cardId: z.string().cuid(),
  creatorName: optionalMediaKitText(120),
  creatorTagline: optionalMediaKitText(240),
  whatICreate: optionalMediaKitText(600),
  primaryNiche: optionalMediaKitText(80),
  secondaryNiche: optionalMediaKitText(80),
  location: optionalMediaKitText(120),
  languages: optionalMediaKitText(300),
  availableWorldwide: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  creatorEmail: optionalMediaKitEmail,
  businessEnquiriesEmail: optionalMediaKitEmail,
  websiteUrl: optionalSafeMediaKitUrl,
  communityUrl: optionalSafeMediaKitUrl,
  yearsCreating: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? null : Number(value),
    z.number().int().min(0).max(80).nullable()
  ),
  availableFor: z.array(z.enum(CIRCLE_CARD_MEDIA_KIT_WORK_TYPES)).max(CIRCLE_CARD_MEDIA_KIT_WORK_TYPES.length),
  primaryPlatform: z.enum(CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS).or(z.literal("")),
  secondaryPlatform: z.enum(CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS).or(z.literal("")),
  followers: optionalMediaKitText(40),
  subscribers: optionalMediaKitText(40),
  monthlyViews: optionalMediaKitText(40),
  averageReach: optionalMediaKitText(40),
  fileUrl: z.string().trim().max(2048),
  fileName: optionalMediaKitText(255),
  fileMimeType: optionalMediaKitText(120),
  externalMediaKitUrl: optionalSafeMediaKitUrl
}).superRefine((value, context) => {
  if (value.fileUrl && value.externalMediaKitUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["externalMediaKitUrl"],
      message: "Use either an uploaded PDF or an external Media Kit URL."
    });
  }
  if (!value.fileUrl) return;
  if (
    !value.fileUrl.startsWith("/api/circle-card/link-file/") ||
    !value.fileUrl.toLowerCase().endsWith(".pdf") ||
    !isSafeCircleCardLinkDestination(value.fileUrl) ||
    value.fileMimeType !== "application/pdf"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fileUrl"],
      message: "Upload a PDF media kit."
    });
  }
});

export const circleCardAudienceSnapshotFormSchema = z.object({
  cardId: z.string().cuid(),
  primaryPlatform: z.enum(CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS).or(z.literal("")),
  secondaryPlatform: z.enum(CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS).or(z.literal("")),
  primaryContentType: z.enum(CIRCLE_CARD_AUDIENCE_CONTENT_TYPES).or(z.literal("")),
  primaryAudience: z.enum(CIRCLE_CARD_PRIMARY_AUDIENCES).or(z.literal("")),
  audienceAge: optionalMediaKitText(80),
  audienceGender: optionalMediaKitText(80),
  topCountry: optionalMediaKitText(100),
  additionalCountries: optionalMediaKitText(400),
  averageMonthlyReach: optionalMediaKitText(60),
  averageMonthlyViews: optionalMediaKitText(60),
  followers: optionalMediaKitText(60),
  subscribers: optionalMediaKitText(60),
  postingFrequency: z.enum(CIRCLE_CARD_POSTING_FREQUENCIES).or(z.literal("")),
  bestPerformingContent: optionalMediaKitText(300),
  audienceInterests: optionalMediaKitText(500),
  creatorNotes: optionalMediaKitText(800)
});

export const circleCardMenuOfferItemFormSchema = z
  .object({
    cardId: z.string().cuid(),
    menuOfferItemId: z.string().trim().max(64).optional().or(z.literal("")),
    title: z.string().trim().min(1, "Add a title.").max(100),
    description: z.string().trim().min(1, "Add a short description.").max(500),
    imageUrl: productImageUrlSchema,
    category: z.string().trim().max(60).optional().or(z.literal("")),
    price: z.string().trim().max(60).optional().or(z.literal("")),
    previousPrice: z.string().trim().max(60).optional().or(z.literal("")),
    badge: z.enum(CIRCLE_CARD_MENU_OFFER_BADGES).optional().or(z.literal("")),
    ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
    ctaUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .or(z.literal(""))
      .transform((value, context) => {
        if (!value) return "";
        const safeUrl = normalizeSafeMenuOfferUrl(value);
        if (!safeUrl) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use a safe https:// URL without credentials."
          });
          return z.NEVER;
        }
        return safeUrl;
      }),
    expiryDate: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && isValidCalendarDate(value), {
        message: "Choose a valid expiry date."
      }),
    isFeatured: z.preprocess(
      (value) => value === true || value === "true" || value === "on" || value === "1",
      z.boolean()
    ),
    isActive: z.preprocess(
      (value) => value === true || value === "true" || value === "on" || value === "1",
      z.boolean()
    )
  })
  .superRefine((value, context) => {
    if (value.previousPrice && !value.price) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Add the current price when using a previous price."
      });
    }
    if (value.ctaLabel && !value.ctaUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaUrl"],
        message: "Add a CTA URL when using a CTA label."
      });
    }
    if (value.ctaUrl && !value.ctaLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaLabel"],
        message: "Add a CTA label for the link."
      });
    }
  });

export const circleCardMenuOfferItemIdSchema = z.object({
  cardId: z.string().cuid(),
  menuOfferItemId: z.string().trim().min(1).max(64)
});

const CIRCLE_CARD_DOCUMENT_LOCAL_FILE_PATTERN =
  /^\/api\/circle-card\/link-file\/[0-9]+-[a-f0-9]{16}\.(pdf|docx?|xlsx?|csv|txt|jpg|png|webp)$/i;

export function isSafeCircleCardDocumentFileUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const candidate = value.trim();
  if (CIRCLE_CARD_DOCUMENT_LOCAL_FILE_PATTERN.test(candidate)) {
    return true;
  }

  try {
    const url = new URL(candidate);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const documentFileUrlSchema = z
  .string()
  .trim()
  .min(1, "Upload a file or add an external file URL.")
  .max(2048)
  .transform((value) =>
    value.startsWith("/api/circle-card/link-file/") ? value : normalizeCircleCardUrl(value)
  )
  .refine(isSafeCircleCardDocumentFileUrl, {
    message: "Use a supported Circle Card file or safe external URL."
  });

export const circleCardDocumentItemFormSchema = z.object({
  cardId: z.string().cuid(),
  documentItemId: z.string().trim().max(64).optional().or(z.literal("")),
  title: z.string().trim().min(1, "Add a document title.").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  fileUrl: documentFileUrlSchema,
  fileName: z.string().trim().max(160).optional().or(z.literal("")),
  fileType: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  isFeatured: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
});

export const circleCardDocumentItemIdSchema = z.object({
  cardId: z.string().cuid(),
  documentItemId: z.string().trim().min(1).max(64)
});

export function normalizeCircleCardContactNumber(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim();
  if (!candidate || candidate.length > 40 || !/^\+?[0-9][0-9 ()\-.]*$/.test(candidate)) {
    return null;
  }

  const digits = candidate.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return candidate;
}

export function circleCardBookingPhoneHref(value: string | null | undefined) {
  const normalized = normalizeCircleCardContactNumber(value);
  if (!normalized) {
    return null;
  }

  const hasLeadingPlus = normalized.startsWith("+");
  const digits = normalized.replace(/\D/g, "");
  return `tel:${hasLeadingPlus ? "+" : ""}${digits}`;
}

export function circleCardBookingWhatsAppHref(value: string | null | undefined) {
  const normalized = normalizeCircleCardContactNumber(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "").replace(/^00/, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function safeBookingUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeCircleCardUrl(value);
  try {
    const url = new URL(normalized);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    ) ? normalized : null;
  } catch {
    return null;
  }
}

function bookingUrlSchema(required: boolean) {
  const schema = z.string().trim().max(2048);
  return (required ? schema.min(1, "Add a CTA URL.") : schema.optional().or(z.literal("")))
    .transform((value) => value ? normalizeCircleCardUrl(value) : "")
    .refine((value) => !value || Boolean(safeBookingUrl(value)), {
      message: "Use a safe http or https URL."
    });
}

const optionalBookingPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || Boolean(normalizeCircleCardContactNumber(value)), {
    message: "Use a safe phone number with 7 to 15 digits."
  });

export const circleCardBookingEnquiryFormSchema = z.object({
  cardId: z.string().cuid(),
  heading: z.string().trim().min(1, "Add a heading.").max(100),
  description: z.string().trim().min(1, "Add a short description.").max(500),
  primaryCtaLabel: z.string().trim().min(1, "Add primary CTA text.").max(40),
  primaryCtaUrl: bookingUrlSchema(true),
  secondaryCtaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  secondaryCtaUrl: bookingUrlSchema(false),
  enquiryEmail: z.string().trim().toLowerCase().max(254).optional().or(z.literal(""))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Use a valid enquiry email."
    }),
  phoneNumber: optionalBookingPhoneSchema,
  whatsappNumber: optionalBookingPhoneSchema,
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  showOnPublicCard: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
}).superRefine((value, context) => {
  if (Boolean(value.secondaryCtaLabel) !== Boolean(value.secondaryCtaUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.secondaryCtaLabel ? "secondaryCtaUrl" : "secondaryCtaLabel"],
      message: "Add both secondary CTA text and URL, or leave both blank."
    });
  }
});

export function isValidCircleCardGalleryImageUrl(value: unknown): value is string {
  return isSafeCircleCardImageUrl(value);
}

const galleryImageUrlSchema = z
  .string()
  .trim()
  .min(1, "Upload a gallery image.")
  .max(2048)
  .refine(
    isValidCircleCardGalleryImageUrl,
    "Upload the gallery image successfully before saving."
  );

export const circleCardGalleryItemFormSchema = z.object({
  cardId: z.string().cuid(),
  galleryItemId: z.string().trim().max(64).optional().or(z.literal("")),
  imageUrl: galleryImageUrlSchema,
  title: z.string().trim().min(1, "Add an image title.").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
});

export const circleCardGalleryItemIdSchema = z.object({
  cardId: z.string().cuid(),
  galleryItemId: z.string().trim().min(1).max(64)
});

export function isSafeCircleCardReviewSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const optionalReviewRating = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().int().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5.").optional()
);

const optionalReviewSourceUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || isSafeCircleCardReviewSourceUrl(value), {
    message: "Use a safe http or https source URL."
  });

export const circleCardReviewItemFormSchema = z.object({
  cardId: z.string().cuid(),
  reviewItemId: z.string().trim().max(64).optional().or(z.literal("")),
  reviewerName: z.string().trim().min(1, "Add the reviewer name.").max(100),
  reviewerRoleOrCompany: z.string().trim().max(120).optional().or(z.literal("")),
  reviewText: z.string().trim().min(1, "Add the testimonial.").max(1200),
  rating: optionalReviewRating,
  source: z.string().trim().max(80).optional().or(z.literal("")),
  sourceUrl: optionalReviewSourceUrl,
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  )
});

export const circleCardReviewItemIdSchema = z.object({
  cardId: z.string().cuid(),
  reviewItemId: z.string().trim().min(1).max(64)
});

const openingHoursTimeSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Use a valid 24-hour time."
  });

const openingHoursDayFormSchema = z.object({
  isOpen: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean()
  ),
  openingTime: openingHoursTimeSchema,
  closingTime: openingHoursTimeSchema,
  note: z.string().trim().max(120).optional().or(z.literal(""))
}).superRefine((value, context) => {
  if (!value.isOpen) {
    return;
  }

  if (Boolean(value.openingTime) !== Boolean(value.closingTime)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.openingTime ? "closingTime" : "openingTime"],
      message: "Add both opening and closing times, or leave both blank."
    });
  }

  if (value.openingTime && value.closingTime && value.openingTime >= value.closingTime) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["closingTime"],
      message: "Closing time must be after opening time."
    });
  }
});

export const circleCardOpeningHoursFormSchema = z.object({
  cardId: z.string().cuid(),
  days: z.object({
    monday: openingHoursDayFormSchema,
    tuesday: openingHoursDayFormSchema,
    wednesday: openingHoursDayFormSchema,
    thursday: openingHoursDayFormSchema,
    friday: openingHoursDayFormSchema,
    saturday: openingHoursDayFormSchema,
    sunday: openingHoursDayFormSchema
  })
});

export const circleCardOpeningHoursPresetSchema = z.object({
  cardId: z.string().cuid(),
  preset: z.enum(CIRCLE_CARD_OPENING_HOURS_PRESETS)
});

function closedOpeningHoursDay(): CircleCardOpeningHoursDay {
  return { isOpen: false, openingTime: null, closingTime: null, note: null };
}

function timedOpeningHoursDay(): CircleCardOpeningHoursDay {
  return { isOpen: true, openingTime: "09:00", closingTime: "17:00", note: null };
}

function buildOpeningHoursDays(
  resolveDay: (day: CircleCardWeekday) => CircleCardOpeningHoursDay
): Record<CircleCardWeekday, CircleCardOpeningHoursDay> {
  return Object.fromEntries(
    CIRCLE_CARD_WEEKDAYS.map(({ key }) => [key, resolveDay(key)])
  ) as Record<CircleCardWeekday, CircleCardOpeningHoursDay>;
}

export function createCircleCardOpeningHoursPreset(
  preset: CircleCardOpeningHoursPreset,
  current?: CircleCardOpeningHours | null
): CircleCardOpeningHours {
  if (preset === "open-7-days") {
    return { days: buildOpeningHoursDays(() => timedOpeningHoursDay()) };
  }

  if (preset === "appointment-only") {
    return {
      days: buildOpeningHoursDays(() => ({
        isOpen: true,
        openingTime: null,
        closingTime: null,
        note: "By appointment only"
      }))
    };
  }

  if (preset === "weekends-closed" && current) {
    return {
      days: {
        ...current.days,
        saturday: closedOpeningHoursDay(),
        sunday: closedOpeningHoursDay()
      }
    };
  }

  return {
    days: buildOpeningHoursDays((day) =>
      day === "saturday" || day === "sunday"
        ? closedOpeningHoursDay()
        : timedOpeningHoursDay()
    )
  };
}

function readOpeningHoursTime(value: unknown) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
    ? value.trim()
    : null;
}

export function readCircleCardOpeningHours(value: unknown): CircleCardOpeningHours | null {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.OPENING_HOURS)) {
    return null;
  }

  const rawDays = value.business.OPENING_HOURS.days;
  if (!isRecord(rawDays) || !CIRCLE_CARD_WEEKDAYS.some(({ key }) => isRecord(rawDays[key]))) {
    return null;
  }

  return {
    days: buildOpeningHoursDays((day) => {
      const rawDay = isRecord(rawDays[day]) ? rawDays[day] : {};
      const isOpen = rawDay.isOpen === true;
      return {
        isOpen,
        openingTime: isOpen ? readOpeningHoursTime(rawDay.openingTime) : null,
        closingTime: isOpen ? readOpeningHoursTime(rawDay.closingTime) : null,
        note:
          typeof rawDay.note === "string" && rawDay.note.trim()
            ? rawDay.note.trim().slice(0, 120)
            : null
      };
    })
  };
}

export function writeCircleCardOpeningHours(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  openingHours: CircleCardOpeningHours
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentHours = isRecord(business.OPENING_HOURS) ? business.OPENING_HOURS : {};

  return {
    ...root,
    business: {
      ...business,
      OPENING_HOURS: {
        ...currentHours,
        days: openingHours.days
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardOpeningHours(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardOpeningHours(input.contentBlocks)
    : null;
}

export function circleCardOpeningHoursDayLabel(day: CircleCardOpeningHoursDay) {
  if (!day.isOpen) {
    return "Closed";
  }

  if (day.openingTime && day.closingTime) {
    return `${day.openingTime} – ${day.closingTime}`;
  }

  return day.note || "Open";
}

export function readCircleCardServices(value: unknown): CircleCardServiceItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.SERVICES)) {
    return [];
  }

  const items = value.business.SERVICES.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";

      if (!id || !title || !description) {
        return [];
      }

      return [{
        id,
        title: title.slice(0, 80),
        description: description.slice(0, 280),
        startingPrice:
          typeof item.startingPrice === "string" && item.startingPrice.trim()
            ? item.startingPrice.trim().slice(0, 60)
            : null,
        imageUrl: readSafeServiceUrl(item.imageUrl),
        ctaLabel: typeof item.ctaLabel === "string" && item.ctaLabel.trim() ? item.ctaLabel.trim().slice(0, 40) : null,
        ctaUrl: readSafeServiceUrl(item.ctaUrl),
        isActive: item.isActive !== false,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index
      } satisfies CircleCardServiceItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, CIRCLE_CARD_SERVICE_LIMIT);
}

export function writeCircleCardServices(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  services: CircleCardServiceItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentServices = isRecord(business.SERVICES) ? business.SERVICES : {};

  return {
    ...root,
    business: {
      ...business,
      SERVICES: {
        ...currentServices,
        items: services.map((service, index) => ({
          ...service,
          sortOrder: index
        }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardServices(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardServices(input.contentBlocks).filter((service) => service.isActive)
    : [];
}

function readSafeProductImageUrl(value: unknown) {
  return isSafeCircleCardImageUrl(value) ? value.trim() : null;
}

export function readCircleCardProductItems(value: unknown): CircleCardProductItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.PRODUCTS)) {
    return [];
  }

  const items = value.business.PRODUCTS.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      const price = typeof item.price === "string" ? item.price.trim() : "";
      const ctaLabel = typeof item.ctaLabel === "string" ? item.ctaLabel.trim() : "";
      const ctaUrl = readSafeServiceUrl(item.ctaUrl);

      if (!id || !title || !description || !price || !ctaLabel || !ctaUrl) {
        return [];
      }

      return [{
        id,
        title: title.slice(0, 100),
        description: description.slice(0, 500),
        price: price.slice(0, 60),
        salePrice:
          typeof item.salePrice === "string" && item.salePrice.trim()
            ? item.salePrice.trim().slice(0, 60)
            : null,
        imageUrl: readSafeProductImageUrl(item.imageUrl),
        category:
          typeof item.category === "string" && item.category.trim()
            ? item.category.trim().slice(0, 60)
            : null,
        ctaLabel: ctaLabel.slice(0, 40),
        ctaUrl,
        isActive: item.isActive !== false,
        isFeatured: item.isFeatured === true,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index
      } satisfies CircleCardProductItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function writeCircleCardProductItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  products: CircleCardProductItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentProducts = isRecord(business.PRODUCTS) ? business.PRODUCTS : {};

  return {
    ...root,
    business: {
      ...business,
      PRODUCTS: {
        ...currentProducts,
        items: products.map((product, index) => ({
          ...product,
          sortOrder: index
        }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardProductItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardProductItems(input.contentBlocks)
        .filter((product) => product.isActive)
        .sort((left, right) =>
          Number(right.isFeatured) - Number(left.isFeatured) || left.sortOrder - right.sortOrder
        )
    : [];
}

export function readCircleCardPriceListItems(value: unknown): CircleCardPriceListItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.PRICE_LIST)) {
    return [];
  }

  const items = value.business.PRICE_LIST.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }
      const id = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const price = typeof item.price === "string" ? item.price.trim() : "";
      if (!id || !title || !price) {
        return [];
      }
      const ctaLabel = typeof item.ctaLabel === "string" && item.ctaLabel.trim()
        ? item.ctaLabel.trim().slice(0, 40)
        : null;
      const ctaUrl = normalizeSafePriceListUrl(item.ctaUrl);

      return [{
        id,
        title: title.slice(0, 100),
        description: typeof item.description === "string" && item.description.trim()
          ? item.description.trim().slice(0, 500)
          : null,
        price: price.slice(0, 80),
        priceNote: typeof item.priceNote === "string" && item.priceNote.trim()
          ? item.priceNote.trim().slice(0, 120)
          : null,
        category: typeof item.category === "string" && item.category.trim()
          ? item.category.trim().slice(0, 60)
          : null,
        ctaLabel: ctaLabel && ctaUrl ? ctaLabel : null,
        ctaUrl: ctaLabel && ctaUrl ? ctaUrl : null,
        isActive: item.isActive !== false,
        isFeatured: item.isFeatured === true,
        sortOrder: typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
          ? item.sortOrder
          : index
      } satisfies CircleCardPriceListItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function writeCircleCardPriceListItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  priceItems: CircleCardPriceListItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentPriceList = isRecord(business.PRICE_LIST) ? business.PRICE_LIST : {};

  return {
    ...root,
    business: {
      ...business,
      PRICE_LIST: {
        ...currentPriceList,
        items: priceItems.map((item, index) => ({ ...item, sortOrder: index }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardPriceListItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardPriceListItems(input.contentBlocks)
        .filter((item) => item.isActive)
        .sort((left, right) =>
          Number(right.isFeatured) - Number(left.isFeatured) || left.sortOrder - right.sortOrder
        )
    : [];
}

export function readCircleCardMenuOfferItems(value: unknown): CircleCardMenuOfferItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.MENU_OFFERS)) {
    return [];
  }

  const items = value.business.MENU_OFFERS.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) return [];

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";
      if (!id || !title || !description) return [];

      const rawBadge = typeof item.badge === "string" ? item.badge.trim() : "";
      const badge = CIRCLE_CARD_MENU_OFFER_BADGES.find((candidate) => candidate === rawBadge) ?? null;
      const ctaLabel = typeof item.ctaLabel === "string" && item.ctaLabel.trim()
        ? item.ctaLabel.trim().slice(0, 40)
        : null;
      const ctaUrl = normalizeSafeMenuOfferUrl(item.ctaUrl);
      const rawExpiryDate = typeof item.expiryDate === "string" ? item.expiryDate.trim() : "";
      const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(rawExpiryDate) && isValidCalendarDate(rawExpiryDate)
        ? rawExpiryDate
        : null;

      return [{
        id,
        title: title.slice(0, 100),
        description: description.slice(0, 500),
        imageUrl: readSafeProductImageUrl(item.imageUrl),
        category: typeof item.category === "string" && item.category.trim()
          ? item.category.trim().slice(0, 60)
          : null,
        price: typeof item.price === "string" && item.price.trim()
          ? item.price.trim().slice(0, 60)
          : null,
        previousPrice: typeof item.previousPrice === "string" && item.previousPrice.trim()
          ? item.previousPrice.trim().slice(0, 60)
          : null,
        badge,
        ctaLabel: ctaLabel && ctaUrl ? ctaLabel : null,
        ctaUrl: ctaLabel && ctaUrl ? ctaUrl : null,
        isFeatured: item.isFeatured === true,
        isActive: item.isActive !== false,
        expiryDate,
        sortOrder: typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
          ? item.sortOrder
          : index
      } satisfies CircleCardMenuOfferItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function writeCircleCardMenuOfferItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  menuOfferItems: CircleCardMenuOfferItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentMenuOffers = isRecord(business.MENU_OFFERS) ? business.MENU_OFFERS : {};

  return {
    ...root,
    business: {
      ...business,
      MENU_OFFERS: {
        ...currentMenuOffers,
        items: menuOfferItems.map((item, index) => ({ ...item, sortOrder: index }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardMenuOfferItems(input: {
  cardType: string;
  contentBlocks: unknown;
  now?: Date;
}) {
  if (input.cardType !== "BUSINESS") return [];

  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  return readCircleCardMenuOfferItems(input.contentBlocks)
    .filter((item) => item.isActive && (!item.expiryDate || item.expiryDate >= today))
    .sort((left, right) =>
      Number(right.isFeatured) - Number(left.isFeatured) || left.sortOrder - right.sortOrder
    );
}

export function readCircleCardDocumentItems(value: unknown): CircleCardDocumentItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.DOWNLOADS_DOCUMENTS)) {
    return [];
  }

  const items = value.business.DOWNLOADS_DOCUMENTS.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const fileUrl = typeof item.fileUrl === "string" ? item.fileUrl.trim() : "";

      if (!id || !title || !isSafeCircleCardDocumentFileUrl(fileUrl)) {
        return [];
      }

      return [{
        id,
        title: title.slice(0, 100),
        description:
          typeof item.description === "string" && item.description.trim()
            ? item.description.trim().slice(0, 500)
            : null,
        fileUrl,
        fileName:
          typeof item.fileName === "string" && item.fileName.trim()
            ? item.fileName.trim().slice(0, 160)
            : null,
        fileType:
          typeof item.fileType === "string" && item.fileType.trim()
            ? item.fileType.trim().slice(0, 120)
            : null,
        category:
          typeof item.category === "string" && item.category.trim()
            ? item.category.trim().slice(0, 60)
            : null,
        ctaLabel:
          typeof item.ctaLabel === "string" && item.ctaLabel.trim()
            ? item.ctaLabel.trim().slice(0, 40)
            : null,
        isActive: item.isActive !== false,
        isFeatured: item.isFeatured === true,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index
      } satisfies CircleCardDocumentItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function writeCircleCardDocumentItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  documents: CircleCardDocumentItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentDocuments = isRecord(business.DOWNLOADS_DOCUMENTS)
    ? business.DOWNLOADS_DOCUMENTS
    : {};

  return {
    ...root,
    business: {
      ...business,
      DOWNLOADS_DOCUMENTS: {
        ...currentDocuments,
        items: documents.map((document, index) => ({
          ...document,
          sortOrder: index
        }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardDocumentItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardDocumentItems(input.contentBlocks)
        .filter((document) => document.isActive)
        .sort((left, right) =>
          Number(right.isFeatured) - Number(left.isFeatured) || left.sortOrder - right.sortOrder
        )
    : [];
}

export function readCircleCardBookingEnquiry(value: unknown): CircleCardBookingEnquiry | null {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.BOOKING_ENQUIRY_LINK)) {
    return null;
  }

  const raw = value.business.BOOKING_ENQUIRY_LINK;
  const heading = typeof raw.heading === "string" ? raw.heading.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const primaryCtaLabel = typeof raw.primaryCtaLabel === "string" ? raw.primaryCtaLabel.trim() : "";
  const primaryCtaUrl = safeBookingUrl(raw.primaryCtaUrl);

  if (!heading || !description || !primaryCtaLabel || !primaryCtaUrl) {
    return null;
  }

  const secondaryCtaLabel =
    typeof raw.secondaryCtaLabel === "string" && raw.secondaryCtaLabel.trim()
      ? raw.secondaryCtaLabel.trim().slice(0, 40)
      : null;
  const secondaryCtaUrl = safeBookingUrl(raw.secondaryCtaUrl);
  const enquiryEmail =
    typeof raw.enquiryEmail === "string" && z.string().email().safeParse(raw.enquiryEmail.trim()).success
      ? raw.enquiryEmail.trim().toLowerCase().slice(0, 254)
      : null;

  return {
    heading: heading.slice(0, 100),
    description: description.slice(0, 500),
    primaryCtaLabel: primaryCtaLabel.slice(0, 40),
    primaryCtaUrl,
    secondaryCtaLabel: secondaryCtaLabel && secondaryCtaUrl ? secondaryCtaLabel : null,
    secondaryCtaUrl: secondaryCtaLabel && secondaryCtaUrl ? secondaryCtaUrl : null,
    enquiryEmail,
    phoneNumber: normalizeCircleCardContactNumber(raw.phoneNumber),
    whatsappNumber: normalizeCircleCardContactNumber(raw.whatsappNumber),
    isActive: raw.isActive !== false,
    showOnPublicCard: raw.showOnPublicCard !== false,
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0
  };
}

export function writeCircleCardBookingEnquiry(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  booking: CircleCardBookingEnquiry
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentBooking = isRecord(business.BOOKING_ENQUIRY_LINK)
    ? business.BOOKING_ENQUIRY_LINK
    : {};

  return {
    ...root,
    business: {
      ...business,
      BOOKING_ENQUIRY_LINK: {
        ...currentBooking,
        ...booking
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardBookingEnquiry(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  if (input.cardType !== "BUSINESS") {
    return null;
  }

  const booking = readCircleCardBookingEnquiry(input.contentBlocks);
  if (!booking || !booking.isActive || !booking.showOnPublicCard) {
    return null;
  }

  const hasAction = Boolean(
    booking.primaryCtaUrl ||
    booking.secondaryCtaUrl ||
    booking.enquiryEmail ||
    circleCardBookingPhoneHref(booking.phoneNumber) ||
    circleCardBookingWhatsAppHref(booking.whatsappNumber)
  );

  return hasAction ? booking : null;
}

function readSafeGalleryImageUrl(value: unknown) {
  return isValidCircleCardGalleryImageUrl(value) ? value.trim() : null;
}

export function readCircleCardGalleryItems(value: unknown): CircleCardGalleryItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.GALLERY_PORTFOLIO)) {
    return [];
  }

  const items = value.business.GALLERY_PORTFOLIO.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      const imageUrl = readSafeGalleryImageUrl(item.imageUrl);
      const title = typeof item.title === "string" ? item.title.trim() : "";

      if (!id || !title) {
        return [];
      }

      return [{
        id,
        imageUrl: imageUrl ?? "",
        title: title.slice(0, 100),
        description:
          typeof item.description === "string" && item.description.trim()
            ? item.description.trim().slice(0, 500)
            : null,
        category:
          typeof item.category === "string" && item.category.trim()
            ? item.category.trim().slice(0, 60)
            : null,
        isActive: item.isActive !== false,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index
      } satisfies CircleCardGalleryItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, CIRCLE_CARD_GALLERY_TEAMS_LIMIT);
}

export function writeCircleCardGalleryItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  galleryItems: CircleCardGalleryItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentGallery = isRecord(business.GALLERY_PORTFOLIO)
    ? business.GALLERY_PORTFOLIO
    : {};

  return {
    ...root,
    business: {
      ...business,
      GALLERY_PORTFOLIO: {
        ...currentGallery,
        items: galleryItems.map((item, index) => ({
          ...item,
          sortOrder: index
        }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardGalleryItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardGalleryItems(input.contentBlocks).filter(
        (item) => item.isActive && isValidCircleCardGalleryImageUrl(item.imageUrl)
      )
    : [];
}

export function isValidCircleCardReviewItem(value: unknown): value is CircleCardReviewItem {
  if (!isRecord(value)) {
    return false;
  }

  const rating = value.rating;
  const sourceUrl = value.sourceUrl;

  return (
    typeof value.id === "string" &&
    Boolean(value.id.trim()) &&
    typeof value.reviewerName === "string" &&
    Boolean(value.reviewerName.trim()) &&
    typeof value.reviewText === "string" &&
    Boolean(value.reviewText.trim()) &&
    (rating === null || rating === undefined || (Number.isInteger(rating) && Number(rating) >= 1 && Number(rating) <= 5)) &&
    (sourceUrl === null || sourceUrl === undefined || sourceUrl === "" || isSafeCircleCardReviewSourceUrl(sourceUrl))
  );
}

export function readCircleCardReviewItems(value: unknown): CircleCardReviewItem[] {
  if (!isRecord(value) || !isRecord(value.business) || !isRecord(value.business.REVIEWS_TESTIMONIALS)) {
    return [];
  }

  const items = value.business.REVIEWS_TESTIMONIALS.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return [];
      }

      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id) {
        return [];
      }

      const rating =
        typeof item.rating === "number" && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5
          ? item.rating
          : null;
      const sourceUrl = isSafeCircleCardReviewSourceUrl(item.sourceUrl)
        ? item.sourceUrl.trim()
        : null;

      return [{
        id,
        reviewerName:
          typeof item.reviewerName === "string" ? item.reviewerName.trim().slice(0, 100) : "",
        reviewerRoleOrCompany:
          typeof item.reviewerRoleOrCompany === "string" && item.reviewerRoleOrCompany.trim()
            ? item.reviewerRoleOrCompany.trim().slice(0, 120)
            : null,
        reviewText:
          typeof item.reviewText === "string" ? item.reviewText.trim().slice(0, 1200) : "",
        rating,
        source:
          typeof item.source === "string" && item.source.trim()
            ? item.source.trim().slice(0, 80)
            : null,
        sourceUrl,
        isActive: item.isActive !== false,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index
      } satisfies CircleCardReviewItem];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, CIRCLE_CARD_REVIEW_TEAMS_LIMIT);
}

export function writeCircleCardReviewItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  reviews: CircleCardReviewItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const business = isRecord(root.business) ? root.business : {};
  const currentReviews = isRecord(business.REVIEWS_TESTIMONIALS)
    ? business.REVIEWS_TESTIMONIALS
    : {};

  return {
    ...root,
    business: {
      ...business,
      REVIEWS_TESTIMONIALS: {
        ...currentReviews,
        items: reviews.map((review, index) => ({
          ...review,
          sortOrder: index
        }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardReviewItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "BUSINESS"
    ? readCircleCardReviewItems(input.contentBlocks).filter(
        (item) => item.isActive && isValidCircleCardReviewItem(item)
      )
    : [];
}

export type CircleCardServicesBuilderMode = "hidden" | "locked" | "enabled" | "preview";

export type CircleCardOpeningHoursBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardGalleryBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardReviewsBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardProductsBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardDocumentsBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardBookingBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardPriceListBuilderMode = CircleCardServicesBuilderMode;
export type CircleCardMenuOffersBuilderMode = CircleCardServicesBuilderMode;

export function resolveCircleCardServicesBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardServicesBuilderMode {
  if (input.cardType === "BUSINESS") {
    return input.hasProAccess || input.isPlatformOwner ? "enabled" : "locked";
  }

  return input.isPlatformOwner && input.platformPreviewCardType === "business"
    ? "preview"
    : "hidden";
}

export function resolveCircleCardOpeningHoursBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardOpeningHoursBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardGalleryBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardGalleryBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardReviewsBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardReviewsBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardProductsBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardProductsBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardPriceListBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardPriceListBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardMenuOffersBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardMenuOffersBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardDocumentsBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardDocumentsBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function resolveCircleCardBookingBuilderMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CircleCardBookingBuilderMode {
  return resolveCircleCardServicesBuilderMode(input);
}

export function readCircleCardCreatorBlocks(
  value: unknown
): NonNullable<CircleCardContentBlocksState["creator"]> {
  if (!isRecord(value) || !isRecord(value.creator)) {
    return {};
  }
  const creator = value.creator;

  return CIRCLE_CARD_CREATOR_BLOCK_TYPES.reduce<NonNullable<CircleCardContentBlocksState["creator"]>>(
    (blocks, type) => {
      if (isRecord(creator[type])) {
        blocks[type] = creator[type] as Record<string, unknown>;
      }
      return blocks;
    },
    {}
  );
}

export function readCircleCardFeaturedContentItems(value: unknown): CircleCardFeaturedContentItem[] {
  if (!isRecord(value) || !isRecord(value.creator) || !isRecord(value.creator.FEATURED_CONTENT)) {
    return [];
  }

  const items = value.creator.FEATURED_CONTENT.items;
  if (!Array.isArray(items)) return [];

  return items.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const platform = CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.find(
      (candidate) => candidate === item.platform
    );
    const url = normalizeSafeFeaturedContentUrl(item.url);
    if (!id || !title || !description || !platform || !url) return [];

    const rawPublishedDate = typeof item.publishedDate === "string" ? item.publishedDate.trim() : "";
    const publishedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawPublishedDate) && isValidCalendarDate(rawPublishedDate)
      ? rawPublishedDate
      : null;

    return [{
      id,
      title: title.slice(0, 120),
      description: description.slice(0, 600),
      platform,
      thumbnailUrl: readSafeProductImageUrl(item.thumbnailUrl),
      url,
      isFeatured: item.isFeatured === true,
      isActive: item.isActive !== false,
      publishedDate,
      sortOrder: typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
        ? item.sortOrder
        : index
    } satisfies CircleCardFeaturedContentItem];
  }).sort((left, right) => left.sortOrder - right.sortOrder);
}

export function writeCircleCardFeaturedContentItems(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  featuredContentItems: CircleCardFeaturedContentItem[]
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const creator = isRecord(root.creator) ? root.creator : {};
  const currentFeaturedContent = isRecord(creator.FEATURED_CONTENT)
    ? creator.FEATURED_CONTENT
    : {};

  return {
    ...root,
    creator: {
      ...creator,
      FEATURED_CONTENT: {
        ...currentFeaturedContent,
        items: featuredContentItems.map((item, index) => ({ ...item, sortOrder: index }))
      }
    }
  } as Prisma.InputJsonObject;
}

export function visibleCircleCardFeaturedContentItems(input: {
  cardType: string;
  contentBlocks: unknown;
}) {
  return input.cardType === "CREATOR"
    ? readCircleCardFeaturedContentItems(input.contentBlocks)
        .filter((item) => item.isActive)
        .sort((left, right) =>
          Number(right.isFeatured) - Number(left.isFeatured) || left.sortOrder - right.sortOrder
        )
    : [];
}

function readMediaKitText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maximum) : null;
}

function readMediaKitEmail(value: unknown) {
  const email = readMediaKitText(value, 254);
  return email && z.string().email().safeParse(email).success ? email : null;
}

function readMediaKitUrl(value: unknown) {
  return normalizeSafeFeaturedContentUrl(value);
}

export function readCircleCardMediaKit(value: unknown): CircleCardMediaKit | null {
  if (!isRecord(value) || !isRecord(value.creator) || !isRecord(value.creator.MEDIA_KIT)) {
    return null;
  }
  const mediaKit = value.creator.MEDIA_KIT;
  const languages = Array.isArray(mediaKit.languages)
    ? mediaKit.languages.flatMap((language) => {
        const parsed = readMediaKitText(language, 60);
        return parsed ? [parsed] : [];
      }).slice(0, 12)
    : [];
  const whatICreate = Array.isArray(mediaKit.whatICreate)
    ? mediaKit.whatICreate.flatMap((contentType) => {
        const parsed = readMediaKitText(contentType, 80);
        return parsed ? [parsed] : [];
      }).slice(0, 16)
    : [];
  const rawAvailableFor = Array.isArray(mediaKit.availableFor) ? mediaKit.availableFor : [];
  const availableFor = rawAvailableFor.length
    ? CIRCLE_CARD_MEDIA_KIT_WORK_TYPES.filter((workType) => rawAvailableFor.includes(workType))
    : [];
  const primaryPlatform = CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.find(
    (platform) => platform === mediaKit.primaryPlatform
  ) ?? null;
  const secondaryPlatform = CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.find(
    (platform) => platform === mediaKit.secondaryPlatform
  ) ?? null;
  const rawFileUrl = readMediaKitText(mediaKit.mediaKitFileUrl, 2048);
  const rawFileMimeType = readMediaKitText(mediaKit.mediaKitFileMimeType, 120);
  const mediaKitFileUrl = rawFileUrl && rawFileUrl.startsWith("/api/circle-card/link-file/") &&
    rawFileUrl.toLowerCase().endsWith(".pdf") && rawFileMimeType === "application/pdf" &&
    isSafeCircleCardLinkDestination(rawFileUrl)
      ? rawFileUrl
      : null;
  const result: CircleCardMediaKit = {
    creatorName: readMediaKitText(mediaKit.creatorName, 120),
    creatorTagline: readMediaKitText(mediaKit.creatorTagline, 240),
    whatICreate,
    primaryNiche: readMediaKitText(mediaKit.primaryNiche, 80),
    secondaryNiche: readMediaKitText(mediaKit.secondaryNiche, 80),
    location: readMediaKitText(mediaKit.location, 120),
    languages,
    availableWorldwide: mediaKit.availableWorldwide === true,
    creatorEmail: readMediaKitEmail(mediaKit.creatorEmail),
    businessEnquiriesEmail: readMediaKitEmail(mediaKit.businessEnquiriesEmail),
    websiteUrl: readMediaKitUrl(mediaKit.websiteUrl),
    communityUrl: readMediaKitUrl(mediaKit.communityUrl),
    yearsCreating: typeof mediaKit.yearsCreating === "number" && Number.isInteger(mediaKit.yearsCreating) && mediaKit.yearsCreating >= 0 && mediaKit.yearsCreating <= 80
      ? mediaKit.yearsCreating
      : null,
    availableFor,
    primaryPlatform,
    secondaryPlatform,
    followers: readMediaKitText(mediaKit.followers, 40),
    subscribers: readMediaKitText(mediaKit.subscribers, 40),
    monthlyViews: readMediaKitText(mediaKit.monthlyViews, 40),
    averageReach: readMediaKitText(mediaKit.averageReach, 40),
    mediaKitFileUrl,
    mediaKitFileName: mediaKitFileUrl ? readMediaKitText(mediaKit.mediaKitFileName, 255) : null,
    mediaKitFileMimeType: mediaKitFileUrl ? "application/pdf" : null,
    externalMediaKitUrl: readMediaKitUrl(mediaKit.externalMediaKitUrl)
  };

  return circleCardMediaKitStatus(result) === "Not Started" ? null : result;
}

export function writeCircleCardMediaKit(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  mediaKit: CircleCardMediaKit
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const creator = isRecord(root.creator) ? root.creator : {};
  return {
    ...root,
    creator: {
      ...creator,
      MEDIA_KIT: mediaKit
    }
  } as Prisma.InputJsonObject;
}

export function circleCardMediaKitStatus(mediaKit: CircleCardMediaKit | null): CircleCardMediaKitStatus {
  if (!mediaKit) return "Not Started";
  const hasContent = Boolean(
    mediaKit.creatorName || mediaKit.creatorTagline || mediaKit.whatICreate.length || mediaKit.primaryNiche ||
    mediaKit.secondaryNiche || mediaKit.location || mediaKit.languages.length ||
    mediaKit.availableWorldwide || mediaKit.creatorEmail || mediaKit.businessEnquiriesEmail ||
    mediaKit.websiteUrl || mediaKit.communityUrl || mediaKit.yearsCreating !== null ||
    mediaKit.availableFor.length || mediaKit.primaryPlatform || mediaKit.secondaryPlatform ||
    mediaKit.followers || mediaKit.subscribers || mediaKit.monthlyViews || mediaKit.averageReach ||
    mediaKit.mediaKitFileUrl || mediaKit.externalMediaKitUrl
  );
  if (!hasContent) return "Not Started";
  const complete = Boolean(
    mediaKit.creatorName && mediaKit.creatorTagline && mediaKit.primaryNiche &&
    (mediaKit.businessEnquiriesEmail || mediaKit.creatorEmail) &&
    mediaKit.availableFor.length && mediaKit.primaryPlatform
  );
  return complete ? "Complete" : "Active";
}

export function visibleCircleCardMediaKit(input: { cardType: string; contentBlocks: unknown }) {
  return input.cardType === "CREATOR" ? readCircleCardMediaKit(input.contentBlocks) : null;
}

function readAudienceList(value: unknown, maximumItems: number) {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const parsed = readMediaKitText(item, 100);
        return parsed ? [parsed] : [];
      }).slice(0, maximumItems)
    : [];
}

export function readCircleCardAudienceSnapshot(value: unknown): CircleCardAudienceSnapshot | null {
  if (!isRecord(value) || !isRecord(value.creator) || !isRecord(value.creator.AUDIENCE_SNAPSHOT)) {
    return null;
  }
  const snapshot = value.creator.AUDIENCE_SNAPSHOT;
  const result: CircleCardAudienceSnapshot = {
    primaryPlatform: CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.find((item) => item === snapshot.primaryPlatform) ?? null,
    secondaryPlatform: CIRCLE_CARD_FEATURED_CONTENT_PLATFORMS.find((item) => item === snapshot.secondaryPlatform) ?? null,
    primaryContentType: CIRCLE_CARD_AUDIENCE_CONTENT_TYPES.find((item) => item === snapshot.primaryContentType) ?? null,
    primaryAudience: CIRCLE_CARD_PRIMARY_AUDIENCES.find((item) => item === snapshot.primaryAudience) ?? null,
    audienceAge: readMediaKitText(snapshot.audienceAge, 80),
    audienceGender: readMediaKitText(snapshot.audienceGender, 80),
    topCountry: readMediaKitText(snapshot.topCountry, 100),
    additionalCountries: readAudienceList(snapshot.additionalCountries, 12),
    averageMonthlyReach: readMediaKitText(snapshot.averageMonthlyReach, 60),
    averageMonthlyViews: readMediaKitText(snapshot.averageMonthlyViews, 60),
    followers: readMediaKitText(snapshot.followers, 60),
    subscribers: readMediaKitText(snapshot.subscribers, 60),
    postingFrequency: CIRCLE_CARD_POSTING_FREQUENCIES.find((item) => item === snapshot.postingFrequency) ?? null,
    bestPerformingContent: readMediaKitText(snapshot.bestPerformingContent, 300),
    audienceInterests: readAudienceList(snapshot.audienceInterests, 16),
    creatorNotes: readMediaKitText(snapshot.creatorNotes, 800)
  };
  return circleCardAudienceSnapshotStatus(result) === "Not Started" ? null : result;
}

export function writeCircleCardAudienceSnapshot(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  snapshot: CircleCardAudienceSnapshot
): Prisma.InputJsonObject {
  const root: Record<string, unknown> = isRecord(value) ? value : {};
  const creator = isRecord(root.creator) ? root.creator : {};
  return {
    ...root,
    creator: {
      ...creator,
      AUDIENCE_SNAPSHOT: snapshot
    }
  } as Prisma.InputJsonObject;
}

export function circleCardAudienceSnapshotStatus(
  snapshot: CircleCardAudienceSnapshot | null
): CircleCardAudienceSnapshotStatus {
  if (!snapshot) return "Not Started";
  const hasContent = Object.values(snapshot).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );
  if (!hasContent) return "Not Started";
  const hasAudienceSize = Boolean(
    snapshot.followers || snapshot.subscribers || snapshot.averageMonthlyReach || snapshot.averageMonthlyViews
  );
  return snapshot.primaryPlatform && snapshot.primaryContentType && snapshot.primaryAudience && hasAudienceSize
    ? "Complete"
    : "Active";
}

export function visibleCircleCardAudienceSnapshot(input: { cardType: string; contentBlocks: unknown }) {
  return input.cardType === "CREATOR" ? readCircleCardAudienceSnapshot(input.contentBlocks) : null;
}

export function circleCardFeaturedContentPreviewImage(item: CircleCardFeaturedContentItem) {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  if (item.platform !== "YouTube") return null;

  try {
    const url = new URL(item.url);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const videoId = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : ["youtube.com", "m.youtube.com"].includes(host)
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]
        : null;
    return videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : null;
  } catch {
    return null;
  }
}

export function circleCardCreatorBlockHasContent(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => circleCardCreatorBlockHasContent(item));
  if (isRecord(value)) return Object.values(value).some((item) => circleCardCreatorBlockHasContent(item));
  return false;
}

export function createEmptyCircleCardContentBlocks(): CircleCardContentBlocksState {
  return {
    creator: {},
    business: {}
  };
}
