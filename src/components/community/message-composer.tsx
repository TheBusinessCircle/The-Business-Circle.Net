"use client";

import { FormEvent, useState } from "react";
import type { ChannelMessageModel } from "@/types";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageComposerProps = {
  onSubmit: (
    content: string,
    options?: {
      parentMessageId?: string;
    }
  ) => Promise<boolean> | boolean;
  isSending?: boolean;
  disabled?: boolean;
  replyTarget?: ChannelMessageModel | null;
  onCancelReply?: () => void;
};

export function MessageComposer({
  onSubmit,
  isSending = false,
  disabled = false,
  replyTarget = null,
  onCancelReply
}: MessageComposerProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = content.trim();
    if (!trimmed.length || disabled || isSending) {
      return;
    }

    const didSend = await onSubmit(trimmed, {
      parentMessageId: replyTarget?.id
    });
    if (didSend) {
      setContent("");
      onCancelReply?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border/70 bg-background/25 p-4">
      {replyTarget ? (
        <div className="mb-3 rounded-xl border border-gold/35 bg-gold/10 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-gold">
              Replying to {replyTarget.user.name || replyTarget.user.email}
            </p>
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={onCancelReply}
            >
              Cancel
            </button>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{replyTarget.content}</p>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share an update, ask for support, or start a strategy discussion..."
          className="min-h-[46px] max-h-40 resize-y"
          maxLength={1400}
          disabled={disabled || isSending}
        />
        <Button type="submit" disabled={disabled || isSending || !content.trim().length}>
          {isSending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" />
              Sending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              Send
              <SendHorizontal size={14} />
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
