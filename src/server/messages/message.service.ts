import "server-only";

import {
  CollaborationStatus,
  DirectMessageAttachmentKind,
  DirectMessageReportReason,
  DirectMessageRequestStatus,
  DirectMessageType,
  ModerationActionType,
  ModerationEntityType,
  ModerationStatus,
  Prisma
} from "@prisma/client";
import { db } from "@/lib/db";
import { assertNoBlockedProfanity } from "@/lib/moderation/profanity";
import { buildCommunityPostPath } from "@/lib/community-paths";
import type {
  DirectMessageRelationshipStateModel,
  DirectMessageAdminStats,
  DirectMessageAttachmentModel,
  DirectMessageModerationReportModel,
  DirectMessageMemberSummary,
  DirectMessageNavCounts,
  DirectMessageOriginSummary,
  DirectMessageRequestModel,
  DirectMessageThreadDetailModel,
  DirectMessageThreadSummaryModel
} from "@/types";

const directMessageMemberSelect = {
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

const directMessageAttachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  kind: true
} satisfies Prisma.DirectMessageAttachmentSelect;

type DirectMessageMemberRecord = Prisma.UserGetPayload<{
  select: typeof directMessageMemberSelect;
}>;

type DirectMessageAttachmentRecord = Prisma.DirectMessageAttachmentGetPayload<{
  select: typeof directMessageAttachmentSelect;
}>;

function toDirectMessageMemberSummary(user: DirectMessageMemberRecord): DirectMessageMemberSummary {
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

function toAttachmentModel(
  attachment: DirectMessageAttachmentRecord,
  basePath: "messages" | "wins"
): DirectMessageAttachmentModel {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    kind: attachment.kind,
    url:
      basePath === "messages"
        ? `/api/messages/attachments/${attachment.id}`
        : `/api/wins/attachments/${attachment.id}`
  };
}

function pairKeyForUsers(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(":");
}

export async function getDirectMessageRelationshipStateMap(input: {
  viewerUserId: string;
  targetUserIds: string[];
}): Promise<Map<string, DirectMessageRelationshipStateModel>> {
  const targetUserIds = Array.from(
    new Set(input.targetUserIds.filter((userId) => userId && userId !== input.viewerUserId))
  );

  if (!targetUserIds.length) {
    return new Map();
  }

  const [blocks, threads, pendingRequests] = await Promise.all([
    db.directMessageBlock.findMany({
      where: {
        OR: [
          {
            blockerId: input.viewerUserId,
            blockedUserId: {
              in: targetUserIds
            }
          },
          {
            blockerId: {
              in: targetUserIds
            },
            blockedUserId: input.viewerUserId
          }
        ]
      },
      select: {
        blockerId: true,
        blockedUserId: true
      }
    }),
    db.directMessageThread.findMany({
      where: {
        pairKey: {
          in: targetUserIds.map((targetUserId) => pairKeyForUsers(input.viewerUserId, targetUserId))
        }
      },
      select: {
        id: true,
        pairKey: true
      }
    }),
    db.directMessageRequest.findMany({
      where: {
        status: DirectMessageRequestStatus.PENDING,
        OR: [
          {
            requesterId: input.viewerUserId,
            recipientId: {
              in: targetUserIds
            }
          },
          {
            requesterId: {
              in: targetUserIds
            },
            recipientId: input.viewerUserId
          }
        ]
      },
      select: {
        id: true,
        requesterId: true,
        recipientId: true
      }
    })
  ]);

  const threadIdByPairKey = new Map(
    threads.map((thread) => [thread.pairKey, thread.id] as const)
  );
  const blockedUserIds = new Set(
    blocks.map((block) =>
      block.blockerId === input.viewerUserId ? block.blockedUserId : block.blockerId
    )
  );
  const pendingRequestByTargetUserId = new Map(
    pendingRequests.map((request) => [
      request.requesterId === input.viewerUserId ? request.recipientId : request.requesterId,
      {
        requestId: request.id,
        direction:
          request.requesterId === input.viewerUserId
            ? ("outgoing" as const)
            : ("incoming" as const)
      }
    ])
  );

  return new Map(
    targetUserIds.map((targetUserId) => [
      targetUserId,
      {
        existingThreadId:
          threadIdByPairKey.get(pairKeyForUsers(input.viewerUserId, targetUserId)) ?? null,
        pendingRequestId: pendingRequestByTargetUserId.get(targetUserId)?.requestId ?? null,
        pendingRequestDirection:
          pendingRequestByTargetUserId.get(targetUserId)?.direction ?? null,
        isBlocked: blockedUserIds.has(targetUserId)
      } satisfies DirectMessageRelationshipStateModel
    ])
  );
}

