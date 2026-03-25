import type { CommunityMessageSubscription } from "@/lib/community/transport";
import type { ChannelMessageModel } from "@/types";

type AblyMessage = {
  data?: unknown;
};

type CommunityCreatedPayload = {
  channelSlug?: string;
  message?: ChannelMessageModel;
};

type CommunityDeletedPayload = {
  channelSlug?: string;
  messageId?: string;
};

let realtimeClientPromise: Promise<import("ably").Realtime> | null = null;

function isRealtimeEnabledForClient() {
  return process.env.NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED === "true";
}

function communityChannelPrefix() {
  return process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX?.trim() || "community";
}

function communityChannelName(channelSlug: string) {
  return `${communityChannelPrefix()}:${channelSlug}`;
}

async function getRealtimeClient() {
  if (typeof window === "undefined" || !isRealtimeEnabledForClient()) {
    return null;
  }

  if (!realtimeClientPromise) {
    realtimeClientPromise = import("ably").then((ably) => {
      return new ably.Realtime({
        authUrl: "/api/community/realtime/token",
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

export function subscribeToCommunityChannel(
  channelSlug: string,
  handlers: CommunityMessageSubscription
) {
  if (!isRealtimeEnabledForClient() || typeof window === "undefined") {
    return null;
  }

  let isClosed = false;
  let cleanup: (() => void) | null = null;

  void (async () => {
    try {
      const realtimeClient = await getRealtimeClient();
      if (!realtimeClient || isClosed) {
        return;
      }

      const channel = realtimeClient.channels.get(communityChannelName(channelSlug));

      const onCreated = (ablyMessage: AblyMessage) => {
        const payload = (ablyMessage.data ?? {}) as CommunityCreatedPayload;
        if (payload.channelSlug !== channelSlug || !payload.message) {
          return;
        }

        handlers.onCreated?.(payload.message);
      };

      const onDeleted = (ablyMessage: AblyMessage) => {
        const payload = (ablyMessage.data ?? {}) as CommunityDeletedPayload;
        if (payload.channelSlug !== channelSlug || !payload.messageId) {
          return;
        }

        handlers.onDeleted?.(payload.messageId);
      };

      await channel.subscribe("message.created", onCreated);
      await channel.subscribe("message.deleted", onDeleted);

      cleanup = () => {
        channel.unsubscribe("message.created", onCreated);
        channel.unsubscribe("message.deleted", onDeleted);
      };
    } catch {
      cleanup = null;
    }
  })();

  return () => {
    isClosed = true;
    cleanup?.();
  };
}
