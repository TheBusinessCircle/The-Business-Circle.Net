import { describe, expect, it } from "vitest";
import { createEmptyBlueprintVoteCounts } from "@/server/blueprint/blueprint-policy";
import type { BlueprintRoadmapSectionModel, BlueprintStatusModel } from "@/types/blueprint";
import {
  BCN_CREATION_TIMELINE,
  getBlueprintHistoryProgressGroups,
  hasBlueprintHistoryProgress
} from "@/lib/blueprint/build-history";

function status(label: string): BlueprintStatusModel {
  return {
    id: `status_${label.toLowerCase().replace(/\s+/g, "_")}`,
    label,
    position: 0,
    isHidden: false
  };
}

function section(cards: BlueprintRoadmapSectionModel["cards"]): BlueprintRoadmapSectionModel {
  return {
    id: "section_live",
    title: "Live Foundation",
    copy: "",
    position: 0,
    isHidden: false,
    cards
  };
}

function card(
  input: Partial<BlueprintRoadmapSectionModel["cards"][number]> & {
    id: string;
    title: string;
  }
): BlueprintRoadmapSectionModel["cards"][number] {
  return {
    id: input.id,
    sectionId: "section_live",
    title: input.title,
    shortDescription: input.shortDescription ?? "Short roadmap description.",
    detail: input.detail ?? null,
    tierRelevance: input.tierRelevance ?? null,
    isCurrentFocus: input.isCurrentFocus ?? false,
    isMemberShaped: input.isMemberShaped ?? false,
    discussionMode: input.discussionMode ?? "AUTO",
    position: input.position ?? 0,
    isHidden: input.isHidden ?? false,
    status: input.status ?? null,
    voteCounts: input.voteCounts ?? createEmptyBlueprintVoteCounts(),
    viewerPriorityVote: input.viewerPriorityVote ?? null,
    viewerNeedsDiscussionVote: input.viewerNeedsDiscussionVote ?? false,
    discussionUnlocked: input.discussionUnlocked ?? false,
    comments: input.comments ?? []
  };
}

describe("BCN build history", () => {
  it("contains the required creation timeline entries", () => {
    expect(BCN_CREATION_TIMELINE).toHaveLength(9);
    expect(BCN_CREATION_TIMELINE.map((entry) => entry.title)).toEqual([
      "The idea became a room",
      "The private environment took shape",
      "Founder pricing and tier structure were locked in",
      "The cinematic entry was built",
      "The Founder Audit was added",
      "The Circle Blueprint became member-shaped",
      "Growth Architect access moved inside the Circle",
      "Tier identity became visible",
      "Member experience was refined for launch"
    ]);
  });

  it("groups completed Blueprint items from live, shipped, done, or released statuses", () => {
    const groups = getBlueprintHistoryProgressGroups([
      section([
        card({ id: "live", title: "Community rooms", status: status("Live Now") }),
        card({ id: "shipped", title: "Member directory", status: status("Shipped") })
      ])
    ]);

    expect(groups.find((group) => group.id === "completed")?.items.map((item) => item.title)).toEqual([
      "Community rooms",
      "Member directory"
    ]);
  });

  it("groups member-voted and member-shaped items from votes and discussion state", () => {
    const votedCounts = createEmptyBlueprintVoteCounts();
    votedCounts.SUPPORT = 3;
    votedCounts.HIGH_PRIORITY = 2;
    const shapedCounts = createEmptyBlueprintVoteCounts();
    shapedCounts.NEEDS_DISCUSSION = 5;

    const groups = getBlueprintHistoryProgressGroups([
      section([
        card({ id: "voted", title: "Deeper trust layers", voteCounts: votedCounts }),
        card({
          id: "shaped",
          title: "Unlocked discussion",
          voteCounts: shapedCounts,
          discussionUnlocked: true
        })
      ])
    ]);

    expect(groups.find((group) => group.id === "memberVoted")?.items[0]).toMatchObject({
      title: "Deeper trust layers",
      voteCount: 5
    });
    expect(groups.find((group) => group.id === "memberShaped")?.items[0]).toMatchObject({
      title: "Unlocked discussion",
      needsDiscussionVotes: 5
    });
  });

  it("does not treat Not needed alone as member-voted priority progress", () => {
    const notNeededCounts = createEmptyBlueprintVoteCounts();
    notNeededCounts.NOT_NEEDED = 6;

    const groups = getBlueprintHistoryProgressGroups([
      section([card({ id: "negative_only", title: "Low fit idea", voteCounts: notNeededCounts })])
    ]);

    expect(hasBlueprintHistoryProgress(groups)).toBe(false);
  });

  it("labels Not needed signals on items that already appear in build history", () => {
    const counts = createEmptyBlueprintVoteCounts();
    counts.NOT_NEEDED = 4;

    const groups = getBlueprintHistoryProgressGroups([
      section([
        card({
          id: "live_with_signal",
          title: "Live item with negative signal",
          status: status("Live Now"),
          voteCounts: counts
        })
      ])
    ]);

    expect(groups.find((group) => group.id === "completed")?.items[0]).toMatchObject({
      title: "Live item with negative signal",
      notNeededVotes: 4,
      voteCount: 4
    });
  });

  it("reports no history progress when no completed, voted, or member-shaped cards exist", () => {
    const groups = getBlueprintHistoryProgressGroups([
      section([card({ id: "future", title: "Future concept", status: status("Future Vision") })])
    ]);

    expect(hasBlueprintHistoryProgress(groups)).toBe(false);
  });
});
