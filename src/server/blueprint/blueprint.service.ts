import {
  BlueprintSectionType,
  BlueprintVoteType,
  MembershipTier,
  Prisma,
  Role
} from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertNoBlockedProfanity } from "@/lib/moderation/profanity";
import {
  canParticipateInBlueprint,
  createEmptyBlueprintVoteCounts,
  filterPublicBlueprintRoadmapSections,
  isBlueprintDiscussionUnlocked,
  normalizeBlueprintManagerPayloadOrder
} from "@/server/blueprint/blueprint-policy";
import type {
  BlueprintCardModel,
  BlueprintCommentAuthorModel,
  BlueprintDiscussionCommentModel,
  BlueprintIntroSectionModel,
  BlueprintManagerModel,
  BlueprintManagerPayload,
  BlueprintPageModel,
  BlueprintRoadmapSectionModel,
  BlueprintStatusModel,
  BlueprintVoteCounts
} from "@/types/blueprint";

const DEFAULT_STATUS_LABELS = [
  "Origin",
  "Live Now",
  "In Progress",
  "Under Consideration",
  "Member Shaped",
  "Future Vision"
] as const;

const DEFAULT_INTRO_SECTIONS = [
  {
    title: "Where It Started",
    copy:
      "The Business Circle began with a simple belief: business owners need better rooms, better conversations, and better ways to find the right people without building alone."
  },
  {
    title: "Where We Are Now",
    copy:
      "The foundation is being shaped into a private business owner network with profiles, rooms, resources, trust layers and member-led connection."
  },
  {
    title: "What's Being Built Next",
    copy:
      "The next layer is shaped by the founder's direction, real member needs, and the signals coming from Inner Circle and Core."
  }
] as const;

const DEFAULT_ROADMAP_SECTIONS = [
  {
    title: "Roots",
    copy: "The first layer of the room: trust, clarity, and useful proximity.",
    cards: [
      {
        title: "Founder-led private room",
        shortDescription:
          "A quieter business environment built around signal, trust, and practical owner conversation.",
        statusLabel: "Origin",
        tierRelevance: null,
        isCurrentFocus: false,
        isMemberShaped: false
      },
      {
        title: "Better member discovery",
        shortDescription:
          "Profiles and context that help owners find the right people without turning the network into noise.",
        statusLabel: "Origin",
        tierRelevance: "FOUNDATION" as const,
        isCurrentFocus: false,
        isMemberShaped: true
      }
    ]
  },
  {
    title: "Live Foundation",
    copy: "The active platform base members can use now.",
    cards: [
      {
        title: "Community rooms",
        shortDescription:
          "Focused places for member updates, questions, momentum, and business conversations.",
        statusLabel: "Live Now",
        tierRelevance: "FOUNDATION" as const,
        isCurrentFocus: false,
        isMemberShaped: false
      },
      {
        title: "Resource library",
        shortDescription:
          "Practical resources that support clarity, strategy, action, and better decision-making.",
        statusLabel: "Live Now",
        tierRelevance: "FOUNDATION" as const,
        isCurrentFocus: false,
        isMemberShaped: false
      },
      {
        title: "Member connection signals",
        shortDescription:
          "Wins, recognition, and member activity that make the useful movement inside the room easier to see.",
        statusLabel: "In Progress",
        tierRelevance: "INNER_CIRCLE" as const,
        isCurrentFocus: true,
        isMemberShaped: true
      }
    ]
  },
  {
    title: "Next Build",
    copy: "The next layer is shaped by member signal while the final direction stays founder-led.",
    cards: [
      {
        title: "Blueprint voting and discussion",
        shortDescription:
          "A premium way for Inner Circle and Core members to shape what deserves deeper attention.",
        statusLabel: "Member Shaped",
        tierRelevance: "INNER_CIRCLE" as const,
        isCurrentFocus: true,
        isMemberShaped: true
      },
      {
        title: "Deeper trust layers",
        shortDescription:
          "Additional markers that help members understand reputation, fit, and serious intent.",
        statusLabel: "Under Consideration",
        tierRelevance: "CORE" as const,
        isCurrentFocus: false,
        isMemberShaped: true
      },
      {
        title: "Founder-led strategic map",
        shortDescription:
          "A clearer view of the platform direction without turning the network into a public feature queue.",
        statusLabel: "Future Vision",
        tierRelevance: "CORE" as const,
        isCurrentFocus: false,
        isMemberShaped: false
      }
    ]
  }
] as const;

const blueprintUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  membershipTier: true,
  foundingTier: true
} satisfies Prisma.UserSelect;

type BlueprintUserRecord = Prisma.UserGetPayload<{
  select: typeof blueprintUserSelect;
}>;

type BlueprintCommentRecord = {
  id: string;
  cardId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes?: Array<{ userId: string }>;
  _count?: { likes: number };
  user: BlueprintUserRecord;
};

const managerPayloadSchema = z.object({
  statuses: z.array(
    z.object({
      id: z.string().optional(),
      clientId: z.string().min(1),
      label: z.string().trim().min(1).max(48),
      position: z.number().int().nonnegative(),
      isHidden: z.boolean()
    })
  ).max(18),
  introSections: z.array(
    z.object({
      id: z.string().optional(),
      clientId: z.string().min(1),
      title: z.string().trim().min(1).max(80),
      copy: z.string().trim().max(360),
      position: z.number().int().nonnegative(),
      isHidden: z.boolean()
    })
  ).max(8),
  roadmapSections: z.array(
    z.object({
      id: z.string().optional(),
      clientId: z.string().min(1),
      title: z.string().trim().min(1).max(80),
      copy: z.string().trim().max(300),
      position: z.number().int().nonnegative(),
      isHidden: z.boolean(),
      cards: z.array(
        z.object({
          id: z.string().optional(),
          clientId: z.string().min(1),
          title: z.string().trim().min(1).max(110),
          shortDescription: z.string().trim().min(1).max(260),
          detail: z.string().trim().max(900),
          statusId: z.string(),
          tierRelevance: z.union([
            z.literal(""),
            z.nativeEnum(MembershipTier)
          ]),
          isCurrentFocus: z.boolean(),
          isMemberShaped: z.boolean(),
          discussionMode: z.enum(["AUTO", "LOCKED", "UNLOCKED"]),
          position: z.number().int().nonnegative(),
          isHidden: z.boolean()
        })
      ).max(20)
    })
  ).max(12)
});

function sortByPosition<T extends { position: number; createdAt?: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  });
}

function mapStatus(status: {
  id: string;
  label: string;
  position: number;
  isHidden: boolean;
}): BlueprintStatusModel {
  return {
    id: status.id,
    label: status.label,
    position: status.position,
    isHidden: status.isHidden
  };
}

function mapIntroSection(section: {
  id: string;
  title: string;
  copy: string;
  position: number;
  isHidden: boolean;
}): BlueprintIntroSectionModel {
  return {
    id: section.id,
    title: section.title,
    copy: section.copy,
    position: section.position,
    isHidden: section.isHidden
  };
}

function mapCommentAuthor(user: BlueprintUserRecord): BlueprintCommentAuthorModel {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    membershipTier: user.membershipTier,
    foundingTier: user.foundingTier
  };
}

function buildCommentTree(comments: BlueprintCommentRecord[]): BlueprintDiscussionCommentModel[] {
  const byParentId = new Map<string | null, BlueprintCommentRecord[]>();

  for (const comment of comments) {
    const branch = byParentId.get(comment.parentCommentId) ?? [];
    branch.push(comment);
    byParentId.set(comment.parentCommentId, branch);
  }

  const mapBranch = (parentCommentId: string | null): BlueprintDiscussionCommentModel[] => {
    const branch = byParentId.get(parentCommentId) ?? [];

    return branch.map((comment) => ({
      id: comment.id,
      cardId: comment.cardId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likeCount: comment._count?.likes ?? 0,
      viewerHasLiked: (comment.likes?.length ?? 0) > 0,
      author: mapCommentAuthor(comment.user),
      replies: mapBranch(comment.id)
    }));
  };

  return mapBranch(null);
}

function groupCommentsByCard(comments: BlueprintCommentRecord[]) {
  const byCardId = new Map<string, BlueprintDiscussionCommentModel[]>();
  const commentGroups = new Map<string, BlueprintCommentRecord[]>();

  for (const comment of comments) {
    const group = commentGroups.get(comment.cardId) ?? [];
    group.push(comment);
    commentGroups.set(comment.cardId, group);
  }

  for (const [cardId, cardComments] of commentGroups) {
    byCardId.set(cardId, buildCommentTree(cardComments));
  }

  return byCardId;
}

