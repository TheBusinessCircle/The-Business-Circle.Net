import type { CircleCardType, Prisma } from "@prisma/client";

export const CIRCLE_CARD_TYPES = [
  "PERSONAL",
  "BUSINESS",
  "CREATOR"
] as const satisfies readonly CircleCardType[];

export const DEFAULT_CIRCLE_CARD_TYPE: CircleCardType = "PERSONAL";

export const CIRCLE_CARD_TYPE_COPY: Record<
  CircleCardType,
  {
    label: string;
    shortLabel: string;
    description: string;
  }
> = {
  PERSONAL: {
    label: "Personal",
    shortLabel: "Personal",
    description: "Individual identity, networking and relationship sharing."
  },
  BUSINESS: {
    label: "Business",
    shortLabel: "Business",
    description: "Business, brand, services and offer-led card foundation."
  },
  CREATOR: {
    label: "Creator",
    shortLabel: "Creator",
    description: "Creator, content, launch and audience-led card foundation."
  }
};

export function resolveCircleCardType(
  value: FormDataEntryValue | string | null | undefined,
  fallback: CircleCardType = DEFAULT_CIRCLE_CARD_TYPE
): CircleCardType {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();

  return CIRCLE_CARD_TYPES.includes(normalized as CircleCardType)
    ? (normalized as CircleCardType)
    : fallback;
}

export function getCircleCardTypeLabel(value: CircleCardType | null | undefined) {
  return value ? CIRCLE_CARD_TYPE_COPY[value]?.shortLabel ?? value : null;
}

export function buildCircleCardTypeFilterWhere(input: {
  cardType?: CircleCardType | null;
}): Prisma.CircleCardWhereInput {
  return input.cardType ? { cardType: input.cardType } : {};
}
