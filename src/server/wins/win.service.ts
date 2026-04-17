import "server-only";

import {
  ModerationActionType,
  ModerationEntityType,
  Prisma,
  WinCategory,
  WinParticipantRole,
  WinParticipantStatus,
  WinStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type {
  DirectMessageMemberSummary,
  WinAdminStats,
  WinAttachmentModel,
  WinCardModel,
  WinDetailModel,
  WinEditorSeedModel,
  WinParticipantModel
} from "@/types";

const winMemberSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  membershipTier: true,
  memberRoleTag: true,
  foundingTier: true,
  profile: {
    select: {
      headline: true,
      bio: true,
      collaborationTags: true,
      business: {
        select: {
          companyName: true
        }
      }
    }
  }
} satisfies Prisma.UserSelect;

type WinMemberRecord = Prisma.UserGetPayload<{
  select: typeof winMemberSelect;
}>;

function toMemberSummary(user: WinMemberRecord): DirectMessageMemberSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    membershipTier: user.membershipTier,
    memberRoleTag: user.memberRoleTag,
    foundingTier: user.foundingTier,
    companyName: user.profile?.business?.companyName ?? null,
    headline: user.profile?.headline ?? null,
    bio: user.profile?.bio ?? null,
    collaborationTags: user.profile?.collaborationTags ?? []
  };
}

function toWinParticipantModel(
  participant: {
    id: string;
    role: WinParticipantRole;
    status: WinParticipantStatus;
    respondedAt: Date | null;
    user: WinMemberRecord;
  }
): WinParticipantModel {
  return {
    id: participant.id,
    role: participant.role,
    status: participant.status,
    respondedAt: participant.respondedAt?.toISOString() ?? null,
    user: toMemberSummary(participant.user)
  };
}

function toWinAttachmentModel(
  attachment: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    kind: "IMAGE" | "FILE";
  }
): WinAttachmentModel {
  return {
    ...attachment,
    url: `/api/wins/attachments/${attachment.id}`
  };
}

function toWinCardModel(
  win: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    category: WinCategory;
    tags: string[];
    quote: string | null;
    status: WinStatus;
    featured: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    author: WinMemberRecord;
    participants: Array<{
      id: string;
      role: WinParticipantRole;
      status: WinParticipantStatus;
      respondedAt: Date | null;
      user: WinMemberRecord;
    }>;
  }
): WinCardModel {
  return {
    id: win.id,
    slug: win.slug,
    title: win.title,
    summary: win.summary,
    category: win.category,
    tags: win.tags,
    quote: win.quote,
    status: win.status,
    featured: win.featured,
    publishedAt: win.publishedAt?.toISOString() ?? null,
    createdAt: win.createdAt.toISOString(),
    author: toMemberSummary(win.author),
    participants: win.participants.map(toWinParticipantModel)
  };
}

