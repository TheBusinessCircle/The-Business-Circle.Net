import "server-only";

import {
  ModerationActionType,
  ModerationEntityType,
  Prisma
} from "@prisma/client";
import { buildCommunityChannelPath, buildCommunityPostPath } from "@/lib/community-paths";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type CommunityAdminOrder = "newest" | "oldest";

export type CommunitySafetyChannelOption = {
  id: string;
  name: string;
  slug: string;
};

export type CommunityAdminPostListItem = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  authorEmail: string | null;
  channelName: string;
  channelSlug: string;
  channelTopic: string | null;
  createdAt: Date;
  commentCount: number;
  status: "Active" | "Removed";
  kind: string;
  href: string;
  channelHref: string;
};

export type CommunityAdminCommentListItem = {
  id: string;
  preview: string;
  authorName: string;
  authorEmail: string | null;
  postId: string;
  postTitle: string;
  postPreview: string;
  channelName: string;
  channelSlug: string;
  channelTopic: string | null;
  createdAt: Date;
  href: string;
  channelHref: string;
};

export type CommunityAdminListResult<T> = {
  items: T[];
  total: number;
  limit: number;
};

export type CommunitySafetyDeleteResult = {
  postsRemoved: number;
  commentsRemoved: number;
  completedAt: Date;
  affectedPath?: string;
  affectedChannelPath?: string;
};

const ADMIN_COMMUNITY_LIST_LIMIT = 120;

function compactPreview(value: string | null | undefined, maxLength = 180) {
  const compacted = (value ?? "").replace(/\s+/g, " ").trim();
  if (!compacted) {
    return "No written content.";
  }

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
}

function displayAuthor(user: { name: string | null; email: string | null }) {
  return user.name || user.email || "Unknown member";
}

function orderByCreatedAt(order: CommunityAdminOrder) {
  return {
    createdAt: order === "oldest" ? "asc" : "desc"
  } satisfies Prisma.CommunityPostOrderByWithRelationInput;
}

