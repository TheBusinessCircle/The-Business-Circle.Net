"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Heart, MessageSquareReply, MessagesSquare } from "lucide-react";
import { createCommunityCommentAction } from "@/actions/community/feed.actions";
import type {
  CommunityCommentModel,
  CommunityPostDetailModel,
  CommunityPostSummaryModel
} from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Textarea } from "@/components/ui/textarea";
import { FeedSubmitButton } from "@/components/community/feed-submit-button";
import { CommunityUserSignals } from "@/components/community/community-user-signals";
import { authorName } from "@/lib/community-helpers";
import {
  CONNECTION_WIN_INTERNAL_TAGS,
  isConnectionWinTags,
  parseConnectionWin
} from "@/lib/connection-wins";
import { cn, formatDate } from "@/lib/utils";

type LikeMutationResult = {
  liked: boolean;
  likeCount: number;
};

async function togglePostLike(postId: string): Promise<LikeMutationResult> {
  const response = await fetch(`/api/community/posts/${postId}/like`, {
    method: "POST"
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<LikeMutationResult>;

  if (!response.ok || typeof payload.liked !== "boolean" || typeof payload.likeCount !== "number") {
    throw new Error("post-like-toggle-failed");
  }

  return {
    liked: payload.liked,
    likeCount: payload.likeCount
  };
}

async function toggleCommentLike(commentId: string): Promise<LikeMutationResult> {
  const response = await fetch(`/api/community/comments/${commentId}/like`, {
    method: "POST"
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<LikeMutationResult>;

  if (!response.ok || typeof payload.liked !== "boolean" || typeof payload.likeCount !== "number") {
    throw new Error("comment-like-toggle-failed");
  }

  return {
    liked: payload.liked,
    likeCount: payload.likeCount
  };
}

export function CommunityPostTags({ tags }: { tags: string[] }) {
  const visibleTags = tags.filter((tag) => !CONNECTION_WIN_INTERNAL_TAGS.has(tag));
  const showConnectionWin = isConnectionWinTags(tags);

  if (!visibleTags.length && !showConnectionWin) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showConnectionWin ? (
        <Badge
          variant="outline"
          className="border-silver/20 bg-silver/10 normal-case tracking-normal text-silver"
        >
          Connection win
        </Badge>
      ) : null}
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="border-silver/16 bg-silver/10 normal-case tracking-normal text-silver"
        >
          #{tag}
        </Badge>
      ))}
    </div>
  );
}

function CommentComposer({
  postId,
  returnPath,
  parentCommentId,
  compact = false,
  onCancel
}: {
  postId: string;
  returnPath: string;
  parentCommentId?: string | null;
  compact?: boolean;
  onCancel?: () => void;
}) {
  return (
    <form action={createCommunityCommentAction} className="space-y-2">
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="parentCommentId" value={parentCommentId ?? ""} />
      <Textarea
        name="content"
        rows={compact ? 2 : 3}
        placeholder={compact ? "Add a reply" : "Add a comment"}
        className={compact ? "min-h-[88px]" : undefined}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <FeedSubmitButton type="submit" size="sm" variant="outline" pendingLabel="Posting...">
          {compact ? "Post reply" : "Post comment"}
        </FeedSubmitButton>
      </div>
    </form>
  );
}