async function ensureUniqueWinSlug(baseValue: string, currentWinId?: string | null) {
  const baseSlug = slugify(baseValue) || "shared-success";
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db.win.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    });

    if (!existing || existing.id === currentWinId) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function normalizeTags(value: string[] | string) {
  const items = Array.isArray(value) ? value : value.split(",");
  return Array.from(
    new Set(
      items
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
}

export async function listPublishedWins(input: {
  userId: string;
  category?: WinCategory | "";
  tag?: string;
}): Promise<WinCardModel[]> {
  const wins = await db.win.findMany({
    where: {
      status: WinStatus.PUBLISHED,
      ...(input.category ? { category: input.category } : {}),
      ...(input.tag ? { tags: { has: input.tag.trim().toLowerCase() } } : {})
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      author: {
        select: winMemberSelect
      },
      participants: {
        where: {
          status: WinParticipantStatus.APPROVED
        },
        include: {
          user: {
            select: winMemberSelect
          }
        }
      }
    },
    take: 60
  });

  return wins.map(toWinCardModel);
}

export async function listMemberWinDrafts(userId: string): Promise<WinCardModel[]> {
  const wins = await db.win.findMany({
    where: {
      authorId: userId,
      status: {
        in: [WinStatus.DRAFT, WinStatus.PENDING_APPROVAL, WinStatus.CHANGES_REQUESTED]
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      author: {
        select: winMemberSelect
      },
      participants: {
        include: {
          user: {
            select: winMemberSelect
          }
        }
      }
    },
    take: 20
  });

  return wins.map(toWinCardModel);
}

export async function listPendingWinCredits(userId: string): Promise<WinCardModel[]> {
  const wins = await db.win.findMany({
    where: {
      participants: {
        some: {
          userId,
          role: WinParticipantRole.CREDITED,
          status: WinParticipantStatus.PENDING
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      author: {
        select: winMemberSelect
      },
      participants: {
        include: {
          user: {
            select: winMemberSelect
          }
        }
      }
    },
    take: 20
  });

  return wins.map(toWinCardModel);
}

export async function getWinEditorSeed(input: {
  userId: string;
  draftId?: string | null;
  threadId?: string | null;
}): Promise<WinEditorSeedModel> {
  if (input.draftId) {
    const draft = await db.win.findFirst({
      where: {
        id: input.draftId,
        authorId: input.userId
      },
      include: {
        participants: {
          include: {
            user: {
              select: winMemberSelect
            }
          }
        }
      }
    });

    if (draft) {
      const availableParticipants = draft.participants.map(toWinParticipantModel);

      if (draft.sourceThreadId) {
        const thread = await db.directMessageThread.findUnique({
          where: {
            id: draft.sourceThreadId
          },
          include: {
            participants: {
              include: {
                user: {
                  select: winMemberSelect
                }
              }
            }
          }
        });

        if (thread) {
          const seenUserIds = new Set(availableParticipants.map((participant) => participant.user.id));
          thread.participants
            .filter((participant) => participant.userId !== input.userId && !seenUserIds.has(participant.userId))
            .forEach((participant) => {
              availableParticipants.push(
                toWinParticipantModel({
                  id: `seed-${participant.userId}`,
                  role: WinParticipantRole.CREDITED,
                  status: WinParticipantStatus.PENDING,
                  respondedAt: null,
                  user: participant.user
                })
              );
            });
        }
      }

      return {
        id: draft.id,
        threadId: draft.sourceThreadId,
        title: draft.title,
        summary: draft.summary,
        category: draft.category,
        tags: draft.tags,
        quote: draft.quote ?? "",
        creditedUserIds: draft.participants
          .filter((participant) => participant.role === WinParticipantRole.CREDITED)
          .map((participant) => participant.userId),
        participants: availableParticipants
      };
    }
  }

  if (input.threadId) {
    const participant = await db.directMessageParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: input.userId
        }
      },
      include: {
        thread: {
          include: {
            participants: {
              include: {
                user: {
                  select: winMemberSelect
                }
              }
            }
          }
        }
      }
    });

    if (participant) {
      const otherParticipant = participant.thread.participants.find(
        (threadParticipant) => threadParticipant.userId !== input.userId
      );

      return {
        id: null,
        threadId: input.threadId,
        title: "",
        summary: "",
        category: WinCategory.COLLABORATION,
        tags: [],
        quote: "",
        creditedUserIds: otherParticipant ? [otherParticipant.userId] : [],
        participants: otherParticipant ? [toWinParticipantModel({
          id: `seed-${otherParticipant.userId}`,
          role: WinParticipantRole.CREDITED,
          status: WinParticipantStatus.PENDING,
          respondedAt: null,
          user: otherParticipant.user
        })] : []
      };
    }
  }

  return {
    id: null,
    threadId: input.threadId ?? null,
    title: "",
    summary: "",
    category: WinCategory.COLLABORATION,
    tags: [],
    quote: "",
    creditedUserIds: [],
    participants: []
  };
}

export async function saveWinDraft(input: {
  authorId: string;
  winId?: string | null;
  threadId?: string | null;
  title: string;
  summary: string;
  category: WinCategory;
  tagsInput: string[] | string;
  quote?: string | null;
  creditedUserIds?: string[];
  intent: "save_draft" | "publish";
  attachments?: Array<{
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    kind: "IMAGE" | "FILE";
  }>;
}) {
  const creditedUserIds = Array.from(
    new Set((input.creditedUserIds ?? []).filter((userId) => userId !== input.authorId))
  );
  const tags = normalizeTags(input.tagsInput);
  const slug = await ensureUniqueWinSlug(input.title, input.winId);

  if (input.threadId) {
    const threadParticipant = await db.directMessageParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: input.authorId
        }
      },
      select: {
        userId: true
      }
    });

    if (!threadParticipant) {
      throw new Error("thread-not-found");
    }
  }

  const existingParticipants = input.winId
    ? await db.winParticipant.findMany({
      where: {
          winId: input.winId
        },
        select: {
          id: true,
          userId: true,
          role: true,
          status: true,
          respondedAt: true
        }
      })
    : [];

  const approvedCreditedCount = creditedUserIds.filter((userId) => {
    const existing = existingParticipants.find((participant) => participant.userId === userId);
    return existing?.status === WinParticipantStatus.APPROVED;
  }).length;
  const shouldPublishNow =
    input.intent === "publish" &&
    (creditedUserIds.length === 0 || approvedCreditedCount === creditedUserIds.length);
  const nextStatus =
    input.intent === "save_draft"
      ? WinStatus.DRAFT
      : shouldPublishNow
        ? WinStatus.PUBLISHED
        : WinStatus.PENDING_APPROVAL;
  const publishedAt = shouldPublishNow ? new Date() : null;

  const win = await db.$transaction(async (tx) => {
    const saved = input.winId
      ? await tx.win.update({
          where: {
            id: input.winId
          },
          data: {
            title: input.title.trim(),
            slug,
            summary: input.summary.trim(),
            category: input.category,
            tags,
            quote: input.quote?.trim() || null,
            status: nextStatus,
            sourceThreadId: input.threadId ?? null,
            publishedAt,
            attachments: input.attachments?.length
              ? {
                  create: input.attachments
                }
              : undefined
          }
        })
      : await tx.win.create({
          data: {
            authorId: input.authorId,
            title: input.title.trim(),
            slug,
            summary: input.summary.trim(),
            category: input.category,
            tags,
            quote: input.quote?.trim() || null,
            status: nextStatus,
            sourceThreadId: input.threadId ?? null,
            publishedAt,
            attachments: input.attachments?.length
              ? {
                  create: input.attachments
                }
              : undefined
          }
        });

    const existingByUserId = new Map(existingParticipants.map((participant) => [participant.userId, participant]));

    await tx.winParticipant.upsert({
      where: {
        winId_userId: {
          winId: saved.id,
          userId: input.authorId
        }
      },
      create: {
        winId: saved.id,
        userId: input.authorId,
        role: WinParticipantRole.AUTHOR,
        status: WinParticipantStatus.APPROVED,
        respondedAt: new Date()
      },
      update: {
        role: WinParticipantRole.AUTHOR,
        status: WinParticipantStatus.APPROVED,
        respondedAt: new Date()
      }
    });

    const removableParticipants = existingParticipants.filter(
      (participant) =>
        participant.role === WinParticipantRole.CREDITED &&
        !creditedUserIds.includes(participant.userId)
    );

    if (removableParticipants.length) {
      await tx.winParticipant.deleteMany({
        where: {
          id: {
            in: removableParticipants.map((participant) => participant.id)
          }
        }
      });
    }

    for (const userId of creditedUserIds) {
      const existing = existingByUserId.get(userId);
      const nextParticipantStatus =
        input.intent === "publish"
          ? existing?.status === WinParticipantStatus.APPROVED
            ? WinParticipantStatus.APPROVED
            : WinParticipantStatus.PENDING
          : existing?.status ?? WinParticipantStatus.PENDING;

      await tx.winParticipant.upsert({
        where: {
          winId_userId: {
            winId: saved.id,
            userId
          }
        },
        create: {
          winId: saved.id,
          userId,
          role: WinParticipantRole.CREDITED,
          status: nextParticipantStatus,
          respondedAt:
            nextParticipantStatus === WinParticipantStatus.APPROVED ? new Date() : null
        },
        update: {
          role: WinParticipantRole.CREDITED,
          status: nextParticipantStatus,
          respondedAt:
            nextParticipantStatus === WinParticipantStatus.APPROVED
              ? existing?.status === WinParticipantStatus.APPROVED
                ? existing.respondedAt ?? new Date()
                : new Date()
              : null
        }
      });
    }

    return saved;
  });

  return win;
}

