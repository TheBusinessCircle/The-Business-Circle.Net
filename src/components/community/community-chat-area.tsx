"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useCommunityChannel } from "@/hooks/use-community";
import { Button } from "@/components/ui/button";
import type { CommunityTransportMode } from "@/lib/community";
import type { ChannelMessageModel, CommunityChannelModel } from "@/types";
import { CommunityHeader } from "@/components/community/community-header";
import { MessageComposer } from "@/components/community/message-composer";
import { MessageList } from "@/components/community/message-list";

type CommunityChatAreaProps = {
  channel: CommunityChannelModel;
  currentUser: {
    role: "MEMBER" | "INNER_CIRCLE" | "ADMIN";
  };
  transportMode?: CommunityTransportMode;
};

export function CommunityChatArea({
  channel,
  currentUser,
  transportMode = "polling"
}: CommunityChatAreaProps) {
  const [replyTarget, setReplyTarget] = useState<ChannelMessageModel | null>(null);
  const {
    messages,
    error,
    isLoading,
    isSending,
    isDeletingMessageId,
    sendMessage,
    deleteMessage,
    refresh,
    transportMode: activeTransport
  } = useCommunityChannel(channel.slug, {
    transportMode
  });

  useEffect(() => {
    setReplyTarget(null);
  }, [channel.slug]);

  return (
    <section className="flex h-[76vh] min-w-0 flex-col rounded-3xl border border-border/90 bg-card/75 shadow-panel-soft">
      <CommunityHeader
        channel={channel}
        messageCount={messages.length}
        transportModeLabel={activeTransport === "polling" ? "Live Sync" : "Realtime"}
      />

      {error ? (
        <div className="border-b border-border/70 bg-red-500/10 px-4 py-2">
          <p className="inline-flex items-center gap-1 text-xs text-red-200">
            <AlertTriangle size={12} />
            {error}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-xs text-red-100 hover:bg-red-500/15"
            onClick={() => {
              void refresh();
            }}
          >
            <RefreshCcw size={12} className="mr-1" />
            Retry
          </Button>
        </div>
      ) : null}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        canDeleteMessage={() => currentUser.role === "ADMIN"}
        onDeleteMessage={async (message) => deleteMessage(message.id)}
        isDeletingMessageId={isDeletingMessageId}
        onReplyMessage={(message) => setReplyTarget(message)}
        replyingMessageId={replyTarget?.id ?? null}
      />
      <MessageComposer
        onSubmit={async (content, options) => {
          const didSend = await sendMessage(content, options);
          if (didSend) {
            setReplyTarget(null);
          }
          return didSend;
        }}
        isSending={isSending}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
      />
    </section>
  );
}