function makeVoteCountsByCard(
  rows: Array<{ cardId: string; voteType: BlueprintVoteType; _count: { _all: number } }>
) {
  const byCardId = new Map<string, BlueprintVoteCounts>();

  for (const row of rows) {
    const counts = byCardId.get(row.cardId) ?? createEmptyBlueprintVoteCounts();
    counts[row.voteType] = row._count._all;
    byCardId.set(row.cardId, counts);
  }

  return byCardId;
}

async function ensureDefaultBlueprint() {
  const [statusCount, sectionCount] = await Promise.all([
    db.blueprintStatus.count(),
    db.blueprintSection.count()
  ]);

  if (statusCount === 0) {
    await db.blueprintStatus.createMany({
      data: DEFAULT_STATUS_LABELS.map((label, position) => ({
        label,
        position
      }))
    });
  }

  if (sectionCount > 0) {
    return;
  }

  const statuses = await db.blueprintStatus.findMany({
    select: {
      id: true,
      label: true
    }
  });
  const statusIdByLabel = new Map(statuses.map((status) => [status.label, status.id]));

  await db.$transaction(async (tx) => {
    for (const [position, section] of DEFAULT_INTRO_SECTIONS.entries()) {
      await tx.blueprintSection.create({
        data: {
          title: section.title,
          copy: section.copy,
          sectionType: BlueprintSectionType.INTRO,
          position
        }
      });
    }

    for (const [sectionPosition, section] of DEFAULT_ROADMAP_SECTIONS.entries()) {
      await tx.blueprintSection.create({
        data: {
          title: section.title,
          copy: section.copy,
          sectionType: BlueprintSectionType.ROADMAP,
          position: sectionPosition,
          cards: {
            create: section.cards.map((card, cardPosition) => ({
              title: card.title,
              shortDescription: card.shortDescription,
              statusId: statusIdByLabel.get(card.statusLabel) ?? null,
              tierRelevance: card.tierRelevance,
              isCurrentFocus: card.isCurrentFocus,
              isMemberShaped: card.isMemberShaped,
              position: cardPosition
            }))
          }
        }
      });
    }
  });
}

