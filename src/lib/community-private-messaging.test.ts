import { describe, expect, it } from "vitest";
import {
  canStartPrivateFromReply,
  getPrivateReplyActionState
} from "@/lib/community-private-messaging";

const baseInput = {
  isAuthenticated: true,
  viewerCanUsePrivateMessaging: true,
  currentUserId: "user_viewer",
  targetUserId: "user_target",
  isNestedReply: true,
  replyThread: {
    participantCount: 2,
    hasReplyToReplyEvent: true,
    maxDepth: 2,
    nestedReplyCount: 1
  },
  relation: null
};

describe("community private messaging reply rules", () => {
  it("does not allow the first reply to a post to start a private chat before discussion begins", () => {
    expect(
      canStartPrivateFromReply({
        ...baseInput,
        isNestedReply: false,
        replyThread: {
          participantCount: 1,
          hasReplyToReplyEvent: false,
          maxDepth: 0,
          nestedReplyCount: 0
        }
      })
    ).toBe(false);
  });

  it("shows continue privately on nested replies once the discussion threshold is met", () => {
    expect(getPrivateReplyActionState(baseInput)).toEqual({
      kind: "request"
    });
  });

  it("keeps nested replies hidden until the public back-and-forth threshold is met", () => {
    const noNestedReplyEvent = getPrivateReplyActionState({
      ...baseInput,
      replyThread: {
        participantCount: 2,
        hasReplyToReplyEvent: false,
        maxDepth: 1,
        nestedReplyCount: 0
      }
    });
    const oneParticipant = getPrivateReplyActionState({
      ...baseInput,
      replyThread: {
        participantCount: 1,
        hasReplyToReplyEvent: true,
        maxDepth: 2,
        nestedReplyCount: 1
      }
    });

    expect(noNestedReplyEvent).toEqual({
      kind: "hidden",
      reason: "discussion-threshold"
    });
    expect(oneParticipant).toEqual({
      kind: "hidden",
      reason: "discussion-threshold"
    });
  });

  it("keeps the first direct reply to a post hidden even once nested discussion exists", () => {
    expect(
      getPrivateReplyActionState({
        ...baseInput,
        isNestedReply: false
      })
    ).toEqual({
      kind: "hidden",
      reason: "discussion-threshold"
    });
  });

  it("changes the CTA to open private chat when a thread already exists", () => {
    expect(
      getPrivateReplyActionState({
        ...baseInput,
        relation: {
          existingThreadId: "thread_123",
          pendingRequestId: null,
          pendingRequestDirection: null,
          isBlocked: false
        }
      })
    ).toEqual({
      kind: "thread",
      threadId: "thread_123"
    });
  });

  it("changes the CTA to request sent when a request is already pending", () => {
    expect(
      getPrivateReplyActionState({
        ...baseInput,
        relation: {
          existingThreadId: null,
          pendingRequestId: "request_123",
          pendingRequestDirection: "outgoing",
          isBlocked: false
        }
      })
    ).toEqual({
      kind: "pending",
      requestId: "request_123",
      direction: "outgoing"
    });
  });

  it("hides the CTA for blocked or self-authored replies", () => {
    const blocked = getPrivateReplyActionState({
      ...baseInput,
      relation: {
        existingThreadId: null,
        pendingRequestId: null,
        pendingRequestDirection: null,
        isBlocked: true
      }
    });
    const self = getPrivateReplyActionState({
      ...baseInput,
      targetUserId: "user_viewer"
    });

    expect(blocked).toEqual({
      kind: "hidden",
      reason: "blocked"
    });
    expect(self).toEqual({
      kind: "hidden",
      reason: "self"
    });
  });
});