export async function getWinDetailForViewer(input: {
  slug: string;
  userId: string;
  admin?: boolean;
}): Promise<WinDetailModel | null> {
  const win = await db.win.findUnique({
    where: {
      slug: input.slug
    },
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          kind: true
        }
      },
      author: {
        select: winMemberSelect
      },
      participants: {
        include: {
          user: {
            select: winMemberSelect
          }
        }
      }
    }
  });

  if (!win) {
    return null;
  }

  const canView =
    input.admin ||
    win.status === WinStatus.PUBLISHED ||
    win.authorId === input.userId ||
    win.participants.some((participant) => participant.userId === input.userId);

  if (!canView) {
    return null;
  }

  return {
    ...toWinCardModel(win),
    sourceThreadId: win.sourceThreadId,
    attachments: win.attachments.map(toWinAttachmentModel)
  };
}

export async function respondToWinCredit(input: {
  winId: string;
  userId: string;
  decision: "approve" | "decline";
}) {
  const participant = await db.winParticipant.findUnique({
    where: {
      winId_userId: {
        winId: input.winId,
        userId: input.userId
      }
    },
    select: {
      id: true,
      role: true,
      status: true
    }
  });

  if (!participant || participant.role !== WinParticipantRole.CREDITED) {
    throw new Error("credit-not-found");
  }

  const nextParticipantStatus =
    input.decision === "approve" ? WinParticipantStatus.APPROVED : WinParticipantStatus.DECLINED;

  await db.$transaction(async (tx) => {
    await tx.winParticipant.update({
      where: {
        id: participant.id
      },
      data: {
        status: nextParticipantStatus,
        respondedAt: new Date()
      }
    });

    const allParticipants = await tx.winParticipant.findMany({
      where: {
        winId: input.winId
      },
      select: {
        role: true,
        status: true
      }
    });

    const credited = allParticipants.filter(
      (item) => item.role === WinParticipantRole.CREDITED
    );

    const nextWinStatus =
      nextParticipantStatus === WinParticipantStatus.DECLINED
        ? WinStatus.CHANGES_REQUESTED
        : credited.every((item) => item.status === WinParticipantStatus.APPROVED)
          ? WinStatus.PUBLISHED
          : WinStatus.PENDING_APPROVAL;

    await tx.win.update({
      where: {
        id: input.winId
      },
      data: {
        status: nextWinStatus,
        publishedAt: nextWinStatus === WinStatus.PUBLISHED ? new Date() : null
      }
    });
  });
}

