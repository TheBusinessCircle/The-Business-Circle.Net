import { CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED } from "@/lib/circle-card/plans";
import {
  isSafeCircleCardExternalUrl,
  isSafeCircleCardLinkDestination
} from "@/lib/circle-card/schema";

export const CIRCLE_CARD_PLAN_ORDER = [
  { isDefaultCard: "desc" },
  { isPrimary: "desc" },
  { displayOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" }
] as const;

export const CIRCLE_CARD_LINK_PLAN_ORDER = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
  { id: "asc" }
] as const;

type CircleCardPlanOrderItem = {
  id: string;
  isDefaultCard: boolean;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date | string;
};

type CircleCardLinkPlanOrderItem = {
  id: string;
  isActive?: boolean;
  visibility: string | null;
  url: string | null;
  fileUrl: string | null;
  sortOrder: number;
  createdAt?: Date | string | null;
};

function timestamp(value: Date | string | null | undefined) {
  if (!value) return 0;
  const resolved = value instanceof Date ? value : new Date(value);
  const time = resolved.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareCircleCardsForPlan(
  left: CircleCardPlanOrderItem,
  right: CircleCardPlanOrderItem
) {
  return (
    Number(right.isDefaultCard) - Number(left.isDefaultCard) ||
    Number(right.isPrimary) - Number(left.isPrimary) ||
    left.displayOrder - right.displayOrder ||
    timestamp(left.createdAt) - timestamp(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function selectCircleCardsWithinPlan<T extends CircleCardPlanOrderItem>(
  cards: readonly T[],
  limit: number
) {
  return [...cards].sort(compareCircleCardsForPlan).slice(0, Math.max(0, limit));
}

export function selectCircleCardIdsWithinPlan<T extends CircleCardPlanOrderItem>(
  cards: readonly T[],
  limit: number
) {
  return new Set(selectCircleCardsWithinPlan(cards, limit).map((card) => card.id));
}

export function isCircleCardWithinPlan(
  cardId: string,
  ownerCards: readonly CircleCardPlanOrderItem[],
  limit: number
) {
  return selectCircleCardIdsWithinPlan(ownerCards, limit).has(cardId);
}

export function compareCircleCardLinksForPlan(
  left: CircleCardLinkPlanOrderItem,
  right: CircleCardLinkPlanOrderItem
) {
  return (
    left.sortOrder - right.sortOrder ||
    timestamp(left.createdAt) - timestamp(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function isCircleCardLinkEligibleForPublicLaunch(
  link: CircleCardLinkPlanOrderItem
) {
  if (link.isActive === false) return false;

  if (
    !CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED &&
    (link.visibility === "PRIVATE_CODE" ||
      link.fileUrl?.startsWith("/api/circle-card/link-file/"))
  ) {
    return false;
  }

  return Boolean(
    isSafeCircleCardExternalUrl(link.url) || isSafeCircleCardLinkDestination(link.fileUrl)
  );
}

export function selectCircleCardLinksWithinPlan<T extends CircleCardLinkPlanOrderItem>(
  links: readonly T[],
  limit: number
) {
  return [...links]
    .sort(compareCircleCardLinksForPlan)
    .filter((link) => isCircleCardLinkEligibleForPublicLaunch(link))
    .slice(0, Math.max(0, limit));
}