function CommentEngagementBar({
  comment,
  isReplyOpen,
  onToggleReply
}: {
  comment: CommunityCommentModel;
  isReplyOpen: boolean;
  onToggleReply: (commentId: string | null) => void;
}) {
  const [viewerHasLiked, setViewerHasLiked] = useState(comment.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setViewerHasLiked(comment.viewerHasLiked);
    setLikeCount(comment.likeCount);
  }, [comment.likeCount, comment.viewerHasLiked]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        aria-pressed={viewerHasLiked}
        className={cn(
          "h-7 gap-1.5 px-2 text-xs shadow-none",
          viewerHasLiked
            ? "text-gold hover:bg-gold/10 hover:text-gold"
            : "text-muted hover:text-foreground"
        )}
        onClick={() => {
          const nextLiked = !viewerHasLiked;
          const nextLikeCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
          setViewerHasLiked(nextLiked);
          setLikeCount(nextLikeCount);

          startTransition(async () => {
            try {
              const result = await toggleCommentLike(comment.id);
              setViewerHasLiked(result.liked);
              setLikeCount(result.likeCount);
            } catch {
              setViewerHasLiked(comment.viewerHasLiked);
              setLikeCount(comment.likeCount);
            }
          });
        }}
      >
        <Heart size={12} className={cn(viewerHasLiked ? "fill-current" : "")} />
        {isPending ? "Saving..." : "Like"}
      </Button>

      <span
        className={cn(
          "inline-flex min-w-[3.5rem] items-center justify-center rounded-full px-2 py-1",
          viewerHasLiked ? "bg-gold/10 text-gold/90" : "bg-silver/10 text-silver"
        )}
      >
        {likeCount} {likeCount === 1 ? "like" : "likes"}
      </span>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          "h-7 px-2 text-xs shadow-none",
          isReplyOpen ? "text-foreground" : "text-muted hover:text-foreground"
        )}
        onClick={() => onToggleReply(isReplyOpen ? null : comment.id)}
      >
        <MessageSquareReply size={12} className="mr-1" />
        Reply
      </Button>
    </div>
  );
}

function CommentThread({
  comments,
  returnPath,
  depth = 0,
  activeReplyId,
  onToggleReply
}: {
  comments: CommunityCommentModel[];
  returnPath: string;
  depth?: number;
  activeReplyId: string | null;
  onToggleReply: (commentId: string | null) => void;
}) {
  if (!comments.length) {
    return null;
  }

  return (
    <div className={cn("space-y-3", depth > 0 ? "border-l border-silver/16 pl-4" : "")}>
      {comments.map((comment) => {
        const displayName = authorName(comment.user);
        const isReplyOpen = activeReplyId === comment.id;

        return (
          <div
            key={comment.id}
            className={cn(
              "space-y-3 rounded-2xl border p-4",
              depth > 0
                ? "border-silver/10 bg-background/12"
                : "border-silver/14 bg-background/18"
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar name={displayName} image={comment.user.image} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <MembershipTierBadge tier={comment.user.membershipTier} className="shrink-0" />
                  <FoundingBadge tier={comment.user.foundingTier} />
                </div>
                <CommunityUserSignals user={comment.user} className="mt-3" maxTags={1} />
                <p className="mt-1 text-xs text-muted">{formatDate(comment.createdAt)}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {comment.content}
                </p>
                <CommentEngagementBar
                  comment={comment}
                  isReplyOpen={isReplyOpen}
                  onToggleReply={onToggleReply}
                />
              </div>
            </div>

            {isReplyOpen ? (
              <div className="overflow-hidden rounded-2xl border border-silver/14 bg-background/10 p-3 transition-all duration-200">
                <CommentComposer
                  postId={comment.postId}
                  returnPath={returnPath}
                  parentCommentId={comment.id}
                  compact
                  onCancel={() => onToggleReply(null)}
                />
              </div>
            ) : null}

            <CommentThread
              comments={comment.replies}
              returnPath={returnPath}
              depth={depth + 1}
              activeReplyId={activeReplyId}
              onToggleReply={onToggleReply}
            />
          </div>
        );
      })}
    </div>
  );
}

export function CommunityPostBody({
  post,
  showTags = true
}: {
  post: Pick<CommunityPostSummaryModel, "content" | "tags">;
  showTags?: boolean;
}) {
  const parsedConnectionWin = parseConnectionWin(post.content, post.tags);

  if (parsedConnectionWin) {
    const sections = [
      {
        title: "What happened",
        content: parsedConnectionWin.whatHappened
      },
      {
        title: "Who they connected with",
        content: parsedConnectionWin.whoConnectedWith
      },
      {
        title: "What changed",
        content: parsedConnectionWin.whatChanged
      },
      {
        title: "Result so far",
        content: parsedConnectionWin.resultSoFar
      }
    ];

    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{section.title}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {section.content}
              </p>
            </div>
          ))}
        </div>
        {showTags ? <CommunityPostTags tags={post.tags} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{post.content}</p>
      {showTags ? <CommunityPostTags tags={post.tags} /> : null}
    </div>
  );
}

