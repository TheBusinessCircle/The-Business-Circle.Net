import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  CIRCLE_CARD_LINK_ACTION_MODES,
  type CircleCardLinkActionMode,
  CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES
} from "@/lib/circle-card/file-actions";
import {
  CIRCLE_CARD_ACCOUNT_TYPES,
  normalizeCircleCardIdentityTags
} from "@/lib/circle-card/identity";
import {
  CIRCLE_CARD_PROFILE_LAYOUTS,
  DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT
} from "@/lib/circle-card/profile-layout";
import {
  CIRCLE_CARD_THEME_SURFACE_STYLES,
  DEFAULT_CIRCLE_CARD_THEME_PRESET,
  resolveCircleCardThemeSurfaceStyle
} from "@/lib/circle-card/theme";
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

export const CIRCLE_CARD_LINK_VISIBILITIES = ["PUBLIC", "PRIVATE_CODE"] as const;

export type CircleCardLinkVisibility = (typeof CIRCLE_CARD_LINK_VISIBILITIES)[number];
export type { CircleCardLinkActionMode };

export const CIRCLE_CARD_CONNECTION_MESSAGE_MAX_LENGTH = 240;

export const CIRCLE_WALLET_CATEGORY_OPTIONS = [
  "Accountant",
  "Photographer",
  "Designer",
  "Developer",
  "Tradesperson",
  "Venue",
  "Consultant",
  "Marketing",
  "Recruitment",
  "Referral Partner",
  "Other"
] as const;

export const CIRCLE_WALLET_MET_AT_OPTIONS = [
  "Strelley Hall",
  "LinkedIn",
  "Business Expo",
  "TikTok Live",
  "Networking Event",
  "Referral"
] as const;

export const CIRCLE_WALLET_LAST_INTERACTION_QUICK_VALUES = [
  "today",
  "one-week-ago",
  "one-month-ago"
] as const;

export type CircleWalletLastInteractionQuick =
  (typeof CIRCLE_WALLET_LAST_INTERACTION_QUICK_VALUES)[number];

const CIRCLE_CARD_FILE_LINK_TYPE_SET = new Set<string>(CIRCLE_CARD_FILE_LINK_TYPES);
const SUPPORTED_CIRCLE_CARD_LINK_FILE_MIME_TYPES = new Set<string>(
  CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES
);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalDateInput = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || isCircleWalletDateInput(value), {
    message: "Use a valid date."
  });
const optionalEmail = z.string().trim().email().max(320).optional().or(z.literal(""));
const optionalSocialHandle = z.string().trim().max(2048).optional().or(z.literal(""));
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
const optionalThemeColor = (fallback: string) =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || fallback)
    .refine((value) => /^#[0-9a-f]{6}$/i.test(value), {
      message: "Use a 6-digit hex colour."
    })
    .transform((value) => value.toUpperCase());
const optionalThemePreset = z
  .string()
  .trim()
  .max(80)
  .optional()
  .or(z.literal(""))
  .transform((value) => value || "");
const circleCardThemeSurfaceStyleInput = z.preprocess(
  (value) =>
    resolveCircleCardThemeSurfaceStyle(
      typeof value === "string" ? value : null,
      DEFAULT_CIRCLE_CARD_THEME_PRESET.surfaceStyle
    ),
  z.enum(CIRCLE_CARD_THEME_SURFACE_STYLES)
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
const optionalCircleCardAccountType = z.preprocess(
  (value) => {
    if (typeof value !== "string" || !value.trim()) {
      return undefined;
    }

    return value.trim().toUpperCase();
  },
  z.enum(CIRCLE_CARD_ACCOUNT_TYPES).optional()
);
const requiredCircleCardAccountType = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(CIRCLE_CARD_ACCOUNT_TYPES)
);
const identityTagsInput = z.preprocess(
  (value) => normalizeCircleCardIdentityTags(Array.isArray(value) ? value : [value ?? ""]),
  z.array(z.string()).max(8)
);
const circleCardProfileLayoutInput = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT,
  z.enum(CIRCLE_CARD_PROFILE_LAYOUTS)
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
  accountType: optionalCircleCardAccountType,
  identityTags: identityTagsInput,
  profileLayout: circleCardProfileLayoutInput,
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
  themePreset: optionalThemePreset,
  themePrimaryColor: optionalThemeColor(DEFAULT_CIRCLE_CARD_THEME_PRESET.primaryColor),
  themeAccentColor: optionalThemeColor(DEFAULT_CIRCLE_CARD_THEME_PRESET.accentColor),
  themeButtonColor: optionalThemeColor(DEFAULT_CIRCLE_CARD_THEME_PRESET.buttonColor),
  themeSurfaceStyle: circleCardThemeSurfaceStyleInput,
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
  accountType: requiredCircleCardAccountType,
  identityTags: identityTagsInput,
  role: optionalText(120),
  tagline: optionalText(180),
  websiteUrl: optionalHttpUrl("Website"),
  isPublished: checkboxBoolean.default(true)
});

export type CircleCardOnboardingValues = z.infer<typeof circleCardOnboardingSchema>;

export const circleCardIdentityFormSchema = z.object({
  cardId: z.string().cuid(),
  returnPath: optionalText(600),
  accountType: requiredCircleCardAccountType,
  identityTags: identityTagsInput
});

export type CircleCardIdentityFormValues = z.infer<typeof circleCardIdentityFormSchema>;