export async function getBlueprintPageData(input: {
  viewerUserId: string;
  viewerRole: Role;
  viewerTier: MembershipTier;
  includeHidden?: boolean;
}): Promise<BlueprintPageModel> {
  await ensureDefaultBlueprint();

  const viewerCanVote = canParticipateInBlueprint({
    role: input.viewerRole,
    membershipTier: input.viewerTier
  });
  const viewerIsAdmin = input.viewerRole === "ADMIN";
  const includeHidden = Boolean(input.includeHidden && viewerIsAdmin);

  const [statuses, introSections, roadmapSections] = await Promise.all([
    db.blueprintStatus.findMany({
      where: includeHidden
        ? undefined
        : {
            isHidden: false
          },
      orderBy: [
        {
          position: "asc"
        },
        {
          createdAt: "asc"
        }
      ],
      select: {
        id: true,
        label: true,
        position: true,
        isHidden: true
      }
    }),
    db.blueprintSection.findMany({
      where: {
        sectionType: BlueprintSectionType.INTRO,
        ...(includeHidden ? {} : { isHidden: false })
      },
      orderBy: [
        {
          position: "asc"
        },
        {
          createdAt: "asc"
        }
      ],
      select: {
        id: true,
        title: true,
        copy: true,
        position: true,
        isHidden: true
      }
    }),
    db.blueprintSection.findMany({
      where: {
        sectionType: BlueprintSectionType.ROADMAP,
        ...(includeHidden ? {} : { isHidden: false })
      },
      orderBy: [
        {
          position: "asc"
        },
        {
          createdAt: "asc"
        }
      ],
      select: {
        id: true,
        title: true,
        copy: true,
        position: true,
        isHidden: true,
        createdAt: true,
        cards: {
          where: includeHidden
            ? undefined
            : {
                isHidden: false
              },
          orderBy: [
            {
              position: "asc"
            },
            {
              createdAt: "asc"
            }
          ],
          select: {
            id: true,
            sectionId: true,
            title: true,
            shortDescription: true,
            detail: true,
            tierRelevance: true,
            isCurrentFocus: true,
            isMemberShaped: true,
            discussionMode: true,
            position: true,
            isHidden: true,
            createdAt: true,
            status: {
              select: {
                id: true,
                label: true,
                position: true,
                isHidden: true
              }
            }
          }
        }
      }
    })
  ]);

  const cardIds = roadmapSections.flatMap((section) => section.cards.map((card) => card.id));
  const [voteRows, viewerVotes] = await Promise.all([
    cardIds.length
      ? db.blueprintVote.groupBy({
          by: ["cardId", "voteType"],
          where: {
            cardId: {
              in: cardIds
            }
          },
          _count: {
            _all: true
          }
        })
      : [],
    cardIds.length
      ? db.blueprintVote.findMany({
          where: {
            userId: input.viewerUserId,
            cardId: {
              in: cardIds
            }
          },
          select: {
            cardId: true,
            voteType: true
          }
        })
      : []
  ]);

  const voteCountsByCard = makeVoteCountsByCard(voteRows);
  const viewerVoteByCard = new Map(viewerVotes.map((vote) => [vote.cardId, vote.voteType]));
  const unlockedCardIds = roadmapSections
    .flatMap((section) => section.cards)
    .filter((card) =>
      isBlueprintDiscussionUnlocked({
        discussionMode: card.discussionMode,
        voteCounts: voteCountsByCard.get(card.id) ?? createEmptyBlueprintVoteCounts()
      })
    )
    .map((card) => card.id);

  const comments =
    viewerCanVote && unlockedCardIds.length
      ? await db.blueprintDiscussionComment.findMany({
          where: {
            cardId: {
              in: unlockedCardIds
            },
            deletedAt: null
          },
          orderBy: {
            createdAt: "asc"
          },
          select: {
            id: true,
            cardId: true,
            parentCommentId: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            likes: {
              where: {
                userId: input.viewerUserId
              },
              select: {
                userId: true
              }
            },
            _count: {
              select: {
                likes: true
              }
            },
            user: {
              select: blueprintUserSelect
            }
          }
        })
      : [];
  const commentsByCard = groupCommentsByCard(comments);

  const mappedRoadmapSections: BlueprintRoadmapSectionModel[] = roadmapSections.map((section) => ({
    id: section.id,
    title: section.title,
    copy: section.copy,
    position: section.position,
    isHidden: section.isHidden,
    cards: sortByPosition(section.cards).map((card): BlueprintCardModel => {
      const voteCounts = voteCountsByCard.get(card.id) ?? createEmptyBlueprintVoteCounts();
      const discussionUnlocked = isBlueprintDiscussionUnlocked({
        discussionMode: card.discussionMode,
        voteCounts
      });

      return {
        id: card.id,
        sectionId: card.sectionId,
        title: card.title,
        shortDescription: card.shortDescription,
        detail: card.detail,
        tierRelevance: card.tierRelevance,
        isCurrentFocus: card.isCurrentFocus,
        isMemberShaped: card.isMemberShaped,
        discussionMode: card.discussionMode,
        position: card.position,
        isHidden: card.isHidden,
        status: card.status && (includeHidden || !card.status.isHidden) ? mapStatus(card.status) : null,
        voteCounts,
        viewerVote: viewerVoteByCard.get(card.id) ?? null,
        discussionUnlocked,
        comments: viewerCanVote && discussionUnlocked ? commentsByCard.get(card.id) ?? [] : []
      };
    })
  }));

  return {
    introSections: introSections.map(mapIntroSection),
    roadmapSections: includeHidden
      ? mappedRoadmapSections
      : filterPublicBlueprintRoadmapSections(mappedRoadmapSections),
    statuses: statuses.map(mapStatus),
    viewerCanVote,
    viewerCanDiscuss: viewerCanVote,
    viewerIsAdmin
  };
}

export async function getBlueprintManagerData(input: {
  viewerUserId: string;
  viewerRole: Role;
  viewerTier: MembershipTier;
}): Promise<BlueprintManagerModel> {
  return getBlueprintPageData({
    ...input,
    includeHidden: true
  });
}

export async function castBlueprintVote(input: {
  cardId: string;
  userId: string;
  userRole: Role;
  userTier: MembershipTier;
  voteType: BlueprintVoteType;
}) {
  if (
    !canParticipateInBlueprint({
      role: input.userRole,
      membershipTier: input.userTier
    })
  ) {
    throw new Error("blueprint-vote-forbidden");
  }

  const card = await db.blueprintCard.findUnique({
    where: {
      id: input.cardId
    },
    select: {
      id: true,
      isHidden: true,
      section: {
        select: {
          isHidden: true
        }
      }
    }
  });

  if (!card || card.isHidden || card.section.isHidden) {
    throw new Error("blueprint-card-not-found");
  }

  return db.blueprintVote.upsert({
    where: {
      cardId_userId: {
        cardId: input.cardId,
        userId: input.userId
      }
    },
    create: {
      cardId: input.cardId,
      userId: input.userId,
      voteType: input.voteType
    },
    update: {
      voteType: input.voteType
    }
  });
}

