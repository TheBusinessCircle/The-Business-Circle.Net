import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normalizeExternalHref } from "@/lib/links";
import { slugify } from "@/lib/utils";

export type CircleCardSocialLinks = {
  linkedin?: string;
  instagram?: string;
  x?: string;
  facebook?: string;
  youtube?: string;
};

export const CIRCLE_CARD_SOCIAL_FIELDS = [
  "linkedin",
  "instagram",
  "x",
  "facebook",
  "youtube"
] as const satisfies readonly (keyof CircleCardSocialLinks)[];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalEmail = z.string().trim().email().max(320).optional().or(z.literal(""));
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
      message: "Profile image must be an uploaded image path or a valid web address."
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
  websiteUrl: optionalHttpUrl("Website"),
  email: optionalEmail,
  phone: optionalText(48),
  location: optionalText(120),
  linkedinUrl: optionalHttpUrl("LinkedIn"),
  instagramUrl: optionalHttpUrl("Instagram"),
  xUrl: optionalHttpUrl("X"),
  facebookUrl: optionalHttpUrl("Facebook"),
  youtubeUrl: optionalHttpUrl("YouTube"),
  isPublished: checkboxBoolean.default(false)
});

export type CircleCardFormValues = z.infer<typeof circleCardFormSchema>;

export const circleWalletContactDetailsSchema = z.object({
  walletContactId: z.string().cuid(),
  notes: optionalText(2000),
  tagsInput: optionalText(300)
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
    "linkedinUrl" | "instagramUrl" | "xUrl" | "facebookUrl" | "youtubeUrl"
  >
): Prisma.InputJsonObject {
  return Object.fromEntries(
    [
      ["linkedin", values.linkedinUrl],
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
