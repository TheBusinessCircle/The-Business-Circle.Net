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
    hasReplyToReplyEvent: true
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
          hasReplyToReplyEvent: false
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
        hasReplyToReplyEvent: false
      }
    });
    const oneParticipant = getPrivateReplyActionState({
      ...baseInput,
      replyThread: {
        participantCount: 1,
        hasReplyToReplyEvent: true
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

  it("allows the first reply to a post once that reply thread has a real back-and-forth", () => {
    expect(
      getPrivateReplyActionState({
        ...baseInput,
        isNestedReply: false
      })
    ).toEqual({
      kind: "request"
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