export async function createBlueprintDiscussionComment(input: {
  cardId: string;
  userId: string;
  userRole: Role;
  userTier: MembershipTier;
  content: string;
  parentCommentId?: string | null;
}) {
  if (
    !canParticipateInBlueprint({
      role: input.userRole,
      membershipTier: input.userTier
    })
  ) {
    throw new Error("blueprint-discussion-forbidden");
  }

  const card = await getBlueprintCardDiscussionState(input.cardId);
  if (!card.unlocked) {
    throw new Error("blueprint-discussion-locked");
  }

  if (input.parentCommentId) {
    const parent = await db.blueprintDiscussionComment.findUnique({
      where: {
        id: input.parentCommentId
      },
      select: {
        id: true,
        cardId: true,
        deletedAt: true
      }
    });

    if (!parent || parent.deletedAt || parent.cardId !== input.cardId) {
      throw new Error("blueprint-comment-forbidden");
    }
  }

  assertNoBlockedProfanity(input.content);

  return db.blueprintDiscussionComment.create({
    data: {
      cardId: input.cardId,
      userId: input.userId,
      parentCommentId: input.parentCommentId ?? null,
      content: input.content.trim()
    }
  });
}

export async function toggleBlueprintDiscussionLike(input: {
  commentId: string;
  userId: string;
  userRole: Role;
  userTier: MembershipTier;
}) {
  if (
    !canParticipateInBlueprint({
      role: input.userRole,
      membershipTier: input.userTier
    })
  ) {
    throw new Error("blueprint-discussion-forbidden");
  }

  const comment = await db.blueprintDiscussionComment.findUnique({
    where: {
      id: input.commentId
    },
    select: {
      id: true,
      cardId: true,
      deletedAt: true
    }
  });

  if (!comment || comment.deletedAt) {
    throw new Error("blueprint-comment-forbidden");
  }

  const card = await getBlueprintCardDiscussionState(comment.cardId);
  if (!card.unlocked) {
    throw new Error("blueprint-discussion-locked");
  }

  const existingLike = await db.blueprintDiscussionLike.findUnique({
    where: {
      commentId_userId: {
        commentId: input.commentId,
        userId: input.userId
      }
    }
  });

  if (existingLike) {
    await db.blueprintDiscussionLike.delete({
      where: {
        commentId_userId: {
          commentId: input.commentId,
          userId: input.userId
        }
      }
    });

    return {
      liked: false,
      cardId: comment.cardId
    };
  }

  await db.blueprintDiscussionLike.create({
    data: {
      commentId: input.commentId,
      userId: input.userId
    }
  });

  return {
    liked: true,
    cardId: comment.cardId
  };
}

export async function deleteBlueprintDiscussionComment(input: {
  commentId: string;
  adminUserId: string;
}) {
  const comment = await db.blueprintDiscussionComment.findUnique({
    where: {
      id: input.commentId
    },
    select: {
      id: true
    }
  });

  if (!comment) {
    throw new Error("blueprint-comment-not-found");
  }

  return db.blueprintDiscussionComment.update({
    where: {
      id: input.commentId
    },
    data: {
      deletedAt: new Date(),
      content: "[Comment removed by admin]"
    }
  });
}

async function getBlueprintCardDiscussionState(cardId: string) {
  const card = await db.blueprintCard.findUnique({
    where: {
      id: cardId
    },
    select: {
      id: true,
      discussionMode: true,
      isHidden: true,
      section: {
        select: {
          isHidden: true
        }
      }
    }
  });

  if (!card || card.isHidden || card.section.isHidden) {
    throw new Error("blueprint-card-not-found");
  }

  const rows = await db.blueprintVote.groupBy({
    by: ["cardId", "voteType"],
    where: {
      cardId
    },
    _count: {
      _all: true
    }
  });
  const voteCounts = makeVoteCountsByCard(rows).get(cardId) ?? createEmptyBlueprintVoteCounts();

  return {
    card,
    unlocked: isBlueprintDiscussionUnlocked({
      discussionMode: card.discussionMode,
      voteCounts
    })
  };
}

