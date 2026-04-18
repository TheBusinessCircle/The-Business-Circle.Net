import { DirectMessageRequestStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  },
  directMessageBlock: {
    findFirst: vi.fn(),
    findMany: vi.fn()
  },
  communityPost: {
    findUnique: vi.fn()
  },
  directMessageThread: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  directMessageRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  $transaction: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/moderation/profanity", () => ({
  assertNoBlockedProfanity: vi.fn()
}));

const loggingMock = vi.hoisted(() => ({
  logServerWarning: vi.fn()
}));

vi.mock("@/lib/security/logging", () => loggingMock);

import {
  createDirectMessageRequest,
  getDirectMessageRelationshipStateMap,
  respondToDirectMessageRequest
} from "@/server/messages/message.service";

describe("message service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PRIVATE_MESSAGING_ENABLED;
  });

  it("returns an existing thread instead of creating a duplicate request", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_requester",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "requester@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "recipient@example.com"
      });
    dbMock.directMessageBlock.findFirst.mockResolvedValue(null);
    dbMock.communityPost.findUnique.mockResolvedValue({
      id: "post_1",
      title: "Post",
      userId: "user_recipient",
      deletedAt: null,
      channel: {
        slug: "strategy",
        name: "Strategy"
      }
    });
    dbMock.directMessageThread.findUnique.mockResolvedValue({
      id: "thread_1"
    });

    const result = await createDirectMessageRequest({
      requesterId: "user_requester",
      recipientId: "user_recipient",
      originPostId: "post_1",
      introMessage: "Could we continue this privately?"
    });

    expect(result).toEqual({
      status: "existing-thread",
      threadId: "thread_1",
      requesterId: "user_requester",
      recipientId: "user_recipient"
    });
    expect(dbMock.directMessageRequest.create).not.toHaveBeenCalled();
  });

  it("accepts a pending request and creates a thread when one does not exist", async () => {
    dbMock.directMessageRequest.findUnique.mockResolvedValue({
      id: "request_1",
      requesterId: "user_requester",
      recipientId: "user_recipient",
      originPostId: "post_1",
      originCommentId: null,
      status: DirectMessageRequestStatus.PENDING,
      threadId: null,
      requester: {
        id: "user_requester"
      }
    });

    const tx = {
      directMessageThread: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "thread_1" }),
        update: vi.fn().mockResolvedValue({})
      },
      directMessageRequest: {
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      directMessage: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    dbMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));

    const result = await respondToDirectMessageRequest({
      requestId: "request_1",
      recipientId: "user_recipient",
      action: "accept"
    });

    expect(result).toEqual({
      status: DirectMessageRequestStatus.ACCEPTED,
      threadId: "thread_1",
      requesterId: "user_requester",
      recipientId: "user_recipient"
    });
    expect(tx.directMessageThread.create).toHaveBeenCalled();
    expect(tx.directMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          threadId: "thread_1",
          messageType: "SYSTEM"
        })
      })
    );
  });

  it("allows an admin without email verification to create a request", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_admin",
        emailVerified: null,
        role: "ADMIN",
        suspended: false,
        subscription: {
          status: null
        },
        email: "admin@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "recipient@example.com"
      });
    dbMock.directMessageBlock.findFirst.mockResolvedValue(null);
    dbMock.communityPost.findUnique.mockResolvedValue({
      id: "post_1",
      title: "Post",
      userId: "user_recipient",
      deletedAt: null,
      channel: {
        slug: "strategy",
        name: "Strategy"
      }
    });
    dbMock.directMessageThread.findUnique.mockResolvedValue(null);
    dbMock.directMessageRequest.findFirst.mockResolvedValue(null);
    dbMock.directMessageRequest.create.mockResolvedValue({
      id: "request_1"
    });

    const result = await createDirectMessageRequest({
      requesterId: "user_admin",
      recipientId: "user_recipient",
      originPostId: "post_1",
      introMessage: "Could we continue this privately?"
    });

    expect(result).toEqual({
      status: "created",
      requestId: "request_1",
      requesterId: "user_admin",
      recipientId: "user_recipient"
    });
  });

  it("logs EMAIL_NOT_VERIFIED when the recipient cannot use private messaging yet", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_requester",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "requester@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: null,
        role: "MEMBER",
        suspended: false,
        membershipTier: "FOUNDATION",
        subscription: {
          status: "ACTIVE"
        },
        email: "recipient@example.com"
      });

    await expect(
      createDirectMessageRequest({
        requesterId: "user_requester",
        recipientId: "user_recipient",
        originPostId: "post_1",
        introMessage: "Could we continue this privately?"
      })
    ).rejects.toMatchObject({
      message: "recipient-not-verified",
      blockReason: "EMAIL_NOT_VERIFIED"
    });

    expect(loggingMock.logServerWarning).toHaveBeenCalledWith(
      "direct-message-request-blocked",
      expect.objectContaining({
        code: "recipient-not-verified",
        reason: "EMAIL_NOT_VERIFIED",
        actor: "recipient",
        requesterId: "user_requester",
        recipientId: "user_recipient"
      })
    );
  });

  it("logs MEMBERSHIP_INACTIVE when the recipient no longer has active membership", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_requester",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "requester@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        membershipTier: "FOUNDATION",
        subscription: {
          status: "CANCELED"
        },
        email: "recipient@example.com"
      });

    await expect(
      createDirectMessageRequest({
        requesterId: "user_requester",
        recipientId: "user_recipient",
        originPostId: "post_1",
        introMessage: "Could we continue this privately?"
      })
    ).rejects.toMatchObject({
      message: "recipient-not-verified",
      blockReason: "MEMBERSHIP_INACTIVE"
    });

    expect(loggingMock.logServerWarning).toHaveBeenCalledWith(
      "direct-message-request-blocked",
      expect.objectContaining({
        code: "recipient-not-verified",
        reason: "MEMBERSHIP_INACTIVE",
        actor: "recipient"
      })
    );
  });

  it("logs BLOCKED when a blocking relationship prevents the request", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_requester",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "requester@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: new Date(),
        role: "MEMBER",
        suspended: false,
        subscription: {
          status: "ACTIVE"
        },
        email: "recipient@example.com"
      });
    dbMock.directMessageBlock.findFirst.mockResolvedValue({
      blockerId: "user_recipient",
      blockedUserId: "user_requester"
    });

    await expect(
      createDirectMessageRequest({
        requesterId: "user_requester",
        recipientId: "user_recipient",
        originPostId: "post_1",
        introMessage: "Could we continue this privately?"
      })
    ).rejects.toMatchObject({
      message: "direct-message-blocked",
      blockReason: "BLOCKED"
    });

    expect(loggingMock.logServerWarning).toHaveBeenCalledWith(
      "direct-message-request-blocked",
      expect.objectContaining({
        code: "direct-message-blocked",
        reason: "BLOCKED",
        actor: "pair"
      })
    );
  });

  it("maps existing threads, pending requests, and blocks for visible community participants", async () => {
    dbMock.directMessageBlock.findMany.mockResolvedValue([
      {
        blockerId: "user_viewer",
        blockedUserId: "user_blocked"
      }
    ]);
    dbMock.directMessageThread.findMany.mockResolvedValue([
      {
        id: "thread_1",
        pairKey: "user_thread:user_viewer"
      }
    ]);
    dbMock.directMessageRequest.findMany.mockResolvedValue([
      {
        id: "request_1",
        requesterId: "user_viewer",
        recipientId: "user_pending"
      }
    ]);

    const relationshipState = await getDirectMessageRelationshipStateMap({
      viewerUserId: "user_viewer",
      targetUserIds: ["user_thread", "user_pending", "user_blocked", "user_viewer"]
    });

    expect(relationshipState.get("user_thread")).toEqual({
      existingThreadId: "thread_1",
      pendingRequestId: null,
      pendingRequestDirection: null,
      isBlocked: false
    });
    expect(relationshipState.get("user_pending")).toEqual({
      existingThreadId: null,
      pendingRequestId: "request_1",
      pendingRequestDirection: "outgoing",
      isBlocked: false
    });
    expect(relationshipState.get("user_blocked")).toEqual({
      existingThreadId: null,
      pendingRequestId: null,
      pendingRequestDirection: null,
      isBlocked: true
    });
    expect(relationshipState.has("user_viewer")).toBe(false);
  });
});
