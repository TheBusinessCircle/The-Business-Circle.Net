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
import {
  CIRCLE_CARD_TYPES,
  DEFAULT_CIRCLE_CARD_TYPE
} from "@/lib/circle-card/card-types";

export const CIRCLE_CARD_SOCIAL_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "linkedin",
  "x",
  "facebook",
  "discord",
  "website",
  "twitch",
  "podcast",
  "other"
] as const;

export type CircleCardSocialPlatform = (typeof CIRCLE_CARD_SOCIAL_PLATFORMS)[number];

export type CircleCardSocialLink = {
  id: string;
  platform: CircleCardSocialPlatform;
  label: string | null;
  url: string;
  isActive: boolean;
  sortOrder: number;
};

export type CircleCardSocialLinks = Partial<Record<CircleCardSocialPlatform, string>> & {
  links: CircleCardSocialLink[];
};

export const CIRCLE_CARD_SOCIAL_FIELDS = CIRCLE_CARD_SOCIAL_PLATFORMS;

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
const optionalJsonText = z.string().trim().max(30000).optional().or(z.literal(""));
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
const circleCardTypeInput = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : DEFAULT_CIRCLE_CARD_TYPE,
  z.enum(CIRCLE_CARD_TYPES)
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

function normalizeDiscordSocialUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  const normalized = normalizeCircleCardUrl(trimmed);

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (
      host === "discord.gg" ||
      host === "discord.com" ||
      host.endsWith(".discord.com") ||
      host === "discordapp.com" ||
      host.endsWith(".discordapp.com")
    ) {
      return url.toString();
    }
  } catch {
    // Fall through and treat plain values as handles below.
  }

  const handle = trimmed
    .replace(/^@+/, "")
    .replace(/^discord(?:\s+|:)+/i, "")
    .trim();

  if (!handle || handle.length > 80 || /\s/.test(handle)) {
    return normalized;
  }

  return `https://discord.com/users/${encodeURIComponent(handle)}`;
}

const optionalDiscordSocialUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform((value) => normalizeDiscordSocialUrl(value))
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");

        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          (host === "discord.gg" ||
            host === "discord.com" ||
            host.endsWith(".discord.com") ||
            host === "discordapp.com" ||
            host.endsWith(".discordapp.com"))
        );
      } catch {
        return false;
      }
    },
    {
      message: "Discord must be a Discord invite, server URL, user URL, or handle."
    }
  );

export const circleCardFormSchema = z.object({
  cardId: z.string().cuid().optional().or(z.literal("")),
  slug: optionalSlug,
  cardType: circleCardTypeInput,
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
  discordUrl: optionalDiscordSocialUrl,
  socialLinksJson: optionalJsonText,
  isPublished: checkboxBoolean.default(false),
  showInDiscover: checkboxBoolean.default(false)
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
  isPublished: checkboxBoolean.default(true),
  showInDiscover: checkboxBoolean.default(false)
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
  imageUrl: optionalImageUrl,
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

function normalizeCircleCardHandle(value?: string | null) {
  const handle = value
    ?.trim()
    .replace(/^@+/, "")
    .replace(/^\/+|\/+$/g, "")
    .split(/[/?#]/)[0]
    ?.trim();

  if (!handle || handle.length > 120 || /\s/.test(handle)) {
    return "";
  }

  return encodeURIComponent(handle);
}

function normalizeCircleCardSocialUrl(platform: CircleCardSocialPlatform, value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (platform === "discord") {
    return normalizeDiscordSocialUrl(trimmed);
  }

  const normalized = normalizeCircleCardUrl(trimmed);

  if (isHttpUrl(normalized)) {
    return normalized;
  }

  const handle = normalizeCircleCardHandle(trimmed);

  if (!handle) {
    return "";
  }

  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    case "facebook":
      return `https://www.facebook.com/${handle}`;
    case "twitch":
      return `https://www.twitch.tv/${handle}`;
    default:
      return "";
  }
}

function resolveCircleCardSocialPlatform(value: unknown): CircleCardSocialPlatform | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "twitter") {
    return "x";
  }

  return CIRCLE_CARD_SOCIAL_PLATFORMS.includes(normalized as CircleCardSocialPlatform)
    ? (normalized as CircleCardSocialPlatform)
    : null;
}

function normalizeCircleCardSocialLink(input: {
  id?: unknown;
  platform?: unknown;
  label?: unknown;
  url?: unknown;
  handle?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}): CircleCardSocialLink | null {
  const platform = resolveCircleCardSocialPlatform(input.platform);

  if (!platform) {
    return null;
  }

  const rawUrl =
    typeof input.url === "string" && input.url.trim()
      ? input.url
      : typeof input.handle === "string"
        ? input.handle
        : "";
  const url = normalizeCircleCardSocialUrl(platform, rawUrl);

  if (!url || !isHttpUrl(url)) {
    return null;
  }

  const id =
    typeof input.id === "string" && input.id.trim()
      ? input.id.trim().slice(0, 80)
      : `social-${platform}-${Math.random().toString(36).slice(2, 10)}`;
  const label = typeof input.label === "string" ? input.label.trim().slice(0, 80) : "";
  const sortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.max(0, Math.min(999, Math.trunc(input.sortOrder)))
      : 0;
  const isActive =
    input.isActive === false || input.isActive === "false" || input.isActive === "off"
      ? false
      : true;

  return {
    id,
    platform,
    label: label || null,
    url,
    isActive,
    sortOrder
  };
}

function socialLinksWithItems(items: CircleCardSocialLink[]): CircleCardSocialLinks {
  const links = {} as CircleCardSocialLinks;
  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const item of sortedItems) {
    if (!item.isActive || links[item.platform]) {
      continue;
    }

    links[item.platform] = item.url;
  }

  Object.defineProperty(links, "links", {
    value: sortedItems,
    enumerable: false
  });

  return links;
}

