import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normalizeExternalHref } from "@/lib/links";
import { slugify } from "@/lib/utils";

export type CircleCardSocialLinks = {
  linkedin?: string;
  tiktok?: string;
  instagram?: string;
  x?: string;
  facebook?: string;
  youtube?: string;
};

export const CIRCLE_CARD_SOCIAL_FIELDS = [
  "linkedin",
  "tiktok",
  "instagram",
  "x",
  "facebook",
  "youtube"
] as const satisfies readonly (keyof CircleCardSocialLinks)[];

export const CIRCLE_CARD_CUSTOM_LINK_ICONS = [
  "link",
  "calendar",
  "portfolio",
  "offer",
  "community",
  "download",
  "review",
  "shop",
  "menu",
  "case-studies"
] as const;

export type CircleCardCustomLinkIcon = (typeof CIRCLE_CARD_CUSTOM_LINK_ICONS)[number];

export const CIRCLE_CARD_LINK_TYPES = [
  "GENERAL",
  "BOOK_CALL",
  "PORTFOLIO",
  "LATEST_OFFER",
  "COMMUNITY",
  "DOWNLOAD",
  "REVIEW",
  "SHOP",
  "MENU",
  "CASE_STUDY"
] as const;

export type CircleCardLinkType = (typeof CIRCLE_CARD_LINK_TYPES)[number];

export const CIRCLE_CARD_FILE_LINK_TYPES = ["DOWNLOAD", "MENU", "CASE_STUDY"] as const;

const CIRCLE_CARD_FILE_LINK_TYPE_SET = new Set<string>(CIRCLE_CARD_FILE_LINK_TYPES);
const SUPPORTED_CIRCLE_CARD_LINK_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "text/html",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalEmail = z.string().trim().email().max(320).optional().or(z.literal(""));
const optionalImagePosition = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().min(0).max(100).optional()
);
const optionalImageScale = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().min(1).max(3).optional()
);
const optionalSlug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "Slug can only contain lowercase letters, numbers, and hyphens."
  });
const checkboxBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean()
);

function optionalHttpUrl(label: string) {
  return z
    .string()
    .trim()
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((value) => normalizeCircleCardUrl(value))
    .refine((value) => !value || isHttpUrl(value), {
      message: `${label} must be a valid web address.`
    });
}

const optionalLinkFileUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return value.startsWith("/api/circle-card/link-file/") || isHttpUrl(value);
  }, "Uploaded file URL must be a valid Circle Card file or web address.");

const optionalDate = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  },
  z.date().optional()
);

const optionalImageUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform((value) => normalizeCircleCardImageUrl(value))
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      return value.startsWith("/uploads/") || isHttpUrl(value);
    },
    {
      message: "Image must be an uploaded image path or a valid web address."
    }
  );

export const circleCardFormSchema = z.object({
  cardId: z.string().cuid().optional().or(z.literal("")),
  slug: optionalSlug,
  fullName: z.string().trim().min(2).max(120),
  businessName: optionalText(140),
  role: optionalText(120),
  tagline: optionalText(180),
  about: optionalText(1600),
  profileImageUrl: optionalImageUrl,
  businessLogoUrl: optionalImageUrl,
  profileImagePositionX: optionalImagePosition,
  profileImagePositionY: optionalImagePosition,
  profileImageScale: optionalImageScale,
  businessLogoPositionX: optionalImagePosition,
  businessLogoPositionY: optionalImagePosition,
  businessLogoScale: optionalImageScale,
  websiteUrl: optionalHttpUrl("Website"),
  email: optionalEmail,
  phone: optionalText(48),
  location: optionalText(120),
  linkedinUrl: optionalHttpUrl("LinkedIn"),
  tiktokUrl: optionalHttpUrl("TikTok"),
  instagramUrl: optionalHttpUrl("Instagram"),
  xUrl: optionalHttpUrl("X"),
  facebookUrl: optionalHttpUrl("Facebook"),
  youtubeUrl: optionalHttpUrl("YouTube"),
  isPublished: checkboxBoolean.default(false)
});

export type CircleCardFormValues = z.infer<typeof circleCardFormSchema>;