export function CommunityPostEngagementBar({
  post,
  discussionHref,
  discussionLabel = "View discussion",
  replyHref,
  replyLabel = "Reply",
  onReplyClick
}: {
  post: CommunityPostSummaryModel;
  discussionHref?: string;
  discussionLabel?: string;
  replyHref?: string;
  replyLabel?: string;
  onReplyClick?: () => void;
}) {
  const [viewerHasLiked, setViewerHasLiked] = useState(post.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setViewerHasLiked(post.viewerHasLiked);
    setLikeCount(post.likeCount);
  }, [post.likeCount, post.viewerHasLiked]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant={viewerHasLiked ? "default" : "outline"}
        disabled={isPending}
        aria-pressed={viewerHasLiked}
        className="gap-2"
        onClick={() => {
          const nextLiked = !viewerHasLiked;
          const nextLikeCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
          setViewerHasLiked(nextLiked);
          setLikeCount(nextLikeCount);

          startTransition(async () => {
            try {
              const result = await togglePostLike(post.id);
              setViewerHasLiked(result.liked);
              setLikeCount(result.likeCount);
            } catch {
              setViewerHasLiked(post.viewerHasLiked);
              setLikeCount(post.likeCount);
            }
          });
        }}
      >
        <Heart size={13} className={cn(viewerHasLiked ? "fill-current" : "")} />
        {isPending ? "Saving..." : "Like"}
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
          {likeCount}
        </span>
      </Button>

      <span className="inline-flex items-center gap-2 rounded-full border border-silver/16 bg-silver/10 px-3 py-1.5 text-sm text-silver">
        <MessagesSquare size={14} />
        {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
      </span>

      {onReplyClick ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2 border-silver/16 text-silver hover:border-silver/28 hover:text-foreground"
          onClick={onReplyClick}
        >
          <MessageSquareReply size={13} />
          {replyLabel}
        </Button>
      ) : replyHref ? (
        <Link href={replyHref} className="inline-flex">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2 border-silver/16 text-silver hover:border-silver/28 hover:text-foreground"
          >
            <MessageSquareReply size={13} />
            {replyLabel}
          </Button>
        </Link>
      ) : null}

      {discussionHref ? (
        <Link href={discussionHref} className="inline-flex">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-2 px-3 text-silver hover:text-foreground"
          >
            {discussionLabel}
            <ExternalLink size={13} />
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

export function CommunityPostCommentsSection({
  post,
  returnPath
}: {
  post: CommunityPostDetailModel;
  returnPath: string;
}) {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  return (
    <div id="discussion-reply" className="space-y-5 border-t border-silver/12 pt-5">
      {post.comments.length ? (
        <CommentThread
          comments={post.comments}
          returnPath={returnPath}
          activeReplyId={activeReplyId}
          onToggleReply={setActiveReplyId}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-silver/14 bg-background/10 px-4 py-3 text-sm text-muted">
          No comments yet. Start the thread if you have something useful to add.
        </div>
      )}

      <div className="rounded-2xl border border-silver/14 bg-background/12 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.08em] text-silver">Add a comment</p>
        <CommentComposer postId={post.id} returnPath={returnPath} />
      </div>
    </div>
  );
}

export function CommunityPostDiscussion({
  post,
  returnPath,
  discussionHref,
  discussionLabel = "Open post",
  showTags = true
}: {
  post: CommunityPostDetailModel;
  returnPath: string;
  discussionHref?: string;
  discussionLabel?: string;
  showTags?: boolean;
}) {
  return (
    <div className="space-y-5">
      <CommunityPostBody post={post} showTags={showTags} />
      <CommunityPostEngagementBar
        post={post}
        discussionHref={discussionHref}
        discussionLabel={discussionLabel}
        replyHref="#discussion-reply"
        replyLabel="Reply below"
      />
      <CommunityPostCommentsSection post={post} returnPath={returnPath} />
    </div>
  );
}
