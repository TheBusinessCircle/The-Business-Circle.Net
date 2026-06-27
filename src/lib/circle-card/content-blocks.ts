import type { Prisma } from "@prisma/client";
import { z } from "zod";
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
    publicEditingEnabled: false
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
    publicEditingEnabled: false
  },
  {
    type: "GALLERY_PORTFOLIO",
    family: "BUSINESS",
    label: "Gallery / Portfolio",
    publicEditingEnabled: false
  },
  {
    type: "REVIEWS_TESTIMONIALS",
    family: "BUSINESS",
    label: "Reviews / Testimonials",
    publicEditingEnabled: false
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
  value: Prisma.JsonValue | null | undefined,
  services: CircleCardServiceItem[]
): Prisma.InputJsonObject {
  const root = isRecord(value) ? value : {};
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

export type CircleCardServicesBuilderMode = "hidden" | "locked" | "enabled" | "preview";

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

export function createEmptyCircleCardContentBlocks(): CircleCardContentBlocksState {
  return {
    creator: {},
    business: {}
  };
}