function parseManagerPayload(payload: unknown): BlueprintManagerPayload {
  const parsed = managerPayloadSchema.parse(payload);
  return normalizeBlueprintManagerPayloadOrder(parsed);
}

export async function saveBlueprintManagerPayload(input: { payload: unknown }) {
  const payload = parseManagerPayload(input.payload);

  await db.$transaction(async (tx) => {
    const existingStatuses = await tx.blueprintStatus.findMany({
      select: {
        id: true
      }
    });
    const existingStatusIds = new Set(existingStatuses.map((status) => status.id));
    const savedStatusIds = new Set<string>();
    const statusIdByClientId = new Map<string, string>();

    for (const status of payload.statuses) {
      const data = {
        label: status.label.trim(),
        position: status.position,
        isHidden: status.isHidden
      };

      if (status.id && existingStatusIds.has(status.id)) {
        const updated = await tx.blueprintStatus.update({
          where: {
            id: status.id
          },
          data
        });
        savedStatusIds.add(updated.id);
        statusIdByClientId.set(status.clientId, updated.id);
        statusIdByClientId.set(status.id, updated.id);
      } else {
        const created = await tx.blueprintStatus.create({
          data
        });
        savedStatusIds.add(created.id);
        statusIdByClientId.set(status.clientId, created.id);
      }
    }

    await tx.blueprintStatus.deleteMany({
      where: {
        id: {
          notIn: Array.from(savedStatusIds)
        }
      }
    });

    const existingSections = await tx.blueprintSection.findMany({
      select: {
        id: true
      }
    });
    const existingSectionIds = new Set(existingSections.map((section) => section.id));
    const savedSectionIds = new Set<string>();
    const sectionIdByClientId = new Map<string, string>();

    const saveSection = async (
      section:
        | BlueprintManagerPayload["introSections"][number]
        | BlueprintManagerPayload["roadmapSections"][number],
      sectionType: BlueprintSectionType
    ) => {
      const data = {
        title: section.title.trim(),
        copy: section.copy.trim(),
        sectionType,
        position: section.position,
        isHidden: section.isHidden
      };

      if (section.id && existingSectionIds.has(section.id)) {
        const updated = await tx.blueprintSection.update({
          where: {
            id: section.id
          },
          data
        });
        savedSectionIds.add(updated.id);
        sectionIdByClientId.set(section.clientId, updated.id);
        sectionIdByClientId.set(section.id, updated.id);
        return updated.id;
      }

      const created = await tx.blueprintSection.create({
        data
      });
      savedSectionIds.add(created.id);
      sectionIdByClientId.set(section.clientId, created.id);
      return created.id;
    };

    for (const introSection of payload.introSections) {
      await saveSection(introSection, BlueprintSectionType.INTRO);
    }

    const savedCardIds = new Set<string>();
    const existingCards = await tx.blueprintCard.findMany({
      select: {
        id: true
      }
    });
    const existingCardIds = new Set(existingCards.map((card) => card.id));

    for (const roadmapSection of payload.roadmapSections) {
      const sectionId = await saveSection(roadmapSection, BlueprintSectionType.ROADMAP);

      for (const card of roadmapSection.cards) {
        const statusId = statusIdByClientId.get(card.statusId) ?? null;
        const data = {
          sectionId,
          title: card.title.trim(),
          shortDescription: card.shortDescription.trim(),
          detail: card.detail.trim() || null,
          statusId,
          tierRelevance: card.tierRelevance || null,
          isCurrentFocus: card.isCurrentFocus,
          isMemberShaped: card.isMemberShaped,
          discussionMode: card.discussionMode,
          position: card.position,
          isHidden: card.isHidden
        };

        if (card.id && existingCardIds.has(card.id)) {
          const updated = await tx.blueprintCard.update({
            where: {
              id: card.id
            },
            data
          });
          savedCardIds.add(updated.id);
        } else {
          const created = await tx.blueprintCard.create({
            data
          });
          savedCardIds.add(created.id);
        }
      }
    }

    await tx.blueprintCard.deleteMany({
      where: {
        id: {
          notIn: Array.from(savedCardIds)
        }
      }
    });

    await tx.blueprintSection.deleteMany({
      where: {
        id: {
          notIn: Array.from(savedSectionIds)
        }
      }
    });
  });
}

export async function resetBlueprintCardVotes(input: { cardId: string }) {
  await db.blueprintVote.deleteMany({
    where: {
      cardId: input.cardId
    }
  });
}
