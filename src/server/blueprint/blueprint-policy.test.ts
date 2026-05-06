import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { BlueprintRoadmapSectionModel } from "@/types/blueprint";
import { BLUEPRINT_PRIORITY_VOTE_TYPES, BLUEPRINT_VOTE_LABELS } from "@/config/blueprint";
import {
  canParticipateInBlueprint,
  canViewBlueprint,
  createEmptyBlueprintVoteCounts,
  filterPublicBlueprintRoadmapSections,
  isBlueprintDiscussionUnlocked,
  normalizeBlueprintManagerPayloadOrder
} from "@/server/blueprint/blueprint-policy";

const dbMock = vi.hoisted(() => ({
  blueprintCard: {
    delete: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  blueprintVote: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/moderation/profanity", () => ({
  assertNoBlockedProfanity: vi.fn()
}));

import { castBlueprintVote } from "@/server/blueprint/blueprint.service";

function visibleCard() {
  return {
    id: "card_1",
    discussionMode: "AUTO",
    isHidden: false,
    section: {
      isHidden: false
    }
  };
}

function publicSection(input: {
  id: string;
  position: number;
  isHidden?: boolean;
  cards: Array<{ id: string; position: number; isHidden?: boolean }>;
}): BlueprintRoadmapSectionModel {
  return {
    id: input.id,
    title: input.id,
    copy: "",
    position: input.position,
    isHidden: Boolean(input.isHidden),
    cards: input.cards.map((card) => ({
      id: card.id,
      sectionId: input.id,
      title: card.id,
      shortDescription: "",
      detail: null,
      tierRelevance: null,
      isCurrentFocus: false,
      isMemberShaped: false,
      discussionMode: "AUTO",
      position: card.position,
      isHidden: Boolean(card.isHidden),
      status: null,
      voteCounts: createEmptyBlueprintVoteCounts(),
      viewerPriorityVote: null,
      viewerNeedsDiscussionVote: false,
      discussionUnlocked: false,
      comments: []
    }))
  };
}

describe("Circle Blueprint policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.blueprintCard.findUnique.mockResolvedValue(visibleCard());
    dbMock.blueprintCard.delete.mockImplementation(async (args) => args);
    dbMock.blueprintCard.update.mockImplementation(async (args) => args);
    dbMock.blueprintVote.create.mockImplementation(async (args) => args);
    dbMock.blueprintVote.delete.mockImplementation(async (args) => args);
    dbMock.blueprintVote.findMany.mockResolvedValue([]);
    dbMock.blueprintVote.findUnique.mockResolvedValue(null);
    dbMock.blueprintVote.groupBy.mockResolvedValue([]);
    dbMock.blueprintVote.upsert.mockImplementation(async (args) => args);
  });

  it("allows active members across the membership ladder to view the roadmap", () => {
    expect(canViewBlueprint({ role: "MEMBER", hasActiveSubscription: true, suspended: false })).toBe(true);
    expect(
      canViewBlueprint({ role: "INNER_CIRCLE", hasActiveSubscription: true, suspended: false })
    ).toBe(true);
    expect(canViewBlueprint({ role: "ADMIN", hasActiveSubscription: false, suspended: false })).toBe(true);
  });

  it("keeps Foundation members out of voting while allowing Inner Circle and Core", () => {
    expect(canParticipateInBlueprint({ role: "MEMBER", membershipTier: "FOUNDATION" })).toBe(false);
    expect(canParticipateInBlueprint({ role: "MEMBER", membershipTier: "INNER_CIRCLE" })).toBe(true);
    expect(canParticipateInBlueprint({ role: "MEMBER", membershipTier: "CORE" })).toBe(true);
    expect(canParticipateInBlueprint({ role: "ADMIN", membershipTier: "FOUNDATION" })).toBe(true);
  });

  it("includes Not needed in the build priority vote button group", () => {
    expect(BLUEPRINT_PRIORITY_VOTE_TYPES).toEqual(["SUPPORT", "HIGH_PRIORITY", "NOT_NEEDED"]);
    expect(BLUEPRINT_VOTE_LABELS.NOT_NEEDED).toBe("Not needed");
  });

  it("rejects Foundation vote attempts before writing a vote", async () => {
    await expect(
      castBlueprintVote({
        cardId: "card_1",
        userId: "user_1",
        userRole: "MEMBER",
        userTier: "FOUNDATION",
        voteType: "SUPPORT"
      })
    ).rejects.toThrow("blueprint-vote-forbidden");

    expect(dbMock.blueprintVote.upsert).not.toHaveBeenCalled();
    expect(dbMock.blueprintVote.create).not.toHaveBeenCalled();
  });

  it("lets Inner Circle vote Support as a build priority signal", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_1",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "SUPPORT"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_1",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        create: expect.objectContaining({
          voteGroup: "BUILD_PRIORITY",
          voteType: "SUPPORT"
        }),
        update: {
          voteType: "SUPPORT"
        }
      })
    );
  });

  it("lets Core vote and change Support to High Priority without holding both priority votes", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_2",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "SUPPORT"
    });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_2",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "HIGH_PRIORITY"
    });

    const priorityWrites = dbMock.blueprintVote.upsert.mock.calls.map((call) => call[0]);
    expect(priorityWrites).toHaveLength(2);
    expect(priorityWrites.every((write) => write.where.cardId_userId_voteGroup.voteGroup === "BUILD_PRIORITY")).toBe(true);
    expect(priorityWrites[1]).toEqual(
      expect.objectContaining({
        update: {
          voteType: "HIGH_PRIORITY"
        }
      })
    );
  });

  it("lets Inner Circle vote Not needed as a build priority signal", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_not_needed",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NOT_NEEDED"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_not_needed",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        create: expect.objectContaining({
          voteGroup: "BUILD_PRIORITY",
          voteType: "NOT_NEEDED"
        }),
        update: {
          voteType: "NOT_NEEDED"
        }
      })
    );
  });

  it("lets Not needed replace Support through the build priority group", async () => {
    dbMock.blueprintVote.findUnique.mockResolvedValueOnce({ voteType: "SUPPORT" });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_negative",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "NOT_NEEDED"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_negative",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        update: {
          voteType: "NOT_NEEDED"
        }
      })
    );
  });

  it("lets Not needed replace High Priority through the build priority group", async () => {
    dbMock.blueprintVote.findUnique.mockResolvedValueOnce({ voteType: "HIGH_PRIORITY" });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_negative_priority",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "NOT_NEEDED"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_negative_priority",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        update: {
          voteType: "NOT_NEEDED"
        }
      })
    );
  });

  it("lets Support replace Not needed through the same build priority group", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_support_again",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "SUPPORT"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_support_again",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        update: {
          voteType: "SUPPORT"
        }
      })
    );
  });

  it("lets High Priority replace Not needed through the same build priority group", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_priority_again",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "HIGH_PRIORITY"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_priority_again",
            voteGroup: "BUILD_PRIORITY"
          }
        },
        update: {
          voteType: "HIGH_PRIORITY"
        }
      })
    );
  });

  it("toggles Not needed off when selected again", async () => {
    dbMock.blueprintVote.findUnique.mockResolvedValueOnce({ voteType: "NOT_NEEDED" });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_toggle_negative",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NOT_NEEDED"
    });

    expect(dbMock.blueprintVote.delete).toHaveBeenCalledWith({
      where: {
        cardId_userId_voteGroup: {
          cardId: "card_1",
          userId: "user_toggle_negative",
          voteGroup: "BUILD_PRIORITY"
        }
      }
    });
    expect(dbMock.blueprintVote.upsert).not.toHaveBeenCalled();
  });

  it("lets a user hold Support plus Needs Discussion", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_3",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "SUPPORT"
    });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_3",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NEEDS_DISCUSSION"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId_voteGroup: {
            cardId: "card_1",
            userId: "user_3",
            voteGroup: "BUILD_PRIORITY"
          }
        }
      })
    );
    expect(dbMock.blueprintVote.create).toHaveBeenCalledWith({
      data: {
        cardId: "card_1",
        userId: "user_3",
        voteGroup: "DISCUSSION",
        voteType: "NEEDS_DISCUSSION"
      }
    });
  });

  it("lets a user hold High Priority plus Needs Discussion", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_4",
      userRole: "ADMIN",
      userTier: "FOUNDATION",
      voteType: "HIGH_PRIORITY"
    });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_4",
      userRole: "ADMIN",
      userTier: "FOUNDATION",
      voteType: "NEEDS_DISCUSSION"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          voteGroup: "BUILD_PRIORITY",
          voteType: "HIGH_PRIORITY"
        })
      })
    );
    expect(dbMock.blueprintVote.create).toHaveBeenCalledWith({
      data: {
        cardId: "card_1",
        userId: "user_4",
        voteGroup: "DISCUSSION",
        voteType: "NEEDS_DISCUSSION"
      }
    });
  });

  it("lets a user hold Not needed plus Needs Discussion", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_6",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NOT_NEEDED"
    });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_6",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NEEDS_DISCUSSION"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          voteGroup: "BUILD_PRIORITY",
          voteType: "NOT_NEEDED"
        })
      })
    );
    expect(dbMock.blueprintVote.create).toHaveBeenCalledWith({
      data: {
        cardId: "card_1",
        userId: "user_6",
        voteGroup: "DISCUSSION",
        voteType: "NEEDS_DISCUSSION"
      }
    });
  });

  it("does not hide, delete, or update a roadmap card when Not needed is cast", async () => {
    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_negative_signal",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NOT_NEEDED"
    });

    expect(dbMock.blueprintCard.update).not.toHaveBeenCalled();
    expect(dbMock.blueprintCard.delete).not.toHaveBeenCalled();
    expect(dbMock.blueprintVote.upsert).toHaveBeenCalled();
  });

  it("toggles a Needs Discussion vote separately from priority voting", async () => {
    dbMock.blueprintVote.findUnique.mockResolvedValueOnce({ cardId: "card_1" });

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_5",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "NEEDS_DISCUSSION"
    });

    expect(dbMock.blueprintVote.delete).toHaveBeenCalledWith({
      where: {
        cardId_userId_voteGroup: {
          cardId: "card_1",
          userId: "user_5",
          voteGroup: "DISCUSSION"
        }
      }
    });
  });

  it("unlocks discussion when Needs Discussion reaches five votes", () => {
    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "AUTO",
        voteCounts: {
          SUPPORT: 20,
          HIGH_PRIORITY: 20,
          NOT_NEEDED: 20,
          NEEDS_DISCUSSION: 4
        }
      })
    ).toBe(false);

    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "AUTO",
        voteCounts: {
          SUPPORT: 0,
          HIGH_PRIORITY: 0,
          NOT_NEEDED: 0,
          NEEDS_DISCUSSION: 5
        }
      })
    ).toBe(true);

    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "LOCKED",
        voteCounts: {
          SUPPORT: 20,
          HIGH_PRIORITY: 20,
          NOT_NEEDED: 20,
          NEEDS_DISCUSSION: 20
        }
      })
    ).toBe(false);

    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "UNLOCKED",
        voteCounts: createEmptyBlueprintVoteCounts()
      })
    ).toBe(true);
  });

  it("does not unlock discussion from Not needed votes alone", () => {
    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "AUTO",
        voteCounts: {
          SUPPORT: 0,
          HIGH_PRIORITY: 0,
          NOT_NEEDED: 99,
          NEEDS_DISCUSSION: 0
        }
      })
    ).toBe(false);
  });

  it("uses inline client voting instead of navigating through the Blueprint page action", () => {
    const root = process.cwd();
    const votingPanelSource = readFileSync(
      join(root, "src/components/blueprint/blueprint-voting-panel.tsx"),
      "utf8"
    );
    const pageSource = readFileSync(join(root, "src/app/(member)/blueprint/page.tsx"), "utf8");

    expect(votingPanelSource).toContain("fetch(`/api/blueprint/cards/${cardId}/votes`");
    expect(votingPanelSource).toContain("router.refresh()");
    expect(pageSource).not.toContain("castBlueprintVoteAction");
    expect(pageSource).not.toContain("action={castBlueprintVoteAction}");
  });

  it("normalizes admin reorder payloads for sections and cards", () => {
    const normalized = normalizeBlueprintManagerPayloadOrder({
      statuses: [
        { clientId: "status_b", label: "B", position: 99, isHidden: false },
        { clientId: "status_a", label: "A", position: 42, isHidden: false }
      ],
      introSections: [
        { clientId: "intro_b", title: "B", copy: "", position: 4, isHidden: false },
        { clientId: "intro_a", title: "A", copy: "", position: 2, isHidden: false }
      ],
      roadmapSections: [
        {
          clientId: "section_b",
          title: "B",
          copy: "",
          position: 12,
          isHidden: false,
          cards: [
            {
              clientId: "card_b2",
              title: "B2",
              shortDescription: "B2",
              detail: "",
              statusId: "",
              tierRelevance: "",
              isCurrentFocus: false,
              isMemberShaped: false,
              discussionMode: "AUTO",
              position: 8,
              isHidden: false
            },
            {
              clientId: "card_b1",
              title: "B1",
              shortDescription: "B1",
              detail: "",
              statusId: "",
              tierRelevance: "",
              isCurrentFocus: false,
              isMemberShaped: false,
              discussionMode: "AUTO",
              position: 7,
              isHidden: false
            }
          ]
        }
      ]
    });

    expect(normalized.statuses.map((status) => status.position)).toEqual([0, 1]);
    expect(normalized.introSections.map((section) => section.position)).toEqual([0, 1]);
    expect(normalized.roadmapSections[0]?.position).toBe(0);
    expect(normalized.roadmapSections[0]?.cards.map((card) => card.position)).toEqual([0, 1]);
  });

  it("builds the public roadmap view from the saved order and hides hidden items", () => {
    const sections = filterPublicBlueprintRoadmapSections([
      publicSection({
        id: "hidden_section",
        position: 0,
        isHidden: true,
        cards: [{ id: "hidden_section_card", position: 0 }]
      }),
      publicSection({
        id: "visible_second",
        position: 2,
        cards: [
          { id: "hidden_card", position: 0, isHidden: true },
          { id: "visible_card_b", position: 2 },
          { id: "visible_card_a", position: 1 }
        ]
      }),
      publicSection({
        id: "visible_first",
        position: 1,
        cards: [{ id: "first_card", position: 0 }]
      })
    ]);

    expect(sections.map((section) => section.id)).toEqual(["visible_first", "visible_second"]);
    expect(sections[1]?.cards.map((card) => card.id)).toEqual(["visible_card_a", "visible_card_b"]);
  });
});