export function buildCircleCardSocialLinksJson(
  items: Array<Partial<CircleCardSocialLink> & { handle?: string | null }>
): Prisma.InputJsonObject {
  const normalizedItems = items
    .map((item, index) =>
      normalizeCircleCardSocialLink({
        ...item,
        sortOrder: item.sortOrder ?? index
      })
    )
    .filter((item): item is CircleCardSocialLink => Boolean(item))
    .map((item, index) => ({
      ...item,
      sortOrder: index
    }));

  const firstActiveByPlatform = new Map<CircleCardSocialPlatform, string>();

  for (const item of normalizedItems) {
    if (item.isActive && !firstActiveByPlatform.has(item.platform)) {
      firstActiveByPlatform.set(item.platform, item.url);
    }
  }

  return {
    ...Object.fromEntries(firstActiveByPlatform),
    links: normalizedItems
  } as Prisma.InputJsonObject;
}

function parseCircleCardSocialLinksJson(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
    | "linkedinUrl"
    | "tiktokUrl"
    | "instagramUrl"
    | "xUrl"
    | "facebookUrl"
    | "youtubeUrl"
    | "discordUrl"
    | "socialLinksJson"
  >
): Prisma.InputJsonObject {
  const socialLinksJsonItems = parseCircleCardSocialLinksJson(values.socialLinksJson);

  if (socialLinksJsonItems.length) {
    return buildCircleCardSocialLinksJson(socialLinksJsonItems);
  }

  return buildCircleCardSocialLinksJson([
    { platform: "linkedin", url: values.linkedinUrl },
    { platform: "tiktok", url: values.tiktokUrl },
    { platform: "instagram", url: values.instagramUrl },
    { platform: "x", url: values.xUrl },
    { platform: "facebook", url: values.facebookUrl },
    { platform: "youtube", url: values.youtubeUrl },
    { platform: "discord", url: values.discordUrl }
  ]);
}

export function buildCircleWalletBusinessCardSocialLinks(
  values: Partial<Record<CircleCardSocialPlatform, string>>
): Prisma.InputJsonObject {
  return Object.fromEntries(
    CIRCLE_CARD_SOCIAL_FIELDS.map((field) => {
      const value = values[field]?.trim();
      return value ? [field, value.slice(0, 2048)] : null;
    }).filter((entry): entry is [CircleCardSocialPlatform, string] => Boolean(entry))
  );
}

export function readCircleWalletBusinessCardSocialLinks(
  value: Prisma.JsonValue | null | undefined
): Partial<Record<CircleCardSocialPlatform, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const links: Partial<Record<CircleCardSocialPlatform, string>> = {};

  for (const key of CIRCLE_CARD_SOCIAL_FIELDS) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      links[key] = candidate.trim().slice(0, 2048);
    }
  }

  return links;
}

export function readCircleCardSocialLinks(value: Prisma.JsonValue | null | undefined): CircleCardSocialLinks {
  const socialItems: CircleCardSocialLink[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }

      const normalized = normalizeCircleCardSocialLink({
        ...item,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index
      });

      if (normalized) {
        socialItems.push(normalized);
      }
    });

    return socialLinksWithItems(socialItems);
  }

  if (!value || typeof value !== "object") {
    return socialLinksWithItems([]);
  }

  if (Array.isArray(value.links)) {
    value.links.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }

      const normalized = normalizeCircleCardSocialLink({
        ...item,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index
      });

      if (normalized) {
        socialItems.push(normalized);
      }
    });
  }

  const existingKeys = new Set(socialItems.map((item) => `${item.platform}:${item.url}`));

  for (const [index, key] of CIRCLE_CARD_SOCIAL_FIELDS.entries()) {
    const candidate = value[key];

    if (typeof candidate === "string" && isHttpUrl(candidate)) {
      const normalized = normalizeCircleCardSocialLink({
        id: `legacy-${key}`,
        platform: key,
        url: candidate,
        isActive: true,
        sortOrder: socialItems.length + index
      });

      if (normalized && !existingKeys.has(`${normalized.platform}:${normalized.url}`)) {
        socialItems.push(normalized);
        existingKeys.add(`${normalized.platform}:${normalized.url}`);
      }
    }
  }

  return socialLinksWithItems(socialItems);
}
