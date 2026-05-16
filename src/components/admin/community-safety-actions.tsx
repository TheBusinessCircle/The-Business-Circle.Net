"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import {
  deleteAllCommunityComments,
  deleteAllCommunityPostsAndComments,
  deleteCommunityComment,
  deleteCommunityPost
} from "@/actions/admin/community-safety.actions";
import {
  COMMUNITY_SAFETY_CONFIRMATIONS,
  COMMUNITY_SAFETY_IDLE_STATE,
  type CommunitySafetyActionState
} from "@/actions/admin/community-safety.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

function ActionFeedback({ state }: { state: CommunitySafetyActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isSuccess = state.status === "success";

  return (
    <div
      className={
        isSuccess
          ? "rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-sm text-gold"
          : "rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
      }
    >
      <p className="inline-flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        )}
        <span>{state.message}</span>
      </p>
      {isSuccess ? (
        <p className="mt-1 text-xs text-muted">
          {state.commentsRemoved ?? 0} comments removed
          {typeof state.postsRemoved === "number" ? `, ${state.postsRemoved} posts removed` : ""}
          {state.completedAt ? `, completed ${formatDate(new Date(state.completedAt))}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function ConfirmationInput({
  id,
  expected,
  value,
  onChange
}: {
  id: string;
  expected: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Type {expected}</Label>
      <Input
        id={id}
        name="confirmation"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

export function CommunityRefreshActions() {
  const [commentConfirmation, setCommentConfirmation] = useState("");
  const [communityConfirmation, setCommunityConfirmation] = useState("");
  const [commentsState, commentsAction, commentsPending] = useActionState(
    deleteAllCommunityComments,
    COMMUNITY_SAFETY_IDLE_STATE
  );
  const [communityState, communityAction, communityPending] = useActionState(
    deleteAllCommunityPostsAndComments,
    COMMUNITY_SAFETY_IDLE_STATE
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={commentsAction}
        className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4"
      >
        <div className="space-y-2">
          <h3 className="font-display text-lg text-foreground">Delete all community comments</h3>
          <p className="text-sm leading-relaxed text-muted">
            Clears testing conversations and unsafe replies while leaving posts available for review.
          </p>
        </div>
        <div className="mt-4 space-y-4">
          <ConfirmationInput
            id="delete-comments-confirmation"
            expected={COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments}
            value={commentConfirmation}
            onChange={setCommentConfirmation}
          />
          <Button
            type="submit"
            variant="danger"
            disabled={
              commentsPending ||
              commentConfirmation.trim() !== COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments
            }
          >
            {commentsPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Trash2 size={15} className="mr-2" />}
            Delete all comments
          </Button>
          <ActionFeedback state={commentsState} />
        </div>
      </form>

      <form
        action={communityAction}
        className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4"
      >
        <div className="space-y-2">
          <h3 className="font-display text-lg text-foreground">Delete all posts and comments</h3>
          <p className="text-sm leading-relaxed text-muted">
            Use this only for a full launch refresh or a serious content safety reset.
          </p>
        </div>
        <div className="mt-4 space-y-4">
          <ConfirmationInput
            id="delete-community-confirmation"
            expected={COMMUNITY_SAFETY_CONFIRMATIONS.deleteCommunity}
            value={communityConfirmation}
            onChange={setCommunityConfirmation}
          />
          <Button
            type="submit"
            variant="danger"
            disabled={
              communityPending ||
              communityConfirmation.trim() !== COMMUNITY_SAFETY_CONFIRMATIONS.deleteCommunity
            }
          >
            {communityPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Trash2 size={15} className="mr-2" />}
            Delete all posts and comments
          </Button>
          <ActionFeedback state={communityState} />
        </div>
      </form>
    </div>
  );
}

export function CommunityPostRemoveForm({ postId }: { postId: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deleteCommunityPost, COMMUNITY_SAFETY_IDLE_STATE);
  const isConfirmed = confirmation.trim() === COMMUNITY_SAFETY_CONFIRMATIONS.deletePost;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <Label htmlFor={`delete-post-${postId}`} className="text-xs">
        Type {COMMUNITY_SAFETY_CONFIRMATIONS.deletePost}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`delete-post-${postId}`}
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-9 text-xs"
        />
        <Button type="submit" variant="danger" size="sm" disabled={pending || !isConfirmed}>
          {pending ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Trash2 size={13} className="mr-1" />}
          Remove
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

export function CommunityCommentRemoveForm({ commentId }: { commentId: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    deleteCommunityComment,
    COMMUNITY_SAFETY_IDLE_STATE
  );
  const isConfirmed = confirmation.trim() === COMMUNITY_SAFETY_CONFIRMATIONS.deleteComment;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="commentId" value={commentId} />
      <Label htmlFor={`delete-comment-${commentId}`} className="text-xs">
        Type {COMMUNITY_SAFETY_CONFIRMATIONS.deleteComment}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`delete-comment-${commentId}`}
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-9 text-xs"
        />
        <Button type="submit" variant="danger" size="sm" disabled={pending || !isConfirmed}>
          {pending ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Trash2 size={13} className="mr-1" />}
          Remove
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
