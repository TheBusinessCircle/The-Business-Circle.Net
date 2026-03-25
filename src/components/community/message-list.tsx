"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { MessageSquare, Reply, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommunityBadge } from "@/components/ui/community-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberRoleBadge } from "@/components/ui/member-role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getTierAccentTextClassName } from "@/lib/tier-styles";
import type { ChannelMessageModel } from "@/types";

type MessageListProps = {
  messages: ChannelMessageModel[];
  isLoading?: boolean;
  emptyLabel?: string;
  canDeleteMessage?: (message: ChannelMessageModel) => boolean;
  onDeleteMessage?: (message: ChannelMessageModel) => Promise<boolean> | boolean;
  onReplyMessage?: (message: ChannelMessageModel) => void;
  canReplyMessage?: (message: ChannelMessageModel) => boolean;
  replyingMessageId?: string | null;
  isDeletingMessageId?: string | null;
};

type MessageThreadRow = {
  message: ChannelMessageModel;
  depth: number;
};

function sortedByCreatedAt(messages: ChannelMessageModel[]) {
  return [...messages].sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

function buildThreadRows(messages: ChannelMessageModel[]): MessageThreadRow[] {
  const sorted = sortedByCreatedAt(messages);
  const byId = new Map(sorted.map((message) => [message.id, message]));
  const children = new Map<string, ChannelMessageModel[]>();
  const roots: ChannelMessageModel[] = [];

  for (const message of sorted) {
    const parentId = message.parentMessageId;

    if (parentId && byId.has(parentId)) {
      const existingChildren = children.get(parentId) ?? [];
      existingChildren.push(message);
      children.set(parentId, existingChildren);
      continue;
    }

    roots.push(message);
  }

  const rows: MessageThreadRow[] = [];
  const pushThread = (parent: ChannelMessageModel, depth: number) => {
    rows.push({ message: parent, depth });
    const replyRows = children.get(parent.id) ?? [];
    for (const reply of replyRows) {
      pushThread(reply, depth + 1);
    }
  };

  for (const root of roots) {
    pushThread(root, 0);
  }

  return rows;
}

export function MessageList({
  messages,
  isLoading = false,
  emptyLabel = "No messages yet. Start a focused conversation.",
  canDeleteMessage,
  onDeleteMessage,
  onReplyMessage,
  canReplyMessage = () => true,
  replyingMessageId = null,
  isDeletingMessageId = null
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threadRows = useMemo(() => buildThreadRows(messages), [messages]);

  const handleDelete = useCallback(
    async (message: ChannelMessageModel) => {
      if (!onDeleteMessage) {
        return;
      }

      const approved = window.confirm("Delete this message from the channel?");
      if (!approved) {
        return;
      }

      await onDeleteMessage(message);
    },
    [onDeleteMessage]
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  if (isLoading && !messages.length) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={`message-skeleton-${index}`} className="rounded-2xl border border-border/80 bg-background/30 p-3">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 px-4 py-8">
        <EmptyState
          icon={MessageSquare}
          title="Conversation is empty"
          description={emptyLabel}
          className="text-left"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {threadRows.map(({ message, depth }) => {
        const displayName = message.user.name || message.user.email;
        const authorHighlightClassName =
          message.user.role === "ADMIN" || message.user.membershipTier === "CORE"
            ? getTierAccentTextClassName("CORE")
            : message.user.membershipTier === "INNER_CIRCLE" ||
                message.user.role === "INNER_CIRCLE"
              ? getTierAccentTextClassName("INNER_CIRCLE")
              : "text-foreground";
        const allowDelete = canDeleteMessage?.(message) ?? false;
        const allowReply = canReplyMessage(message);
        const deleting = isDeletingMessageId === message.id;
        const isReplyTarget = replyingMessageId === message.id;
        const hasParent = Boolean(message.parentMessageId);
        const depthOffset = Math.min(depth, 4) * 24;

        return (
          <article
            key={message.id}
            className={`rounded-2xl border bg-background/30 p-3 ${
              isReplyTarget
                ? "border-gold/45 shadow-inner-surface"
                : "border-border/80"
            }`}
            style={{ marginLeft: `${depthOffset}px` }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Avatar name={displayName} image={message.user.image} className="h-8 w-8" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={`truncate text-sm font-medium ${
                        authorHighlightClassName
                      }`}
                    >
                      {displayName}
                    </p>
                    <CommunityBadge badge={message.user.primaryBadge} mode="icon" />
                    <MemberRoleBadge roleTag={message.user.memberRoleTag} />
                  </div>
                  <p className="text-xs text-muted">
                    {formatDistanceToNowStrict(new Date(message.createdAt), {
                      addSuffix: true
                    })}
                    {message.isEdited ? " | edited" : ""}
                    {hasParent ? " | reply" : ""}
                    {message.user.statusLevel ? ` | ${message.user.statusLevel}` : ""}
                    {message.user.reputationScore > 0
                      ? ` | Reputation ${message.user.reputationScore}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {allowReply ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted hover:text-foreground"
                    onClick={() => onReplyMessage?.(message)}
                  >
                    <Reply size={12} className="mr-1" />
                    Reply
                  </Button>
                ) : null}
                {allowDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted hover:text-foreground"
                    disabled={deleting}
                    onClick={() => {
                      void handleDelete(message);
                    }}
                  >
                    <Trash2 size={12} className="mr-1" />
                    {deleting ? "Deleting" : "Delete"}
                  </Button>
                ) : null}
              </div>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content}</p>
          </article>
        );
      })}
    </div>
  );
}
