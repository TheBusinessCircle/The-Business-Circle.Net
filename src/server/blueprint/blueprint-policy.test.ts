import { describe, expect, it, vi, beforeEach } from "vitest";
import type { BlueprintRoadmapSectionModel } from "@/types/blueprint";
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
    findUnique: vi.fn()
  },
  blueprintVote: {
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
      viewerVote: null,
      discussionUnlocked: false,
      comments: []
    }))
  };
}

describe("Circle Blueprint policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.blueprintCard.findUnique.mockResolvedValue(visibleCard());
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

  it("persists one vote per card and lets the user change vote type", async () => {
    await expect(
      castBlueprintVote({
        cardId: "card_1",
        userId: "user_1",
        userRole: "MEMBER",
        userTier: "FOUNDATION",
        voteType: "SUPPORT"
      })
    ).rejects.toThrow("blueprint-vote-forbidden");

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_1",
      userRole: "MEMBER",
      userTier: "INNER_CIRCLE",
      voteType: "HIGH_PRIORITY"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          cardId_userId: {
            cardId: "card_1",
            userId: "user_1"
          }
        },
        update: {
          voteType: "HIGH_PRIORITY"
        }
      })
    );

    await castBlueprintVote({
      cardId: "card_1",
      userId: "user_2",
      userRole: "MEMBER",
      userTier: "CORE",
      voteType: "NEEDS_DISCUSSION"
    });

    expect(dbMock.blueprintVote.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: {
          voteType: "NEEDS_DISCUSSION"
        }
      })
    );
  });

  it("unlocks discussion when two vote categories reach the threshold", () => {
    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "AUTO",
        voteCounts: {
          SUPPORT: 10,
          HIGH_PRIORITY: 3,
          NEEDS_DISCUSSION: 10
        }
      })
    ).toBe(true);

    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "AUTO",
        voteCounts: {
          SUPPORT: 10,
          HIGH_PRIORITY: 9,
          NEEDS_DISCUSSION: 0
        }
      })
    ).toBe(false);

    expect(
      isBlueprintDiscussionUnlocked({
        discussionMode: "LOCKED",
        voteCounts: {
          SUPPORT: 20,
          HIGH_PRIORITY: 20,
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
