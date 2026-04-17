import type {
  CommunityReplyThreadMetaModel,
  DirectMessageRelationshipStateModel
} from "@/types";

type HiddenReason =
  | "viewer-not-eligible"
  | "self"
  | "not-nested-reply"
  | "discussion-threshold"
  | "blocked";

export type PrivateReplyActionState =
  | {
      kind: "hidden";
      reason: HiddenReason;
    }
  | {
      kind: "request";
    }
  | {
      kind: "pending";
      requestId: string;
      direction: "incoming" | "outgoing";
    }
  | {
      kind: "thread";
      threadId: string;
    };

export function canStartPrivateFromReply(input: {
  isAuthenticated: boolean;
  viewerCanUsePrivateMessaging: boolean;
  currentUserId: string;
  targetUserId: string;
  isNestedReply: boolean;
  replyThread: CommunityReplyThreadMetaModel;
  relation: DirectMessageRelationshipStateModel | null;
}) {
  return getPrivateReplyActionState(input).kind === "request";
}

export function getPrivateReplyActionState(input: {
  isAuthenticated: boolean;
  viewerCanUsePrivateMessaging: boolean;
  currentUserId: string;
  targetUserId: string;
  isNestedReply: boolean;
  replyThread: CommunityReplyThreadMetaModel;
  relation: DirectMessageRelationshipStateModel | null;
}): PrivateReplyActionState {
  if (!input.isAuthenticated || !input.viewerCanUsePrivateMessaging) {
    return {
      kind: "hidden",
      reason: "viewer-not-eligible"
    };
  }

  if (input.currentUserId === input.targetUserId) {
    return {
      kind: "hidden",
      reason: "self"
    };
  }

  if (!input.isNestedReply) {
    return {
      kind: "hidden",
      reason: "not-nested-reply"
    };
  }

  if (
    !input.replyThread.hasReplyToReplyEvent ||
    input.replyThread.participantCount < 2
  ) {
    return {
      kind: "hidden",
      reason: "discussion-threshold"
    };
  }

  if (input.relation?.isBlocked) {
    return {
      kind: "hidden",
      reason: "blocked"
    };
  }

  if (input.relation?.existingThreadId) {
    return {
      kind: "thread",
      threadId: input.relation.existingThreadId
    };
  }

  if (input.relation?.pendingRequestId && input.relation.pendingRequestDirection) {
    return {
      kind: "pending",
      requestId: input.relation.pendingRequestId,
      direction: input.relation.pendingRequestDirection
    };
  }

  return {
    kind: "request"
  };
}
