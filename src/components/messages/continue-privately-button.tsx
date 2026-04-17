"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareLock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ContinuePrivatelyButtonProps = {
  recipientId: string;
  recipientName: string;
  originPostId?: string | null;
  originCommentId?: string | null;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  compact?: boolean;
  disabled?: boolean;
  className?: string;
};

type CreateRequestPayload =
  | {
      status: "created";
      requestId: string;
    }
  | {
      status: "existing-thread";
      threadId: string;
    }
  | {
      status: "pending-existing";
      requestId: string;
      requesterId: string;
      recipientId: string;
    };

export function ContinuePrivatelyButton({
  recipientId,
  recipientName,
  originPostId,
  originCommentId,
  variant = "outline",
  size = "sm",
  compact = false,
  disabled = false,
  className
}: ContinuePrivatelyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [introMessage, setIntroMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit() {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipientId,
          originPostId,
          originCommentId,
          introMessage
        })
      });

      const payload = (await response.json().catch(() => ({}))) as
        | CreateRequestPayload
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload ? payload.error || "Unable to continue privately." : "Unable to continue privately."
        );
      }
      const result = payload as CreateRequestPayload;

      setOpen(false);
      setIntroMessage("");

      if (result.status === "existing-thread") {
        router.push(`/messages/${result.threadId}`);
        router.refresh();
        return;
      }

      router.push("/messages/requests?notice=request-sent");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to continue privately right now."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size === "default" ? "default" : "sm"}
        disabled={disabled}
        className={cn(compact ? "h-7 gap-1.5 px-2 text-xs" : "gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <MessageSquareLock size={compact ? 12 : 14} />
        {compact ? null : "Continue privately"}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="continue-privately-title"
            className="w-full max-w-lg rounded-[28px] border border-silver/18 bg-card/96 p-5 shadow-panel-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                  Private chat request
                </p>
                <h3 id="continue-privately-title" className="mt-2 font-display text-2xl text-foreground">
                  Continue with {recipientName}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  This keeps the first interaction in community and moves the useful part of the conversation into a private thread.
                </p>
              </div>

              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3 text-sm text-muted">
                Use this for a real follow-on conversation. It is not designed for cold pitching or generic outreach.
              </div>

              <div className="space-y-2">
                <label htmlFor="dm-intro-message" className="text-xs font-medium uppercase tracking-[0.08em] text-silver">
                  Short introduction
                </label>
                <Textarea
                  id="dm-intro-message"
                  value={introMessage}
                  onChange={(event) => setIntroMessage(event.target.value)}
                  rows={4}
                  maxLength={280}
                  placeholder="A short note on what you would like to continue privately."
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                The other member can accept, decline, mute, block, or report.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void handleSubmit()} disabled={isPending}>
                  {isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                  Send request
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