function previewText(value: string | null | undefined, maxLength = 140) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function buildOriginSummary(input: {
  sourcePost:
    | {
        id: string;
        title: string;
        channel: {
          slug: string;
          name: string;
        };
      }
    | null
    | undefined;
  sourceComment:
    | {
        id: string;
        content: string;
        post: {
          id: string;
          title: string;
          channel: {
            slug: string;
            name: string;
          };
        };
      }
    | null
    | undefined;
}): DirectMessageOriginSummary | null {
  if (input.sourceComment) {
    return {
      postId: input.sourceComment.post.id,
      commentId: input.sourceComment.id,
      channelSlug: input.sourceComment.post.channel.slug,
      channelName: input.sourceComment.post.channel.name,
      postTitle: input.sourceComment.post.title,
      commentPreview: previewText(input.sourceComment.content, 180),
      href: `${buildCommunityPostPath(input.sourceComment.post.id)}#comment-${input.sourceComment.id}`
    };
  }

  if (input.sourcePost) {
    return {
      postId: input.sourcePost.id,
      commentId: null,
      channelSlug: input.sourcePost.channel.slug,
      channelName: input.sourcePost.channel.name,
      postTitle: input.sourcePost.title,
      commentPreview: null,
      href: buildCommunityPostPath(input.sourcePost.id)
    };
  }

  return null;
}

async function getBlockingRelationship(userId: string, otherUserId: string) {
  return db.directMessageBlock.findFirst({
    where: {
      OR: [
        {
          blockerId: userId,
          blockedUserId: otherUserId
        },
        {
          blockerId: otherUserId,
          blockedUserId: userId
        }
      ]
    }
  });
}

async function getEligibleMember(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      suspended: true,
      ...directMessageMemberSelect
    }
  });
}

