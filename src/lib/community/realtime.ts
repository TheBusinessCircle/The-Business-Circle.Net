import type { ChannelMessageModel } from "@/types";
import { logServerError } from "@/lib/security/logging";

export type CommunityRealtimeEvent =
  | {
      type: "message.created";
      channelSlug: string;
      message: ChannelMessageModel;
    }
  | {
      type: "message.deleted";
      channelSlug: string;
      messageId: string;
    };

export type CommunityRealtimePublisher = {
  publish: (event: CommunityRealtimeEvent) => Promise<void>;
};

const noopPublisher: CommunityRealtimePublisher = {
  publish: async () => {
    // Intentionally no-op. Add Pusher/socket publisher via setCommunityRealtimePublisher.
  }
};

let activePublisher: CommunityRealtimePublisher = noopPublisher;

export function setCommunityRealtimePublisher(
  publisher: CommunityRealtimePublisher
) {
  activePublisher = publisher;
}

export async function publishCommunityEvent(event: CommunityRealtimeEvent) {
  try {
    await activePublisher.publish(event);
  } catch (error) {
    logServerError("community-realtime-publish-failed", error, {
      eventType: event.type,
      channelSlug: event.channelSlug
    });
  }
}
