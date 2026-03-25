"use client";

import { useEffect, useState } from "react";
import { fetchChannelMessages } from "@/lib/community";
import type { ChannelMessageModel } from "@/types";

type UseChannelMessagesOptions = {
  intervalMs?: number;
};

export function useChannelMessages(channelSlug: string, options: UseChannelMessagesOptions = {}) {
  const intervalMs = options.intervalMs ?? 4000;
  const [messages, setMessages] = useState<ChannelMessageModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const payload = await fetchChannelMessages(channelSlug);

        if (cancelled) {
          return;
        }

        setError(null);
        setMessages(payload);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unable to load messages.";
        setError(message);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [channelSlug, intervalMs]);

  return { messages, setMessages, error };
}