async function resolveRequestOrigin(input: {
  requesterId: string;
  recipientId: string;
  originPostId?: string | null;
  originCommentId?: string | null;
}) {
  if (input.originCommentId) {
    const comment = await db.communityComment.findUnique({
      where: {
        id: input.originCommentId
      },
      select: {
        id: true,
        userId: true,
        postId: true,
        content: true,
        deletedAt: true,
        post: {
          select: {
            id: true,
            title: true,
            userId: true,
            channel: {
              select: {
                slug: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!comment || comment.deletedAt || comment.userId !== input.recipientId) {
      throw new Error("invalid-direct-message-origin");
    }

    if (comment.userId === input.requesterId) {
      throw new Error("cannot-message-self");
    }

    return {
      originPostId: comment.postId,
      originCommentId: comment.id,
      sourcePost: {
        id: comment.post.id,
        title: comment.post.title,
        channel: comment.post.channel
      },
      sourceComment: {
        id: comment.id,
        content: comment.content,
        post: {
          id: comment.post.id,
          title: comment.post.title,
          channel: comment.post.channel
        }
      }
    };
  }

  if (input.originPostId) {
    const post = await db.communityPost.findUnique({
      where: {
        id: input.originPostId
      },
      select: {
        id: true,
        title: true,
        userId: true,
        deletedAt: true,
        channel: {
          select: {
            slug: true,
            name: true
          }
        }
      }
    });

    if (!post || post.deletedAt || post.userId !== input.recipientId) {
      throw new Error("invalid-direct-message-origin");
    }

    if (post.userId === input.requesterId) {
      throw new Error("cannot-message-self");
    }

    return {
      originPostId: post.id,
      originCommentId: null,
      sourcePost: {
        id: post.id,
        title: post.title,
        channel: post.channel
      },
      sourceComment: null
    };
  }

  throw new Error("invalid-direct-message-origin");
}

async function ensureMessageParticipant(threadId: string, userId: string) {
  const participant = await db.directMessageParticipant.findUnique({
    where: {
      threadId_userId: {
        threadId,
        userId
      }
    },
    select: {
      id: true,
      userId: true,
      threadId: true,
      isArchived: true,
      isMuted: true,
      lastReadAt: true,
      thread: {
        select: {
          id: true,
          participants: {
            select: {
              userId: true
            }
          }
        }
      }
    }
  });

  if (!participant) {
    throw new Error("thread-not-found");
  }

  return participant;
}

async function unreadCountForParticipant(input: {
  threadId: string;
  userId: string;
  lastReadAt: Date | null;
}) {
  return db.directMessage.count({
    where: {
      threadId: input.threadId,
      deletedAt: null,
      senderId: {
        not: input.userId
      },
      ...(input.lastReadAt
        ? {
            createdAt: {
              gt: input.lastReadAt
            }
          }
        : {})
    }
  });
}

export async function getDirectMessageNavCounts(userId: string): Promise<DirectMessageNavCounts> {
  const [participants, pendingRequestCount, pendingWinCredits] = await Promise.all([
    db.directMessageParticipant.findMany({
      where: {
        userId,
        isArchived: false
      },
      select: {
        threadId: true,
        lastReadAt: true
      }
    }),
    db.directMessageRequest.count({
      where: {
        recipientId: userId,
        status: DirectMessageRequestStatus.PENDING
      }
    }),
    db.winParticipant.count({
      where: {
        userId,
        role: "CREDITED",
        status: "PENDING"
      }
    })
  ]);

  const unreadCounts = await Promise.all(
    participants.map((participant) =>
      unreadCountForParticipant({
        threadId: participant.threadId,
        userId,
        lastReadAt: participant.lastReadAt
      })
    )
  );

  return {
    unreadCount: unreadCounts.reduce((sum, count) => sum + count, 0),
    pendingRequestCount,
    pendingWinCredits
  };
}

export async function listInboxThreads(input: {
  userId: string;
  query?: string;
  includeArchived?: boolean;
}): Promise<DirectMessageThreadSummaryModel[]> {
  const participants = await db.directMessageParticipant.findMany({
    where: {
      userId: input.userId,
      ...(input.includeArchived ? {} : { isArchived: false })
    },
    orderBy: [
      {
        thread: {
          lastMessageAt: "desc"
        }
      },
      {
        updatedAt: "desc"
      }
    ],
    include: {
      thread: {
        include: {
          participants: {
            include: {
              user: {
                select: directMessageMemberSelect
              }
            }
          },
          messages: {
            where: {
              deletedAt: null
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              attachments: {
                select: {
                  id: true
                }
              }
            }
          },
          sourcePost: {
            select: {
              id: true,
              title: true,
              channel: {
                select: {
                  slug: true,
                  name: true
                }
              }
            }
          },
          sourceComment: {
            select: {
              id: true,
              content: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  channel: {
                    select: {
                      slug: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const mapped = await Promise.all(
    participants.map(async (participant) => {
      const otherParticipant = participant.thread.participants.find(
        (threadParticipant) => threadParticipant.userId !== input.userId
      );

      if (!otherParticipant) {
        return null;
      }

      const unreadCount = await unreadCountForParticipant({
        threadId: participant.threadId,
        userId: input.userId,
        lastReadAt: participant.lastReadAt
      });
      const lastMessage = participant.thread.messages[0] ?? null;
      const lastMessagePreview =
        previewText(lastMessage?.content) ??
        (lastMessage?.attachments.length ? `${lastMessage.attachments.length} attachment shared` : null);

      return {
        id: participant.threadId,
        otherMember: toDirectMessageMemberSummary(otherParticipant.user),
        lastMessagePreview,
        lastMessageAt: participant.thread.lastMessageAt?.toISOString() ?? lastMessage?.createdAt.toISOString() ?? null,
        unreadCount,
        isArchived: participant.isArchived,
        isMuted: participant.isMuted,
        collaborationStatus: participant.thread.collaborationStatus,
        hasUnread: unreadCount > 0,
        origin: buildOriginSummary({
          sourcePost: participant.thread.sourcePost,
          sourceComment: participant.thread.sourceComment
        })
      } satisfies DirectMessageThreadSummaryModel;
    })
  );

  const filtered = mapped.filter(Boolean) as DirectMessageThreadSummaryModel[];

  if (!input.query?.trim()) {
    return filtered;
  }

  const query = input.query.trim().toLowerCase();
  return filtered.filter((thread) => {
    const haystack = [
      thread.otherMember.name ?? "",
      thread.otherMember.email,
      thread.otherMember.companyName ?? "",
      thread.lastMessagePreview ?? "",
      thread.origin?.postTitle ?? "",
      thread.origin?.channelName ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export async function listDirectMessageRequests(input: {
  userId: string;
  status?: DirectMessageRequestStatus;
  direction?: "received" | "sent" | "all";
}): Promise<DirectMessageRequestModel[]> {
  const where: Prisma.DirectMessageRequestWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.direction === "received"
      ? { recipientId: input.userId }
      : input.direction === "sent"
        ? { requesterId: input.userId }
        : {
            OR: [{ requesterId: input.userId }, { recipientId: input.userId }]
          })
  };

  const requests = await db.directMessageRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      requester: {
        select: directMessageMemberSelect
      },
      recipient: {
        select: directMessageMemberSelect
      },
      originPost: {
        select: {
          id: true,
          title: true,
          channel: {
            select: {
              slug: true,
              name: true
            }
          }
        }
      },
      originComment: {
        select: {
          id: true,
          content: true,
          post: {
            select: {
              id: true,
              title: true,
              channel: {
                select: {
                  slug: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  return requests.map((request) => ({
    id: request.id,
    status: request.status,
    introMessage: request.introMessage,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString() ?? null,
    requester: toDirectMessageMemberSummary(request.requester),
    recipient: toDirectMessageMemberSummary(request.recipient),
    origin: buildOriginSummary({
      sourcePost: request.originPost,
      sourceComment: request.originComment
    }),
    threadId: request.threadId
  }));
}

export async function createDirectMessageRequest(input: {
  requesterId: string;
  recipientId: string;
  originPostId?: string | null;
  originCommentId?: string | null;
  introMessage?: string | null;
}) {
  if (input.requesterId === input.recipientId) {
    throw new Error("cannot-message-self");
  }

  const [requester, recipient] = await Promise.all([
    getEligibleMember(input.requesterId),
    getEligibleMember(input.recipientId)
  ]);

  if (!requester || !recipient || requester.suspended || recipient.suspended) {
    throw new Error("member-unavailable");
  }

  if (!requester.emailVerified) {
    throw new Error("email-verification-required");
  }

  if (!recipient.emailVerified) {
    throw new Error("recipient-not-verified");
  }

  const block = await getBlockingRelationship(input.requesterId, input.recipientId);
  if (block) {
    throw new Error("direct-message-blocked");
  }

  const origin = await resolveRequestOrigin({
    requesterId: input.requesterId,
    recipientId: input.recipientId,
    originPostId: input.originPostId,
    originCommentId: input.originCommentId
  });

  if (input.introMessage?.trim()) {
    assertNoBlockedProfanity(input.introMessage);
  }

  const pairKey = pairKeyForUsers(input.requesterId, input.recipientId);
  const existingThread = await db.directMessageThread.findUnique({
    where: {
      pairKey
    },
    select: {
      id: true
    }
  });

  if (existingThread) {
    return {
      status: "existing-thread" as const,
      threadId: existingThread.id,
      requesterId: input.requesterId,
      recipientId: input.recipientId
    };
  }

  const pendingRequest = await db.directMessageRequest.findFirst({
    where: {
      status: DirectMessageRequestStatus.PENDING,
      OR: [
        {
          requesterId: input.requesterId,
          recipientId: input.recipientId
        },
        {
          requesterId: input.recipientId,
          recipientId: input.requesterId
        }
      ]
    },
    select: {
      id: true,
      requesterId: true,
      recipientId: true
    }
  });

  if (pendingRequest) {
    return {
      status: "pending-existing" as const,
      requestId: pendingRequest.id,
      requesterId: pendingRequest.requesterId,
      recipientId: pendingRequest.recipientId
    };
  }

  const request = await db.directMessageRequest.create({
    data: {
      requesterId: input.requesterId,
      recipientId: input.recipientId,
      introMessage: input.introMessage?.trim() || null,
      originPostId: origin.originPostId,
      originCommentId: origin.originCommentId
    },
    select: {
      id: true
    }
  });

  return {
    status: "created" as const,
    requestId: request.id,
    requesterId: input.requesterId,
    recipientId: input.recipientId
  };
}

export async function respondToDirectMessageRequest(input: {
  requestId: string;
  recipientId: string;
  action: "accept" | "decline" | "block";
}) {
  const request = await db.directMessageRequest.findUnique({
    where: {
      id: input.requestId
    },
    include: {
      requester: {
        select: {
          id: true
        }
      }
    }
  });

  if (!request || request.recipientId !== input.recipientId) {
    throw new Error("request-not-found");
  }

  if (request.status !== DirectMessageRequestStatus.PENDING) {
    return {
      status: request.status,
      threadId: request.threadId,
      requesterId: request.requesterId,
      recipientId: request.recipientId
    };
  }

  if (input.action === "decline") {
    const declined = await db.directMessageRequest.update({
      where: {
        id: request.id
      },
      data: {
        status: DirectMessageRequestStatus.DECLINED,
        respondedAt: new Date()
      },
      select: {
        status: true
      }
    });

    return {
      status: declined.status,
      threadId: null,
      requesterId: request.requesterId,
      recipientId: request.recipientId
    };
  }

  if (input.action === "block") {
    await db.$transaction(async (tx) => {
      await tx.directMessageBlock.upsert({
        where: {
          blockerId_blockedUserId: {
            blockerId: input.recipientId,
            blockedUserId: request.requesterId
          }
        },
        create: {
          blockerId: input.recipientId,
          blockedUserId: request.requesterId,
          reason: "Blocked from a private chat request."
        },
        update: {
          updatedAt: new Date()
        }
      });

      await tx.directMessageRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: DirectMessageRequestStatus.BLOCKED,
          respondedAt: new Date()
        }
      });
    });

    return {
      status: DirectMessageRequestStatus.BLOCKED,
      threadId: null,
      requesterId: request.requesterId,
      recipientId: request.recipientId
    };
  }

  const pairKey = pairKeyForUsers(request.requesterId, request.recipientId);
  const result = await db.$transaction(async (tx) => {
    let thread = await tx.directMessageThread.findUnique({
      where: {
        pairKey
      },
      select: {
        id: true
      }
    });

    if (!thread) {
      thread = await tx.directMessageThread.create({
        data: {
          pairKey,
          sourcePostId: request.originPostId,
          sourceCommentId: request.originCommentId,
          participants: {
            create: [{ userId: request.requesterId }, { userId: request.recipientId }]
          }
        },
        select: {
          id: true
        }
      });
    }

    await tx.directMessageRequest.update({
      where: {
        id: request.id
      },
      data: {
        status: DirectMessageRequestStatus.ACCEPTED,
        respondedAt: new Date(),
        threadId: thread.id
      }
    });

    await tx.directMessageRequest.updateMany({
      where: {
        id: {
          not: request.id
        },
        status: DirectMessageRequestStatus.PENDING,
        OR: [
          {
            requesterId: request.requesterId,
            recipientId: request.recipientId
          },
          {
            requesterId: request.recipientId,
            recipientId: request.requesterId
          }
        ]
      },
      data: {
        status: DirectMessageRequestStatus.DECLINED,
        respondedAt: new Date(),
        threadId: thread.id
      }
    });

    await tx.directMessage.create({
      data: {
        threadId: thread.id,
        senderId: input.recipientId,
        messageType: DirectMessageType.SYSTEM,
        content: "Private chat opened from a community conversation."
      }
    });

    await tx.directMessageThread.update({
      where: {
        id: thread.id
      },
      data: {
        lastMessageAt: new Date()
      }
    });

    return thread;
  });

  return {
    status: DirectMessageRequestStatus.ACCEPTED,
    threadId: result.id,
    requesterId: request.requesterId,
    recipientId: request.recipientId
  };
}

export async function getDirectMessageThreadDetail(input: {
  threadId: string;
  userId: string;
}): Promise<DirectMessageThreadDetailModel | null> {
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
                select: directMessageMemberSelect
              }
            }
          },
          messages: {
            where: {
              deletedAt: null
            },
            orderBy: {
              createdAt: "asc"
            },
            take: 200,
            include: {
              sender: {
                select: directMessageMemberSelect
              },
              attachments: {
                select: directMessageAttachmentSelect
              }
            }
          },
          sourcePost: {
            select: {
              id: true,
              title: true,
              channel: {
                select: {
                  slug: true,
                  name: true
                }
              }
            }
          },
          sourceComment: {
            select: {
              id: true,
              content: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  channel: {
                    select: {
                      slug: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!participant) {
    return null;
  }

  const otherParticipant = participant.thread.participants.find(
    (threadParticipant) => threadParticipant.userId !== input.userId
  );

  if (!otherParticipant) {
    return null;
  }

  const block = await getBlockingRelationship(input.userId, otherParticipant.userId);
  const latestDraft = await db.win.findFirst({
    where: {
      sourceThreadId: input.threadId,
      authorId: input.userId,
      status: {
        in: ["DRAFT", "CHANGES_REQUESTED", "PENDING_APPROVAL"]
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true
    }
  });

  return {
    id: participant.threadId,
    collaborationStatus: participant.thread.collaborationStatus,
    collaborationNotes: participant.thread.collaborationNotes,
    pinnedSummary: participant.thread.pinnedSummary,
    lastMessageAt: participant.thread.lastMessageAt?.toISOString() ?? null,
    otherMember: toDirectMessageMemberSummary(otherParticipant.user),
    messages: participant.thread.messages.map((message) => ({
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      isEdited: Boolean(message.editedAt),
      sender: toDirectMessageMemberSummary(message.sender),
      attachments: message.attachments.map((attachment) => toAttachmentModel(attachment, "messages"))
    })),
    origin: buildOriginSummary({
      sourcePost: participant.thread.sourcePost,
      sourceComment: participant.thread.sourceComment
    }),
    isArchived: participant.isArchived,
    isMuted: participant.isMuted,
    isBlockedByViewer: block?.blockerId === input.userId,
    hasBlockedViewer: block?.blockedUserId === input.userId,
    seenByOtherAt: otherParticipant.lastReadAt?.toISOString() ?? null,
    latestDraftWinId: latestDraft?.id ?? null
  };
}

export async function markDirectMessageThreadRead(input: {
  threadId: string;
  userId: string;
}) {
  await ensureMessageParticipant(input.threadId, input.userId);

  const latestMessage = await db.directMessage.findFirst({
    where: {
      threadId: input.threadId,
      deletedAt: null
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true
    }
  });

  return db.directMessageParticipant.update({
    where: {
      threadId_userId: {
        threadId: input.threadId,
        userId: input.userId
      }
    },
    data: {
      lastReadAt: new Date(),
      lastReadMessageId: latestMessage?.id ?? null
    }
  });
}

export async function sendDirectMessage(input: {
  threadId: string;
  senderId: string;
  content: string;
  attachments?: Array<{
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    kind: DirectMessageAttachmentKind;
  }>;
}) {
  const participant = await ensureMessageParticipant(input.threadId, input.senderId);
  const otherParticipant = participant.thread.participants.find(
    (threadParticipant) => threadParticipant.userId !== input.senderId
  );

  if (!otherParticipant) {
    throw new Error("thread-not-found");
  }

  const block = await getBlockingRelationship(input.senderId, otherParticipant.userId);
  if (block) {
    throw new Error("direct-message-blocked");
  }

  const trimmedContent = input.content.trim();
  if (!trimmedContent.length && !(input.attachments?.length ?? 0)) {
    throw new Error("message-empty");
  }

  if (trimmedContent.length) {
    assertNoBlockedProfanity(trimmedContent);
  }

  const createdMessage = await db.$transaction(async (tx) => {
    const message = await tx.directMessage.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        content: trimmedContent,
        messageType: DirectMessageType.TEXT,
        attachments: input.attachments?.length
          ? {
              create: input.attachments
            }
          : undefined
      },
      include: {
        sender: {
          select: directMessageMemberSelect
        },
        attachments: {
          select: directMessageAttachmentSelect
        }
      }
    });

    await tx.directMessageThread.update({
      where: {
        id: input.threadId
      },
      data: {
        lastMessageAt: message.createdAt
      }
    });

    await tx.directMessageParticipant.update({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: input.senderId
        }
      },
      data: {
        isArchived: false,
        archivedAt: null,
        lastReadAt: message.createdAt,
        lastReadMessageId: message.id
      }
    });

    return message;
  });

  return {
    id: createdMessage.id,
    threadId: createdMessage.threadId,
    senderId: createdMessage.senderId,
    content: createdMessage.content,
    messageType: createdMessage.messageType,
    createdAt: createdMessage.createdAt.toISOString(),
    updatedAt: createdMessage.updatedAt.toISOString(),
    isEdited: Boolean(createdMessage.editedAt),
    sender: toDirectMessageMemberSummary(createdMessage.sender),
    attachments: createdMessage.attachments.map((attachment) => toAttachmentModel(attachment, "messages")),
    participantUserIds: [input.senderId, otherParticipant.userId]
  };
}

export async function setDirectMessageArchiveState(input: {
  threadId: string;
  userId: string;
  archived: boolean;
}) {
  await ensureMessageParticipant(input.threadId, input.userId);

  return db.directMessageParticipant.update({
    where: {
      threadId_userId: {
        threadId: input.threadId,
        userId: input.userId
      }
    },
    data: {
      isArchived: input.archived,
      archivedAt: input.archived ? new Date() : null
    }
  });
}

export async function setDirectMessageMuteState(input: {
  threadId: string;
  userId: string;
  muted: boolean;
}) {
  await ensureMessageParticipant(input.threadId, input.userId);

  return db.directMessageParticipant.update({
    where: {
      threadId_userId: {
        threadId: input.threadId,
        userId: input.userId
      }
    },
    data: {
      isMuted: input.muted,
      mutedAt: input.muted ? new Date() : null
    }
  });
}

export async function updateDirectMessageCollaboration(input: {
  threadId: string;
  userId: string;
  collaborationStatus: CollaborationStatus;
  collaborationNotes?: string | null;
}) {
  await ensureMessageParticipant(input.threadId, input.userId);

  return db.directMessageThread.update({
    where: {
      id: input.threadId
    },
    data: {
      collaborationStatus: input.collaborationStatus,
      collaborationNotes: input.collaborationNotes?.trim() || null
    }
  });
}

export async function blockDirectMessageUser(input: {
  blockerId: string;
  blockedUserId: string;
  reason?: string | null;
}) {
  if (input.blockerId === input.blockedUserId) {
    throw new Error("cannot-block-self");
  }

  const block = await db.directMessageBlock.upsert({
    where: {
      blockerId_blockedUserId: {
        blockerId: input.blockerId,
        blockedUserId: input.blockedUserId
      }
    },
    create: {
      blockerId: input.blockerId,
      blockedUserId: input.blockedUserId,
      reason: input.reason?.trim() || null
    },
    update: {
      reason: input.reason?.trim() || null,
      updatedAt: new Date()
    }
  });

  await db.directMessageRequest.updateMany({
    where: {
      status: DirectMessageRequestStatus.PENDING,
      requesterId: input.blockedUserId,
      recipientId: input.blockerId
    },
    data: {
      status: DirectMessageRequestStatus.BLOCKED,
      respondedAt: new Date()
    }
  });

  return block;
}

export async function unblockDirectMessageUser(input: {
  blockerId: string;
  blockedUserId: string;
}) {
  await db.directMessageBlock.deleteMany({
    where: {
      blockerId: input.blockerId,
      blockedUserId: input.blockedUserId
    }
  });
}

export async function reportDirectMessage(input: {
  reporterId: string;
  threadId?: string | null;
  messageId?: string | null;
  reportedUserId?: string | null;
  reason: DirectMessageReportReason;
  detail?: string | null;
}) {
  let threadId = input.threadId ?? null;
  let messageId = input.messageId ?? null;
  let reportedUserId = input.reportedUserId ?? null;

  if (messageId) {
    const message = await db.directMessage.findUnique({
      where: {
        id: messageId
      },
      select: {
        id: true,
        senderId: true,
        threadId: true
      }
    });

    if (!message) {
      throw new Error("message-not-found");
    }

    await ensureMessageParticipant(message.threadId, input.reporterId);
    threadId = message.threadId;
    messageId = message.id;
    reportedUserId = message.senderId;
  } else if (threadId) {
    const participant = await ensureMessageParticipant(threadId, input.reporterId);
    const otherParticipant = participant.thread.participants.find(
      (threadParticipant) => threadParticipant.userId !== input.reporterId
    );
    reportedUserId = otherParticipant?.userId ?? null;
  }

  return db.directMessageReport.create({
    data: {
      reporterId: input.reporterId,
      threadId,
      messageId,
      reportedUserId,
      reason: input.reason,
      detail: input.detail?.trim() || null
    }
  });
}

export async function getDirectMessageAttachmentAccess(input: {
  attachmentId: string;
  userId: string;
  admin?: boolean;
}) {
  const attachment = await db.directMessageAttachment.findUnique({
    where: {
      id: input.attachmentId
    },
    select: {
      id: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      message: {
        select: {
          thread: {
            select: {
              participants: {
                select: {
                  userId: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!attachment) {
    return null;
  }

  const hasAccess =
    input.admin ||
    attachment.message.thread.participants.some((participant) => participant.userId === input.userId);

  if (!hasAccess) {
    throw new Error("forbidden");
  }

  return attachment;
}

export async function listAdminDirectMessageReports(input: {
  query?: string;
  status?: ModerationStatus | "";
}): Promise<DirectMessageModerationReportModel[]> {
  const query = input.query?.trim();
  const reports = await db.directMessageReport.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(query
        ? {
            OR: [
              {
                detail: {
                  contains: query,
                  mode: "insensitive"
                }
              },
              {
                reporter: {
                  OR: [
                    {
                      email: {
                        contains: query,
                        mode: "insensitive"
                      }
                    },
                    {
                      name: {
                        contains: query,
                        mode: "insensitive"
                      }
                    }
                  ]
                }
              },
              {
                reportedUser: {
                  OR: [
                    {
                      email: {
                        contains: query,
                        mode: "insensitive"
                      }
                    },
                    {
                      name: {
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
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: {
        select: directMessageMemberSelect
      },
      reportedUser: {
        select: directMessageMemberSelect
      },
      message: {
        select: {
          content: true,
          attachments: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  return reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    detail: report.detail,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    status: report.status,
    reporter: toDirectMessageMemberSummary(report.reporter),
    reportedUser: report.reportedUser ? toDirectMessageMemberSummary(report.reportedUser) : null,
    threadId: report.threadId,
    messageId: report.messageId,
    attachmentCount: report.message?.attachments.length ?? 0,
    messagePreview: previewText(report.message?.content)
  }));
}

export async function resolveDirectMessageReport(input: {
  adminUserId: string;
  reportId: string;
  action: "resolve" | "dismiss";
  notes?: string | null;
}) {
  const status =
    input.action === "resolve" ? ModerationStatus.RESOLVED : ModerationStatus.DISMISSED;

  const report = await db.directMessageReport.update({
    where: {
      id: input.reportId
    },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedById: input.adminUserId
    },
    select: {
      id: true,
      threadId: true,
      messageId: true
    }
  });

  await db.moderationAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      entityType: report.messageId
        ? ModerationEntityType.DIRECT_MESSAGE_MESSAGE
        : ModerationEntityType.DIRECT_MESSAGE_THREAD,
      entityId: report.messageId ?? report.threadId ?? report.id,
      action:
        input.action === "resolve"
          ? ModerationActionType.RESOLVE_REPORT
          : ModerationActionType.DISMISS_REPORT,
      notes: input.notes?.trim() || null
    }
  });
}

export async function getDirectMessageAdminStats(): Promise<DirectMessageAdminStats> {
  const [requestCount, threadCount, activeThreadCount, pendingReportCount] = await Promise.all([
    db.directMessageRequest.count(),
    db.directMessageThread.count(),
    db.directMessageThread.count({
      where: {
        lastMessageAt: {
          not: null
        }
      }
    }),
    db.directMessageReport.count({
      where: {
        status: ModerationStatus.PENDING
      }
    })
  ]);

  return {
    requestCount,
    threadCount,
    activeThreadCount,
    pendingReportCount
  };
}
