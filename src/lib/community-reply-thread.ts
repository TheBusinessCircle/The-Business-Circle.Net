import type { CommunityReplyThreadMetaModel } from "@/types";

type ReplyThreadNode = {
  user: {
    id: string;
  };
  replies: ReplyThreadNode[];
};

type ReplyThreadAggregate = {
  participantIds: Set<string>;
  maxDepth: number;
  nestedReplyCount: number;
};

function collectReplyThreadAggregate(
  comment: ReplyThreadNode,
  depth = 0
): ReplyThreadAggregate {
  const participantIds = new Set([comment.user.id]);
  let maxDepth = depth;
  let nestedReplyCount = depth >= 2 ? 1 : 0;

  for (const reply of comment.replies) {
    const replyAggregate = collectReplyThreadAggregate(reply, depth + 1);
    replyAggregate.participantIds.forEach((participantId) => participantIds.add(participantId));
    maxDepth = Math.max(maxDepth, replyAggregate.maxDepth);
    nestedReplyCount += replyAggregate.nestedReplyCount;
  }

  return {
    participantIds,
    maxDepth,
    nestedReplyCount
  };
}

export function buildReplyThreadMeta(comment: ReplyThreadNode): CommunityReplyThreadMetaModel {
  const aggregate = collectReplyThreadAggregate(comment);

  return {
    participantCount: aggregate.participantIds.size,
    hasReplyToReplyEvent: aggregate.nestedReplyCount > 0,
    maxDepth: aggregate.maxDepth,
    nestedReplyCount: aggregate.nestedReplyCount
  };
}
