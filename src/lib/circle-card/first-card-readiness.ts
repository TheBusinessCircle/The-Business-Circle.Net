import type { CircleCardType } from "@prisma/client";
import { readCircleCardSocialLinks } from "@/lib/circle-card/schema";

export type FirstCircleCardState =
  | "no_card"
  | "card_created_empty"
  | "basics_incomplete"
  | "preview_ready"
  | "publish_ready"
  | "published";

export type FirstCircleCardReadinessInput = {
  cardType?: CircleCardType | null;
  fullName?: string | null;
  profileImageUrl?: string | null;
  businessLogoUrl?: string | null;
  role?: string | null;
  businessName?: string | null;
  tagline?: string | null;
  about?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  socialLinks?: unknown;
  activeCustomLinkCount?: number | null;
  isPublished?: boolean | null;
};

export type FirstCircleCardEssentialId = "identity" | "purpose" | "connection";

export type FirstCircleCardReadiness = {
  state: FirstCircleCardState;
  completionPercentage: number;
  completedEssentials: number;
  totalEssentials: 3;
  previewReady: boolean;
  publishReady: boolean;
  missing: FirstCircleCardEssentialId[];
  essentials: Record<FirstCircleCardEssentialId, boolean>;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasSocialConnection(value: unknown) {
  try {
    return Object.values(readCircleCardSocialLinks(value as never)).some(
      (item) => typeof item === "string" && hasText(item)
    );
  } catch {
    return false;
  }
}

export function calculateFirstCircleCardReadiness(
  card: FirstCircleCardReadinessInput | null | undefined
): FirstCircleCardReadiness {
  if (!card) {
    return {
      state: "no_card",
      completionPercentage: 0,
      completedEssentials: 0,
      totalEssentials: 3,
      previewReady: false,
      publishReady: false,
      missing: ["identity", "purpose", "connection"],
      essentials: { identity: false, purpose: false, connection: false }
    };
  }

  const essentials = {
    identity:
      Boolean(card.cardType) &&
      Boolean(card.fullName?.trim().length && card.fullName.trim().length >= 2) &&
      (hasText(card.profileImageUrl) || hasText(card.businessLogoUrl)),
    purpose:
      (hasText(card.role) || hasText(card.businessName)) &&
      (hasText(card.tagline) || hasText(card.about)),
    connection:
      hasText(card.email) ||
      hasText(card.phone) ||
      hasText(card.websiteUrl) ||
      hasSocialConnection(card.socialLinks) ||
      (card.activeCustomLinkCount ?? 0) > 0
  } satisfies Record<FirstCircleCardEssentialId, boolean>;
  const missing = (Object.keys(essentials) as FirstCircleCardEssentialId[]).filter(
    (key) => !essentials[key]
  );
  const completedEssentials = 3 - missing.length;
  const publishReady = missing.length === 0;
  const previewReady = essentials.identity && essentials.purpose;
  const state: FirstCircleCardState = card.isPublished
    ? "published"
    : publishReady
      ? "publish_ready"
      : previewReady
        ? "preview_ready"
        : completedEssentials === 0
          ? "card_created_empty"
          : "basics_incomplete";

  return {
    state,
    completionPercentage: Math.round((completedEssentials / 3) * 100),
    completedEssentials,
    totalEssentials: 3,
    previewReady,
    publishReady,
    missing,
    essentials
  };
}

export function firstIncompleteCircleCardStep(readiness: FirstCircleCardReadiness) {
  if (!readiness.essentials.identity) return 0;
  if (!readiness.essentials.purpose) return 1;
  if (!readiness.essentials.connection) return 2;
  return 2;
}

export const FIRST_CIRCLE_CARD_MISSING_COPY: Record<FirstCircleCardEssentialId, string> = {
  identity: "Add your name, card type and a profile photo or business logo.",
  purpose: "Add your role or business name and a short description of what you do.",
  connection: "Add one way for people to connect before publishing."
};
