import {
  ModerationActionType,
  ModerationEntityType
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  channel: {
    findMany: vi.fn()
  },
  communityPost: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn()
  },
  communityComment: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn()
  },
  moderationAuditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/session", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    user: {
      id: "admin_1",
      role: "ADMIN"
    }
  })
}));

import {
  deleteAllCommunityCommentsForAdmin,
  deleteAllCommunityPostsAndCommentsForAdmin,
  deleteCommunityCommentForAdmin,
  deleteCommunityPostForAdmin,
  listCommunityCommentsForAdmin,
  listCommunityPostsForAdmin
} from "@/server/community/community-safety-admin.service";

describe("community safety admin service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.$transaction.mockImplementation(async (callback: (client: typeof dbMock) => unknown) =>
      callback(dbMock)
    );
  });

  it("lists active community posts and comments for admin moderation", async () => {
    dbMock.communityPost.findMany.mockResolvedValue([
      {
        id: "post_1",
        title: "Better owner conversations",
        content: "A useful room changes the quality of the next decision.",
        kind: "MEMBER_POST",
        createdAt: new Date("2026-05-16T09:00:00.000Z"),
        deletedAt: null,
        channel: {
          name: "Owner Room",
          slug: "owner-room",
          topic: "Owner reality"
        },
        user: {
          name: "A Member",
          email: "member@example.com"
        },
        _count: {
          comments: 2
        }
      }
    ]);
    dbMock.communityPost.count.mockResolvedValue(1);
    dbMock.communityComment.findMany.mockResolvedValue([
      {
        id: "comment_1",
        content: "This helped me frame the next step.",
        createdAt: new Date("2026-05-16T10:00:00.000Z"),
        user: {
          name: "Comment Author",
          email: "comment@example.com"
        },
        post: {
          id: "post_1",
          title: "Better owner conversations",
          content: "A useful room changes the quality of the next decision.",
          channel: {
            name: "Owner Room",
            slug: "owner-room",
            topic: "Owner reality"
          }
        }
      }
    ]);
    dbMock.communityComment.count.mockResolvedValue(1);

    const posts = await listCommunityPostsForAdmin({
      query: "owner",
      channelId: "channel_1",
      order: "oldest"
    });
    const comments = await listCommunityCommentsForAdmin({
      query: "frame",
      channelId: "channel_1",
      order: "newest"
    });

    expect(dbMock.communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          channelId: "channel_1"
        })
      })
    );
    expect(dbMock.communityComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          post: expect.objectContaining({
            deletedAt: null,
            channelId: "channel_1"
          })
        })
      })
    );
    expect(posts.items[0]).toEqual(
      expect.objectContaining({
        id: "post_1",
        authorEmail: "member@example.com",
        commentCount: 2,
        status: "Active",
        href: "/community/post/post_1"
      })
    );
    expect(comments.items[0]).toEqual(
      expect.objectContaining({
        id: "comment_1",
        postId: "post_1",
        authorEmail: "comment@example.com",
        href: "/community/post/post_1"
      })
    );
  });

  it("soft-deletes all community comments and records a moderation audit entry", async () => {
    dbMock.communityComment.updateMany.mockResolvedValue({ count: 4 });
    dbMock.moderationAuditLog.create.mockResolvedValue({});

    const result = await deleteAllCommunityCommentsForAdmin({ adminUserId: "admin_1" });

    expect(result.commentsRemoved).toBe(4);
    expect(result.postsRemoved).toBe(0);
    expect(dbMock.communityComment.updateMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(dbMock.moderationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminUserId: "admin_1",
        action: ModerationActionType.COMMUNITY_DELETE_ALL_COMMENTS,
        entityType: ModerationEntityType.COMMUNITY_BULK,
        entityId: "community-comments"
      })
    });
  });

  it("soft-deletes all community posts and comments in one guarded transaction", async () => {
    dbMock.communityComment.updateMany.mockResolvedValue({ count: 7 });
    dbMock.communityPost.updateMany.mockResolvedValue({ count: 3 });
    dbMock.moderationAuditLog.create.mockResolvedValue({});

    const result = await deleteAllCommunityPostsAndCommentsForAdmin({ adminUserId: "admin_1" });

    expect(result.commentsRemoved).toBe(7);
    expect(result.postsRemoved).toBe(3);
    expect(dbMock.communityPost.updateMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(dbMock.moderationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: ModerationActionType.COMMUNITY_DELETE_ALL_POSTS_AND_COMMENTS,
        entityType: ModerationEntityType.COMMUNITY_BULK,
        entityId: "community-posts-and-comments"
      })
    });
  });

  it("soft-deletes an individual post and its active comments", async () => {
    dbMock.communityPost.findFirst.mockResolvedValue({
      id: "post_1",
      title: "Testing post",
      channel: {
        slug: "owner-room"
      }
    });
    dbMock.communityComment.updateMany.mockResolvedValue({ count: 2 });
    dbMock.communityPost.updateMany.mockResolvedValue({ count: 1 });
    dbMock.moderationAuditLog.create.mockResolvedValue({});

    const result = await deleteCommunityPostForAdmin({
      adminUserId: "admin_1",
      postId: "post_1"
    });

    expect(result.postsRemoved).toBe(1);
    expect(result.commentsRemoved).toBe(2);
    expect(dbMock.communityPost.findFirst).toHaveBeenCalledWith({
      where: {
        id: "post_1",
        deletedAt: null
      },
      select: expect.any(Object)
    });
    expect(dbMock.communityComment.updateMany).toHaveBeenCalledWith({
      where: {
        postId: "post_1",
        deletedAt: null
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(dbMock.moderationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: ModerationActionType.COMMUNITY_DELETE_POST,
        entityType: ModerationEntityType.COMMUNITY_POST,
        entityId: "post_1"
      })
    });
  });

  it("soft-deletes an individual comment", async () => {
    dbMock.communityComment.findFirst.mockResolvedValue({
      id: "comment_1",
      postId: "post_1",
      post: {
        title: "Testing post",
        channel: {
          slug: "owner-room"
        }
      }
    });
    dbMock.communityComment.updateMany.mockResolvedValue({ count: 1 });
    dbMock.moderationAuditLog.create.mockResolvedValue({});

    const result = await deleteCommunityCommentForAdmin({
      adminUserId: "admin_1",
      commentId: "comment_1"
    });

    expect(result.commentsRemoved).toBe(1);
    expect(result.postsRemoved).toBe(0);
    expect(dbMock.communityComment.findFirst).toHaveBeenCalledWith({
      where: {
        id: "comment_1",
        deletedAt: null,
        post: {
          deletedAt: null
        }
      },
      select: expect.any(Object)
    });
    expect(dbMock.communityComment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "comment_1",
        deletedAt: null
      },
      data: {
        deletedAt: expect.any(Date)
      }
    });
    expect(dbMock.moderationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: ModerationActionType.COMMUNITY_DELETE_COMMENT,
        entityType: ModerationEntityType.COMMUNITY_COMMENT,
        entityId: "comment_1"
      })
    });
  });
});