export const circleWalletContactDetailsSchema = z.object({
  walletContactId: z.string().cuid(),
  notes: optionalText(2000),
  metAt: optionalText(140),
  followUpDate: optionalDateInput,
  lastInteractionDate: optionalDateInput,
  lastInteractionQuick: z
    .enum(CIRCLE_WALLET_LAST_INTERACTION_QUICK_VALUES)
    .optional()
    .or(z.literal("")),
  category: optionalText(80),
  tagsInput: optionalText(300)
});

export const circleWalletBusinessCardContactSchema = z
  .object({
    fullName: optionalText(120),
    businessName: optionalText(140),
    role: optionalText(120),
    phone: optionalText(48),
    mobilePhone: optionalText(48),
    email: optionalEmail,
    websiteUrl: optionalHttpUrl("Website"),
    address: optionalText(1000),
    linkedin: optionalSocialHandle,
    instagram: optionalSocialHandle,
    x: optionalSocialHandle,
    facebook: optionalSocialHandle,
    tiktok: optionalSocialHandle,
    youtube: optionalSocialHandle,
    originalCardImageUrl: optionalImageUrl,
    returnPath: optionalText(600)
  })
  .superRefine((value, context) => {
    const hasContactValue = [
      value.fullName,
      value.businessName,
      value.role,
      value.phone,
      value.mobilePhone,
      value.email,
      value.websiteUrl,
      value.address,
      value.linkedin,
      value.instagram,
      value.x,
      value.facebook,
      value.tiktok,
      value.youtube
    ].some(Boolean);

    if (!hasContactValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Add at least one contact detail before saving."
      });
    }
  });

export const circleWalletMatchedCardActionSchema = z.object({
  cardId: z.string().cuid(),
  message: optionalText(CIRCLE_CARD_CONNECTION_MESSAGE_MAX_LENGTH),
  returnPath: optionalText(600)
});

export const circleWalletContactIdSchema = z.object({
  walletContactId: z.string().cuid(),
  returnPath: optionalText(600)
});

export const circleCardConnectionRequestFormSchema = z.object({
  recipientCardId: z.string().cuid(),
  message: optionalText(CIRCLE_CARD_CONNECTION_MESSAGE_MAX_LENGTH)
});

export const circleCardConnectionRequestIdSchema = z.object({
  requestId: z.string().cuid()
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
  actionMode: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : "AUTO"),
    z.enum(CIRCLE_CARD_LINK_ACTION_MODES).default("AUTO")
  ),
  visibility: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : "PUBLIC"),
    z.enum(CIRCLE_CARD_LINK_VISIBILITIES).default("PUBLIC")
  ),
  accessCodePlain: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || /^\d{4}$/.test(value), "Access codes must be 4 digits."),
  accessCodeHint: optionalText(120),
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
  const isFileBackedType = CIRCLE_CARD_FILE_LINK_TYPE_SET.has(value.type);

  if (value.visibility === "PRIVATE_CODE" && !isFileBackedType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["visibility"],
      message: "Private access codes are available for download, menu and case study links."
    });
  }

  if (isFileBackedType) {
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

export function normalizeCircleCardEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

export function normalizeWebsiteDomain(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = normalizeCircleCardUrl(trimmed);

  try {
    const url = new URL(normalized);
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    const domain = trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      ?.trim();

    return domain && domain.includes(".") ? domain : null;
  }
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

export function resolveCircleCardLookupSlug(value?: string | null) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  let candidate = raw;

  try {
    if (/^https?:\/\//i.test(raw)) {
      candidate = new URL(raw).pathname;
    }
  } catch {
    candidate = raw;
  }

  candidate = candidate.split(/[?#]/)[0]?.trim() ?? "";
  const lowerCandidate = candidate.toLowerCase();
  const embeddedCardPathIndex = lowerCandidate.indexOf("/card/");

  if (embeddedCardPathIndex >= 0) {
    candidate = candidate.slice(embeddedCardPathIndex + "/card/".length);
  }

  candidate = candidate
    .replace(/^\/+/, "")
    .replace(/^card\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .split("/")[0]
    ?.trim()
    .toLowerCase() ?? "";

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) ? candidate : null;
}

export function isCircleWalletDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseCircleWalletDateInput(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || !isCircleWalletDateInput(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function resolveCircleWalletLastInteractionDate(input: {
  dateInput?: string | null;
  quick?: CircleWalletLastInteractionQuick | "" | null;
  now?: Date;
}) {
  if (!input.quick) {
    return parseCircleWalletDateInput(input.dateInput);
  }

  const date = utcDateOnly(input.now ?? new Date());

  if (input.quick === "one-week-ago") {
    date.setUTCDate(date.getUTCDate() - 7);
  }

  if (input.quick === "one-month-ago") {
    date.setUTCMonth(date.getUTCMonth() - 1);
  }

  return date;
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

export function buildCircleWalletBusinessCardSocialLinks(
  values: Partial<Record<keyof CircleCardSocialLinks, string>>
): Prisma.InputJsonObject {
  return Object.fromEntries(
    CIRCLE_CARD_SOCIAL_FIELDS.map((field) => {
      const value = values[field]?.trim();
      return value ? [field, value.slice(0, 2048)] : null;
    }).filter((entry): entry is [keyof CircleCardSocialLinks, string] => Boolean(entry))
  );
}

export function readCircleWalletBusinessCardSocialLinks(
  value: Prisma.JsonValue | null | undefined
): CircleCardSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const links: CircleCardSocialLinks = {};

  for (const key of CIRCLE_CARD_SOCIAL_FIELDS) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      links[key] = candidate.trim().slice(0, 2048);
    }
  }

  return links;
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