function buildPostSearchWhere(input: {
  query?: string;
  channelId?: string;
}): Prisma.CommunityPostWhereInput {
  const query = input.query?.trim();

  return {
    deletedAt: null,
    ...(input.channelId ? { channelId: input.channelId } : {}),
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
              content: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              user: {
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
            },
            {
              channel: {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    slug: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    topic: {
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
  };
}

function buildCommentSearchWhere(input: {
  query?: string;
  channelId?: string;
}): Prisma.CommunityCommentWhereInput {
  const query = input.query?.trim();

  return {
    deletedAt: null,
    post: {
      deletedAt: null,
      ...(input.channelId ? { channelId: input.channelId } : {})
    },
    ...(query
      ? {
          OR: [
            {
              content: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              user: {
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
            },
            {
              post: {
                OR: [
                  {
                    title: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    content: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    channel: {
                      OR: [
                        {
                          name: {
                            contains: query,
                            mode: "insensitive"
                          }
                        },
                        {
                          slug: {
                            contains: query,
                            mode: "insensitive"
                          }
                        },
                        {
                          topic: {
                            contains: query,
                            mode: "insensitive"
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      : {})
  };
}

function auditNotes(input: Record<string, unknown>) {
  return JSON.stringify(input);
}

async function createCommunityAuditLog(input: {
  tx: Prisma.TransactionClient;
  adminUserId: string;
  action: ModerationActionType;
  entityType: ModerationEntityType;
  entityId: string;
  notes: Record<string, unknown>;
}) {
  await input.tx.moderationAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      notes: auditNotes(input.notes)
    }
  });
}

export async function listCommunityChannelsForAdmin(): Promise<CommunitySafetyChannelOption[]> {
  await requireAdmin();

  return db.channel.findMany({
    where: {
      isArchived: false
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
}

export async function listCommunityPostsForAdmin(input: {
  query?: string;
  channelId?: string;
  order?: CommunityAdminOrder;
  limit?: number;
}): Promise<CommunityAdminListResult<CommunityAdminPostListItem>> {
  await requireAdmin();

  const limit = Math.min(input.limit ?? ADMIN_COMMUNITY_LIST_LIMIT, ADMIN_COMMUNITY_LIST_LIMIT);
  const where = buildPostSearchWhere({
    query: input.query,
    channelId: input.channelId
  });
  const order = input.order ?? "newest";

  const [posts, total] = await Promise.all([
    db.communityPost.findMany({
      where,
      orderBy: orderByCreatedAt(order),
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        kind: true,
        createdAt: true,
        deletedAt: true,
        channel: {
          select: {
            name: true,
            slug: true,
            topic: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    }),
    db.communityPost.count({ where })
  ]);

  return {
    items: posts.map((post) => ({
      id: post.id,
      title: post.title,
      preview: compactPreview(post.content),
      authorName: displayAuthor(post.user),
      authorEmail: post.user.email,
      channelName: post.channel.name,
      channelSlug: post.channel.slug,
      channelTopic: post.channel.topic,
      createdAt: post.createdAt,
      commentCount: post._count.comments,
      status: post.deletedAt ? "Removed" : "Active",
      kind: post.kind,
      href: buildCommunityPostPath(post.id, post.channel.slug),
      channelHref: buildCommunityChannelPath(post.channel.slug)
    })),
    total,
    limit
  };
}

export async function listCommunityCommentsForAdmin(input: {
  query?: string;
  channelId?: string;
  order?: CommunityAdminOrder;
  limit?: number;
}): Promise<CommunityAdminListResult<CommunityAdminCommentListItem>> {
  await requireAdmin();

  const limit = Math.min(input.limit ?? ADMIN_COMMUNITY_LIST_LIMIT, ADMIN_COMMUNITY_LIST_LIMIT);
  const where = buildCommentSearchWhere({
    query: input.query,
    channelId: input.channelId
  });
  const order = input.order ?? "newest";

  const [comments, total] = await Promise.all([
    db.communityComment.findMany({
      where,
      orderBy: {
        createdAt: order === "oldest" ? "asc" : "desc"
      },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            channel: {
              select: {
                name: true,
                slug: true,
                topic: true
              }
            }
          }
        }
      }
    }),
    db.communityComment.count({ where })
  ]);

  return {
    items: comments.map((comment) => ({
      id: comment.id,
      preview: compactPreview(comment.content),
      authorName: displayAuthor(comment.user),
      authorEmail: comment.user.email,
      postId: comment.post.id,
      postTitle: comment.post.title,
      postPreview: compactPreview(comment.post.content, 120),
      channelName: comment.post.channel.name,
      channelSlug: comment.post.channel.slug,
      channelTopic: comment.post.channel.topic,
      createdAt: comment.createdAt,
      href: buildCommunityPostPath(comment.post.id, comment.post.channel.slug),
      channelHref: buildCommunityChannelPath(comment.post.channel.slug)
    })),
    total,
    limit
  };
}

export async function deleteAllCommunityCommentsForAdmin(input: {
  adminUserId: string;
}): Promise<CommunitySafetyDeleteResult> {
  const completedAt = new Date();

  return db.$transaction(async (tx) => {
    const comments = await tx.communityComment.updateMany({
      where: {
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    await createCommunityAuditLog({
      tx,
      adminUserId: input.adminUserId,
      action: ModerationActionType.COMMUNITY_DELETE_ALL_COMMENTS,
      entityType: ModerationEntityType.COMMUNITY_BULK,
      entityId: "community-comments",
      notes: {
        commentsRemoved: comments.count,
        postsRemoved: 0,
        mode: "soft-delete"
      }
    });

    return {
      postsRemoved: 0,
      commentsRemoved: comments.count,
      completedAt
    };
  });
}

export async function deleteAllCommunityPostsAndCommentsForAdmin(input: {
  adminUserId: string;
}): Promise<CommunitySafetyDeleteResult> {
  const completedAt = new Date();

  return db.$transaction(async (tx) => {
    const comments = await tx.communityComment.updateMany({
      where: {
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    const posts = await tx.communityPost.updateMany({
      where: {
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    await createCommunityAuditLog({
      tx,
      adminUserId: input.adminUserId,
      action: ModerationActionType.COMMUNITY_DELETE_ALL_POSTS_AND_COMMENTS,
      entityType: ModerationEntityType.COMMUNITY_BULK,
      entityId: "community-posts-and-comments",
      notes: {
        commentsRemoved: comments.count,
        postsRemoved: posts.count,
        mode: "soft-delete"
      }
    });

    return {
      postsRemoved: posts.count,
      commentsRemoved: comments.count,
      completedAt
    };
  });
}

export async function deleteCommunityPostForAdmin(input: {
  adminUserId: string;
  postId: string;
}): Promise<CommunitySafetyDeleteResult> {
  const post = await db.communityPost.findFirst({
    where: {
      id: input.postId,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      channel: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!post) {
    throw new Error("community-post-not-found");
  }

  const completedAt = new Date();

  return db.$transaction(async (tx) => {
    const comments = await tx.communityComment.updateMany({
      where: {
        postId: post.id,
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    const posts = await tx.communityPost.updateMany({
      where: {
        id: post.id,
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    if (posts.count !== 1) {
      throw new Error("community-post-not-found");
    }

    await createCommunityAuditLog({
      tx,
      adminUserId: input.adminUserId,
      action: ModerationActionType.COMMUNITY_DELETE_POST,
      entityType: ModerationEntityType.COMMUNITY_POST,
      entityId: post.id,
      notes: {
        commentsRemoved: comments.count,
        postsRemoved: posts.count,
        postTitle: post.title,
        channelSlug: post.channel.slug,
        mode: "soft-delete"
      }
    });

    return {
      postsRemoved: posts.count,
      commentsRemoved: comments.count,
      completedAt,
      affectedPath: buildCommunityPostPath(post.id, post.channel.slug),
      affectedChannelPath: buildCommunityChannelPath(post.channel.slug)
    };
  });
}

export async function deleteCommunityCommentForAdmin(input: {
  adminUserId: string;
  commentId: string;
}): Promise<CommunitySafetyDeleteResult> {
  const comment = await db.communityComment.findFirst({
    where: {
      id: input.commentId,
      deletedAt: null,
      post: {
        deletedAt: null
      }
    },
    select: {
      id: true,
      postId: true,
      post: {
        select: {
          title: true,
          channel: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  });

  if (!comment) {
    throw new Error("community-comment-not-found");
  }

  const completedAt = new Date();

  return db.$transaction(async (tx) => {
    const comments = await tx.communityComment.updateMany({
      where: {
        id: comment.id,
        deletedAt: null
      },
      data: {
        deletedAt: completedAt
      }
    });

    if (comments.count !== 1) {
      throw new Error("community-comment-not-found");
    }

    await createCommunityAuditLog({
      tx,
      adminUserId: input.adminUserId,
      action: ModerationActionType.COMMUNITY_DELETE_COMMENT,
      entityType: ModerationEntityType.COMMUNITY_COMMENT,
      entityId: comment.id,
      notes: {
        commentsRemoved: comments.count,
        postsRemoved: 0,
        postId: comment.postId,
        postTitle: comment.post.title,
        channelSlug: comment.post.channel.slug,
        mode: "soft-delete"
      }
    });

    return {
      postsRemoved: 0,
      commentsRemoved: comments.count,
      completedAt,
      affectedPath: buildCommunityPostPath(comment.postId, comment.post.channel.slug),
      affectedChannelPath: buildCommunityChannelPath(comment.post.channel.slug)
    };
  });
}
