"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  resolveCommunityTransport,
  type CommunityMessageSubscription,
  type CommunityTransportMode
} from "@/lib/community";
import type { ChannelMessageModel } from "@/types";

type UseCommunityChannelOptions = {
  pollIntervalMs?: number;
  transportMode?: CommunityTransportMode;
};

const DEFAULT_POLL_INTERVAL_MS = 3500;

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to process request.";
}

function mergeMessages(previous: ChannelMessageModel[], incoming: ChannelMessageModel[]) {
  const byId = new Map<string, ChannelMessageModel>();

  for (const message of previous) {
    byId.set(message.id, message);
  }

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function useCommunityChannel(
  channelSlug: string,
  options: UseCommunityChannelOptions = {}
) {
  const transportMode = options.transportMode ?? "polling";
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const transport = useMemo(
    () => resolveCommunityTransport(transportMode),
    [transportMode]
  );

  const [messages, setMessages] = useState<ChannelMessageModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeletingMessageId, setIsDeletingMessageId] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadMessages = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const incoming = await transport.fetchMessages(channelSlug);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(null);
      setMessages((previous) => mergeMessages(previous, incoming));
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(normalizeError(loadError));
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [channelSlug, transport]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setIsLoading(true);
    void loadMessages();

    const handlers: CommunityMessageSubscription = {
      onCreated: (message) => {
        setMessages((previous) => mergeMessages(previous, [message]));
      },
      onDeleted: (messageId) => {
        setMessages((previous) => previous.filter((message) => message.id !== messageId));
      }
    };

    const realtimeSubscription =
      transportMode === "realtime" && typeof transport.subscribe === "function"
        ? transport.subscribe(channelSlug, handlers)
        : null;
    const hasSubscription = typeof realtimeSubscription === "function";

    const timer = !hasSubscription
      ? setInterval(() => {
          void loadMessages();
        }, pollIntervalMs)
      : undefined;

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      realtimeSubscription?.();
      requestIdRef.current += 1;
    };
  }, [channelSlug, loadMessages, pollIntervalMs, transport, transportMode]);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        parentMessageId?: string;
      }
    ) => {
      const trimmed = content.trim();
      if (!trimmed.length) {
        return false;
      }

      setIsSending(true);

      try {
        const message = await transport.sendMessage(channelSlug, trimmed, options);
        setError(null);
        setMessages((previous) => mergeMessages(previous, [message]));
        return true;
      } catch (sendError) {
        setError(normalizeError(sendError));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [channelSlug, transport]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId) {
        return false;
      }

      setIsDeletingMessageId(messageId);

      try {
        const deletedMessageId = await transport.deleteMessage(channelSlug, messageId);
        setError(null);
        setMessages((previous) =>
          previous.filter((message) => message.id !== deletedMessageId)
        );
        return true;
      } catch (deleteError) {
        setError(normalizeError(deleteError));
        return false;
      } finally {
        setIsDeletingMessageId((current) => (current === messageId ? null : current));
      }
    },
    [channelSlug, transport]
  );

  return {
    messages,
    error,
    isLoading,
    isSending,
    isDeletingMessageId,
    sendMessage,
    deleteMessage,
    refresh: loadMessages,
    transportMode
  };
}
