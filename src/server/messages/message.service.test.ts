import { DirectMessageRequestStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  },
  directMessageBlock: {
    findFirst: vi.fn()
  },
  communityPost: {
    findUnique: vi.fn()
  },
  directMessageThread: {
    findUnique: vi.fn()
  },
  directMessageRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn()
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

import { createDirectMessageRequest, respondToDirectMessageRequest } from "@/server/messages/message.service";

describe("message service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an existing thread instead of creating a duplicate request", async () => {
    dbMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user_requester",
        emailVerified: new Date(),
        suspended: false,
        email: "requester@example.com"
      })
      .mockResolvedValueOnce({
        id: "user_recipient",
        emailVerified: new Date(),
        suspended: false,
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
});
