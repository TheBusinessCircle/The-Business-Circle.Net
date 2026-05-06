"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BlueprintVoteType } from "@prisma/client";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BLUEPRINT_DISCUSSION_REQUEST_THRESHOLD,
  BLUEPRINT_DISCUSSION_VOTE_TYPE,
  BLUEPRINT_PRIORITY_VOTE_TYPES,
  BLUEPRINT_VOTE_LABELS
} from "@/config/blueprint";
import { cn } from "@/lib/utils";
import type {
  BlueprintPriorityVoteType,
  BlueprintVoteCounts
} from "@/types/blueprint";

type BlueprintVoteState = {
  voteCounts: BlueprintVoteCounts;
  viewerPriorityVote: BlueprintPriorityVoteType | null;
  viewerNeedsDiscussionVote: boolean;
  discussionUnlocked: boolean;
};

type BlueprintVotingPanelProps = {
  cardId: string;
  viewerCanVote: boolean;
  initialVoteCounts: BlueprintVoteCounts;
  initialPriorityVote: BlueprintPriorityVoteType | null;
  initialNeedsDiscussionVote: boolean;
  initialDiscussionUnlocked: boolean;
};

const FOUNDATION_LOCKED_MESSAGE =
  "Voting is available to Inner Circle and Core members, where deeper platform direction is shaped with the founder.";

function priorityVoteButtonClass(voteType: BlueprintVoteType, active: boolean) {
  if (voteType === "NOT_NEEDED") {
    return active
      ? "border-amber-300/34 bg-amber-300/14 text-amber-100 ring-1 ring-amber-300/30 hover:border-amber-300/44 hover:bg-amber-300/18"
      : "border-silver/16 text-muted hover:border-amber-300/30 hover:bg-amber-300/8 hover:text-amber-100";
  }

  return active ? "ring-1 ring-gold/40" : "border-silver/16";
}

function isVoteState(value: unknown): value is BlueprintVoteState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<BlueprintVoteState>;
  return (
    typeof record.voteCounts === "object" &&
    record.voteCounts !== null &&
    typeof record.viewerNeedsDiscussionVote === "boolean" &&
    typeof record.discussionUnlocked === "boolean"
  );
}

export function BlueprintVotingPanel({
  cardId,
  viewerCanVote,
  initialVoteCounts,
  initialPriorityVote,
  initialNeedsDiscussionVote,
  initialDiscussionUnlocked
}: BlueprintVotingPanelProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [voteState, setVoteState] = useState<BlueprintVoteState>({
    voteCounts: initialVoteCounts,
    viewerPriorityVote: initialPriorityVote,
    viewerNeedsDiscussionVote: initialNeedsDiscussionVote,
    discussionUnlocked: initialDiscussionUnlocked
  });
  const [pendingVoteType, setPendingVoteType] = useState<BlueprintVoteType | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!viewerCanVote) {
    return (
      <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm leading-6 text-gold/90">
        <Lock size={14} className="mb-2" />
        {FOUNDATION_LOCKED_MESSAGE}
      </div>
    );
  }

  async function submitVote(voteType: BlueprintVoteType) {
    setPendingVoteType(voteType);
    setError(null);

    try {
      const response = await fetch(`/api/blueprint/cards/${cardId}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ voteType })
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isVoteState(payload)) {
        throw new Error("blueprint-vote-update-failed");
      }

      setVoteState(payload);
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setError("That vote could not be saved. Please try again.");
    } finally {
      setPendingVoteType(null);
    }
  }

  const isPending = Boolean(pendingVoteType) || isRefreshing;
  const discussionOpenedByMemberSignal =
    voteState.discussionUnlocked &&
    voteState.voteCounts.NEEDS_DISCUSSION >= BLUEPRINT_DISCUSSION_REQUEST_THRESHOLD;

  return (
    <div className="space-y-3">
      <div className="grid min-w-0 gap-2 sm:grid-cols-3">
        {BLUEPRINT_PRIORITY_VOTE_TYPES.map((voteType) => {
          const active = voteState.viewerPriorityVote === voteType;
          const pending = pendingVoteType === voteType;

          return (
            <Button
              key={voteType}
              type="button"
              variant={active && voteType !== "NOT_NEEDED" ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              aria-pressed={active}
              className={cn(
                "box-border w-full max-w-full min-w-0 justify-between gap-2",
                priorityVoteButtonClass(voteType, active)
              )}
              onClick={() => submitVote(voteType)}
            >
              <span className="min-w-0 truncate">
                {pending ? "Saving..." : BLUEPRINT_VOTE_LABELS[voteType]}
              </span>
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-[11px]">
                {voteState.voteCounts[voteType]}
              </span>
            </Button>
          );
        })}
      </div>

      <Button
        type="button"
        variant={voteState.viewerNeedsDiscussionVote ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        aria-pressed={voteState.viewerNeedsDiscussionVote}
        className={cn(
          "w-full justify-between gap-2",
          voteState.viewerNeedsDiscussionVote ? "ring-1 ring-gold/40" : "border-silver/16"
        )}
        onClick={() => submitVote(BLUEPRINT_DISCUSSION_VOTE_TYPE)}
      >
        <span>
          {pendingVoteType === BLUEPRINT_DISCUSSION_VOTE_TYPE
            ? "Saving..."
            : BLUEPRINT_VOTE_LABELS.NEEDS_DISCUSSION}
        </span>
        <span className="rounded-full bg-background/20 px-2 py-0.5 text-[11px]">
          {voteState.voteCounts.NEEDS_DISCUSSION}
        </span>
      </Button>

      <p className="text-xs text-muted">
        Choose one build signal, and request discussion separately if this needs deeper member input.
      </p>

      {discussionOpenedByMemberSignal ? (
        <p className="rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs text-gold">
          Discussion opened because enough members requested deeper input.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