export async function getWinAttachmentAccess(input: {
  attachmentId: string;
  userId: string;
  admin?: boolean;
}) {
  const attachment = await db.winAttachment.findUnique({
    where: {
      id: input.attachmentId
    },
    select: {
      id: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      win: {
        select: {
          id: true,
          authorId: true,
          status: true,
          participants: {
            select: {
              userId: true
            }
          }
        }
      }
    }
  });

  if (!attachment) {
    return null;
  }

  const canView =
    input.admin ||
    attachment.win.status === WinStatus.PUBLISHED ||
    attachment.win.authorId === input.userId ||
    attachment.win.participants.some((participant) => participant.userId === input.userId);

  if (!canView) {
    throw new Error("forbidden");
  }

  return attachment;
}

export async function listAdminWins(input: {
  query?: string;
  status?: WinStatus | "";
}): Promise<WinCardModel[]> {
  const query = input.query?.trim();
  const wins = await db.win.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(query
        ? {
            OR: [
              {
                title: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                summary: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                author: {
                  OR: [
                    {
                      name: {
                        contains: query,
                        mode: "insensitive"
                      }
                    },
                    {
                      email: {
                        contains: query,
                        mode: "insensitive"
                      }
                    }
                  ]
                }
              }
            ]
          }
        : {})
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      author: {
        select: winMemberSelect
      },
      participants: {
        include: {
          user: {
            select: winMemberSelect
          }
        }
      }
    },
    take: 120
  });

  return wins.map(toWinCardModel);
}

export async function moderateWinStatus(input: {
  adminUserId: string;
  winId: string;
  status: "PUBLISHED" | "ARCHIVED" | "CHANGES_REQUESTED";
  notes?: string | null;
}) {
  const nextStatus = input.status as WinStatus;
  const win = await db.win.update({
    where: {
      id: input.winId
    },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === WinStatus.PUBLISHED ? new Date() : null
    },
    select: {
      id: true
    }
  });

  await db.moderationAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      entityType: ModerationEntityType.WIN,
      entityId: win.id,
      action: ModerationActionType.CHANGE_WIN_STATUS,
      notes: input.notes?.trim() || null
    }
  });
}

export async function getWinAdminStats(): Promise<WinAdminStats> {
  const [totalWins, publishedWins, pendingApprovalWins, featuredWins] = await Promise.all([
    db.win.count(),
    db.win.count({
      where: {
        status: WinStatus.PUBLISHED
      }
    }),
    db.win.count({
      where: {
        status: WinStatus.PENDING_APPROVAL
      }
    }),
    db.win.count({
      where: {
        featured: true
      }
    })
  ]);

  return {
    totalWins,
    publishedWins,
    pendingApprovalWins,
    featuredWins
  };
}
