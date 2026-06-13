import type { CircleCardProfileLayout, Prisma } from "@prisma/client";

export const CIRCLE_CARD_PROFILE_LAYOUTS = [
  "CLASSIC",
  "BUSINESS",
  "CREATOR"
] as const satisfies readonly CircleCardProfileLayout[];

export const DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT: CircleCardProfileLayout = "BUSINESS";

export const CIRCLE_CARD_PROFILE_LAYOUT_COPY: Record<
  CircleCardProfileLayout,
  {
    label: string;
    shortLabel: string;
    description: string;
    target: string;
    highlights: string[];
  }
> = {
  CLASSIC: {
    label: "Classic",
    shortLabel: "Classic",
    description: "A clean relationship-first profile for individuals, events and networking.",
    target: "Individuals, networking, events and communities",
    highlights: ["Profile photo", "Short bio", "Contact buttons", "Links"]
  },
  BUSINESS: {
    label: "Business",
    shortLabel: "Business",
    description: "A premium trust-focused profile for founders, companies and services.",
    target: "Founders, businesses, agencies, trades and consultants",
    highlights: ["Business logo", "Contact hub", "Recommendations", "Files"]
  },
  CREATOR: {
    label: "Creator",
    shortLabel: "Creator",
    description: "A visual social-first profile for creators, coaches and personal brands.",
    target: "Creators, coaches, community builders and personal brands",
    highlights: ["Visual header", "Featured links", "Content placeholders", "Social-first"]
  }
};

export const CIRCLE_CARD_COLOUR_PRESET_TYPES = [
  "CUSTOM",
  "FOOTBALL",
  "COUNTRY",
  "BRAND"
] as const;

export type CircleCardColourPresetType = (typeof CIRCLE_CARD_COLOUR_PRESET_TYPES)[number];

export const CIRCLE_CARD_COLOUR_SYSTEM_FOUNDATION = {
  presetTypes: CIRCLE_CARD_COLOUR_PRESET_TYPES,
  slots: ["background", "surface", "accent", "accentSoft", "text", "muted", "border"]
} as const;

export function resolveCircleCardProfileLayout(
  value: FormDataEntryValue | string | null | undefined,
  fallback: CircleCardProfileLayout = DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT
): CircleCardProfileLayout {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return CIRCLE_CARD_PROFILE_LAYOUTS.includes(normalized as CircleCardProfileLayout)
    ? (normalized as CircleCardProfileLayout)
    : fallback;
}

export function resolveCircleCardProfileLayoutFilter(
  value: FormDataEntryValue | string | null | undefined
): CircleCardProfileLayout | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return CIRCLE_CARD_PROFILE_LAYOUTS.includes(normalized as CircleCardProfileLayout)
    ? (normalized as CircleCardProfileLayout)
    : null;
}

export function getCircleCardProfileLayoutLabel(value: CircleCardProfileLayout | null | undefined) {
  return value ? CIRCLE_CARD_PROFILE_LAYOUT_COPY[value]?.shortLabel ?? value : null;
}

export function buildCircleCardProfileLayoutFilterWhere(input: {
  profileLayout?: CircleCardProfileLayout | null;
}): Prisma.CircleCardWhereInput {
  return input.profileLayout ? { profileLayout: input.profileLayout } : {};
}