export const circleCardOnboardingSchema = z.object({
  profileImageUrl: optionalImageUrl,
  businessLogoUrl: optionalImageUrl,
  profileImagePositionX: optionalImagePosition,
  profileImagePositionY: optionalImagePosition,
  profileImageScale: optionalImageScale,
  businessLogoPositionX: optionalImagePosition,
  businessLogoPositionY: optionalImagePosition,
  businessLogoScale: optionalImageScale,
  fullName: z.string().trim().min(2).max(120),
  businessName: optionalText(140),
  role: optionalText(120),
  tagline: optionalText(180),
  websiteUrl: optionalHttpUrl("Website"),
  isPublished: checkboxBoolean.default(true)
});

export type CircleCardOnboardingValues = z.infer<typeof circleCardOnboardingSchema>;

export const circleWalletContactDetailsSchema = z.object({
  walletContactId: z.string().cuid(),
  notes: optionalText(2000),
  tagsInput: optionalText(300)
});

export const circleCardLinkFormSchema = z.object({
  cardId: z.string().cuid(),
  linkId: z.string().cuid().optional().or(z.literal("")),
  type: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : "GENERAL"),
    z.enum(CIRCLE_CARD_LINK_TYPES).default("GENERAL")
  ),
  label: z.string().trim().min(2).max(90),
  url: optionalHttpUrl("URL"),
  description: optionalText(220),
  icon: z.enum(CIRCLE_CARD_CUSTOM_LINK_ICONS).optional().or(z.literal("")),
  fileUrl: optionalLinkFileUrl,
  fileName: optionalText(180),
  fileMimeType: optionalText(120).refine((value) => {
    if (!value) {
      return true;
    }

    return SUPPORTED_CIRCLE_CARD_LINK_FILE_MIME_TYPES.has(value);
  }, "Unsupported uploaded file type."),
  buttonText: optionalText(80),
  expiresAt: optionalDate,
  sortOrder: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    },
    z.number().int().min(0).max(999).optional()
  ),
  isActive: checkboxBoolean.default(false)
}).superRefine((value, ctx) => {
  const hasUrl = Boolean(value.url);
  const hasFile = Boolean(value.fileUrl);

  if (CIRCLE_CARD_FILE_LINK_TYPE_SET.has(value.type)) {
    if (!hasUrl && !hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "Add a URL or upload a file for this link type."
      });
    }

    return;
  }

  if (!hasUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: "URL is required for this link type."
    });
  }
});

export const circleCardLinkIdSchema = z.object({
  cardId: z.string().cuid(),
  linkId: z.string().cuid()
});

export const circleCardLinkMoveSchema = circleCardLinkIdSchema.extend({
  direction: z.enum(["up", "down"])
});

export function normalizeCircleCardUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  return normalizeExternalHref(trimmed);
}

function normalizeCircleCardImageUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  return normalizeCircleCardUrl(trimmed);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function nullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function nullableNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseCircleWalletTagsInput(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .map((item) => item.replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-"))
        .filter(Boolean)
    )
  ).slice(0, 12);
}

export function readCircleWalletTags(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function buildCircleCardSlugBase(values: Pick<CircleCardFormValues, "slug" | "fullName" | "businessName">) {
  const candidate = values.slug || values.businessName || values.fullName || "circle-card";
  return slugify(candidate) || "circle-card";
}

export function buildCircleCardSocialLinks(
  values: Pick<
    CircleCardFormValues,
    "linkedinUrl" | "tiktokUrl" | "instagramUrl" | "xUrl" | "facebookUrl" | "youtubeUrl"
  >
): Prisma.InputJsonObject {
  return Object.fromEntries(
    [
      ["linkedin", values.linkedinUrl],
      ["tiktok", values.tiktokUrl],
      ["instagram", values.instagramUrl],
      ["x", values.xUrl],
      ["facebook", values.facebookUrl],
      ["youtube", values.youtubeUrl]
    ].filter((entry): entry is [keyof CircleCardSocialLinks, string] => Boolean(entry[1]))
  );
}

export function readCircleCardSocialLinks(value: Prisma.JsonValue | null | undefined): CircleCardSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const links: CircleCardSocialLinks = {};

  for (const key of CIRCLE_CARD_SOCIAL_FIELDS) {
    const candidate = value[key];

    if (typeof candidate === "string" && isHttpUrl(candidate)) {
      links[key] = candidate;
    }
  }

  return links;
}
