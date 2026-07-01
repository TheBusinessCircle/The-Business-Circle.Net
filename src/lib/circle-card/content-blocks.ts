import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { normalizeCircleCardUrl } from "@/lib/circle-card/schema";

export const CIRCLE_CARD_CREATOR_BLOCK_TYPES = [
  "INTRO_VIDEO",
  "FEATURED_CONTENT",
  "CURRENT_PROJECT",
  "CURRENT_OFFER",
  "LATEST_LAUNCH"
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
    publicEditingEnabled: false
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
    publicEditingEnabled: false
  },
  {
    type: "DOWNLOADS_DOCUMENTS",
    family: "BUSINESS",
    label: "Downloads / Documents",
    publicEditingEnabled: false
  },
  {
    type: "MENU_OFFERS",
    family: "BUSINESS",
    label: "Menu / Offers",
    publicEditingEnabled: false
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

export function createEmptyCircleCardContentBlocks(): CircleCardContentBlocksState {
  return {
    creator: {},
    business: {}
  };
}
