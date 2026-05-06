import type { BlueprintRoadmapSectionModel, BlueprintVoteCounts } from "@/types/blueprint";

export type BuildHistoryEntryType =
  | "origin"
  | "foundation"
  | "membership"
  | "experience"
  | "clarity"
  | "member-shaped"
  | "growth-architect"
  | "identity"
  | "launch-readiness";

export type BuildHistoryEntry = {
  title: string;
  body: string;
  type: BuildHistoryEntryType;
};

export const BCN_CREATION_TIMELINE: BuildHistoryEntry[] = [
  {
    title: "The idea became a room",
    body:
      "BCN started with a simple problem. Business owners often carry decisions, pressure, and ambition without the right room around them.",
    type: "origin"
  },
  {
    title: "The private environment took shape",
    body:
      "The public site, membership structure, and private member workspace were created to separate signal from noise and give owners a calmer place to operate.",
    type: "foundation"
  },
  {
    title: "Founder pricing and tier structure were locked in",
    body:
      "Foundation, Inner Circle, and Core were shaped to create a clear path from access, to momentum, to highest-signal proximity.",
    type: "membership"
  },
  {
    title: "The cinematic entry was built",
    body:
      "The public entry flow became a deliberate front door, giving visitors a stronger sense that The Business Circle is not just another website.",
    type: "experience"
  },
  {
    title: "The Founder Audit was added",
    body:
      "The audit became a guided checkpoint to help owners understand where they are and which room fits them best before joining.",
    type: "clarity"
  },
  {
    title: "The Circle Blueprint became member-shaped",
    body:
      "Members can now see what is being built, vote on what matters, and help shape the direction of the private environment.",
    type: "member-shaped"
  },
  {
    title: "Growth Architect access moved inside the Circle",
    body:
      "Members now have a private route to strategic support without being pulled back into the public site experience.",
    type: "growth-architect"
  },
  {
    title: "Tier identity became visible",
    body:
      "Inner Circle and Core members gained clearer profile signals, making commitment level and member status easier to recognise across the network.",
    type: "identity"
  },
  {
    title: "Member experience was refined for launch",
    body:
      "The member layout, profile experience, theme controls, footer, navigation, and mobile experience were tightened to make the environment feel more complete.",
    type: "launch-readiness"
  }
];

export type BlueprintHistoryProgressGroupId = "completed" | "memberVoted" | "memberShaped";

export type BlueprintHistoryProgressItem = {
  id: string;
  title: string;
  sectionTitle: string;
  statusLabel: string | null;
  shortDescription: string;
  voteCount: number;
  supportVotes: number;
  highPriorityVotes: number;
  needsDiscussionVotes: number;
  discussionUnlocked: boolean;
  groupId: BlueprintHistoryProgressGroupId;
};

export type BlueprintHistoryProgressGroup = {
  id: BlueprintHistoryProgressGroupId;
  title: string;
  description: string;
  items: BlueprintHistoryProgressItem[];
};

export const BLUEPRINT_HISTORY_PROGRESS_GROUP_META: Array<
  Omit<BlueprintHistoryProgressGroup, "items">
> = [
  {
    id: "completed",
    title: "Completed",
    description: "Items that are live, released, shipped, done, or otherwise complete."
  },
  {
    id: "memberVoted",
    title: "Voted or high-priority",
    description: "Ideas with Support or High Priority signals from members."
  },
  {
    id: "memberShaped",
    title: "Discussion unlocked or member-shaped",
    description: "Ideas shaped by discussion requests, unlocked threads, or member input."
  }
];

const COMPLETED_STATUS_TERMS = ["completed", "complete", "done", "shipped", "released", "live"];
const MEMBER_VOTED_STATUS_TERMS = ["high priority", "support votes", "voted", "member-voted"];
const MEMBER_SHAPED_STATUS_TERMS = [
  "needs discussion",
  "discussion unlocked",
  "member-shaped",
  "member shaped"
];

function normalizeStatusLabel(label: string | null | undefined) {
  return label?.trim().toLowerCase() ?? "";
}

function statusHasAnyTerm(label: string | null | undefined, terms: string[]) {
  const normalized = normalizeStatusLabel(label);

  return terms.some((term) => normalized.includes(term));
}

function voteCount(voteCounts: BlueprintVoteCounts) {
  return {
    supportVotes: voteCounts.SUPPORT ?? 0,
    highPriorityVotes: voteCounts.HIGH_PRIORITY ?? 0,
    needsDiscussionVotes: voteCounts.NEEDS_DISCUSSION ?? 0
  };
}

export function getBlueprintHistoryProgressGroups(
  sections: BlueprintRoadmapSectionModel[]
): BlueprintHistoryProgressGroup[] {
  const grouped = new Map<BlueprintHistoryProgressGroupId, BlueprintHistoryProgressItem[]>(
    BLUEPRINT_HISTORY_PROGRESS_GROUP_META.map((group) => [group.id, []])
  );

  sections.forEach((section) => {
    section.cards.forEach((card) => {
      const statusLabel = card.status?.label ?? null;
      const { supportVotes, highPriorityVotes, needsDiscussionVotes } = voteCount(card.voteCounts);
      const priorityVoteCount = supportVotes + highPriorityVotes;
      const totalVoteCount = priorityVoteCount + needsDiscussionVotes;
      const isCompleted = statusHasAnyTerm(statusLabel, COMPLETED_STATUS_TERMS);
      const isMemberVoted =
        priorityVoteCount > 0 || statusHasAnyTerm(statusLabel, MEMBER_VOTED_STATUS_TERMS);
      const isMemberShaped =
        card.isMemberShaped ||
        card.discussionUnlocked ||
        needsDiscussionVotes > 0 ||
        statusHasAnyTerm(statusLabel, MEMBER_SHAPED_STATUS_TERMS);
      const groupId: BlueprintHistoryProgressGroupId | null = isCompleted
        ? "completed"
        : isMemberVoted
          ? "memberVoted"
          : isMemberShaped
            ? "memberShaped"
            : null;

      if (!groupId) {
        return;
      }

      const items = grouped.get(groupId) ?? [];
      items.push({
        id: card.id,
        title: card.title,
        sectionTitle: section.title,
        statusLabel,
        shortDescription: card.shortDescription,
        voteCount: totalVoteCount,
        supportVotes,
        highPriorityVotes,
        needsDiscussionVotes,
        discussionUnlocked: card.discussionUnlocked,
        groupId
      });
      grouped.set(groupId, items);
    });
  });

  return BLUEPRINT_HISTORY_PROGRESS_GROUP_META.map((group) => ({
    ...group,
    items: [...(grouped.get(group.id) ?? [])].sort((a, b) => b.voteCount - a.voteCount)
  }));
}

export function hasBlueprintHistoryProgress(groups: BlueprintHistoryProgressGroup[]) {
  return groups.some((group) => group.items.length > 0);
}
