import type {
  BlueprintDiscussionMode,
  MembershipTier,
  Role
} from "@prisma/client";
import { canTierAccess, resolveEffectiveTier } from "@/lib/auth/permissions";
import type {
  BlueprintManagerPayload,
  BlueprintRoadmapSectionModel,
  BlueprintVoteCounts
} from "@/types/blueprint";
import {
  BLUEPRINT_DISCUSSION_UNLOCK_THRESHOLD,
  BLUEPRINT_VOTE_TYPES
} from "@/config/blueprint";

export {
  BLUEPRINT_DISCUSSION_UNLOCK_THRESHOLD,
  BLUEPRINT_VOTE_LABELS,
  BLUEPRINT_VOTE_TYPES
} from "@/config/blueprint";

export function createEmptyBlueprintVoteCounts(): BlueprintVoteCounts {
  return {
    SUPPORT: 0,
    HIGH_PRIORITY: 0,
    NEEDS_DISCUSSION: 0
  };
}

export function canViewBlueprint(input: {
  role: Role;
  hasActiveSubscription: boolean;
  suspended: boolean;
}): boolean {
  if (input.suspended) {
    return false;
  }

  return input.role === "ADMIN" || input.hasActiveSubscription;
}

export function canParticipateInBlueprint(input: {
  role: Role;
  membershipTier: MembershipTier;
}): boolean {
  if (input.role === "ADMIN") {
    return true;
  }

  return canTierAccess(resolveEffectiveTier(input.role, input.membershipTier), "INNER_CIRCLE");
}

export function isBlueprintDiscussionUnlocked(input: {
  discussionMode: BlueprintDiscussionMode;
  voteCounts: BlueprintVoteCounts;
}): boolean {
  if (input.discussionMode === "LOCKED") {
    return false;
  }

  if (input.discussionMode === "UNLOCKED") {
    return true;
  }

  const categoriesAtThreshold = BLUEPRINT_VOTE_TYPES.filter(
    (voteType) => input.voteCounts[voteType] >= BLUEPRINT_DISCUSSION_UNLOCK_THRESHOLD
  );

  return categoriesAtThreshold.length >= 2;
}

export function filterPublicBlueprintRoadmapSections(
  sections: BlueprintRoadmapSectionModel[]
): BlueprintRoadmapSectionModel[] {
  return sections
    .filter((section) => !section.isHidden)
    .map((section) => ({
      ...section,
      cards: section.cards
        .filter((card) => !card.isHidden)
        .sort((a, b) => a.position - b.position)
    }))
    .filter((section) => section.cards.length > 0)
    .sort((a, b) => a.position - b.position);
}

export function normalizeBlueprintManagerPayloadOrder(
  payload: BlueprintManagerPayload
): BlueprintManagerPayload {
  return {
    statuses: payload.statuses.map((status, position) => ({
      ...status,
      position
    })),
    introSections: payload.introSections.map((section, position) => ({
      ...section,
      position
    })),
    roadmapSections: payload.roadmapSections.map((section, sectionPosition) => ({
      ...section,
      position: sectionPosition,
      cards: section.cards.map((card, cardPosition) => ({
        ...card,
        position: cardPosition
      }))
    }))
  };
}
