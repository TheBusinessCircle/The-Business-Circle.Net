import type { BlueprintVoteType } from "@prisma/client";

export const BLUEPRINT_DISCUSSION_UNLOCK_THRESHOLD = 10;

export const BLUEPRINT_VOTE_TYPES = [
  "SUPPORT",
  "HIGH_PRIORITY",
  "NEEDS_DISCUSSION"
] as const satisfies readonly BlueprintVoteType[];

export const BLUEPRINT_VOTE_LABELS: Record<BlueprintVoteType, string> = {
  SUPPORT: "Support",
  HIGH_PRIORITY: "High Priority",
  NEEDS_DISCUSSION: "Needs Discussion"
};
