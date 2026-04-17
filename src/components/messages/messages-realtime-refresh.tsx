"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { messagesThreadChannelName, messagesUserChannelName } from "@/lib/messages/realtime";

type MessagesRealtimeRefreshProps = {
  userId?: string | null;
  threadId?: string | null;
};

let realtimeClientPromise: Promise<import("ably").Realtime> | null = null;

function isRealtimeEnabledForClient() {
  return process.env.NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED === "true";
}

async function getRealtimeClient() {
  if (typeof window === "undefined" || !isRealtimeEnabledForClient()) {
    return null;
  }

  if (!realtimeClientPromise) {
    realtimeClientPromise = import("ably").then((ably) => {
      return new ably.Realtime({
        authUrl: "/api/messages/realtime/token",
        authMethod: "GET",
        closeOnUnload: true,
        recover: (_lastConnectionDetails, callback) => {
          callback(false);
        }
      });
    });
  }

  return realtimeClientPromise;
}

export function MessagesRealtimeRefresh({ userId, threadId }: MessagesRealtimeRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let closed = false;
    let cleanup: (() => void) | null = null;

    if (!userId || !isRealtimeEnabledForClient()) {
      return undefined;
    }

    void (async () => {
      const realtimeClient = await getRealtimeClient();
      if (!realtimeClient || closed) {
        return;
      }

      const channels = [realtimeClient.channels.get(messagesUserChannelName(userId))];
      if (threadId) {
        channels.push(realtimeClient.channels.get(messagesThreadChannelName(threadId)));
      }

      const onRefresh = () => {
        if (!closed) {
          router.refresh();
        }
      };

      await Promise.all(channels.map((channel) => channel.subscribe("refresh", onRefresh)));
      cleanup = () => {
        channels.forEach((channel) => channel.unsubscribe("refresh", onRefresh));
      };
    })();

    return () => {
      closed = true;
      cleanup?.();
    };
  }, [router, threadId, userId]);

  return null;
}
