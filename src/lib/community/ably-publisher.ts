import "server-only";
import { getAblyRestClient, communityChannelName } from "@/lib/community/ably-server";
import {
  setCommunityRealtimePublisher,
  type CommunityRealtimeEvent
} from "@/lib/community/realtime";

let configured = false;

function toEventPayload(event: CommunityRealtimeEvent) {
  if (event.type === "message.created") {
    return {
      channelSlug: event.channelSlug,
      message: event.message
    };
  }

  return {
    channelSlug: event.channelSlug,
    messageId: event.messageId
  };
}

export function ensureCommunityRealtimePublisherConfigured() {
  if (configured) {
    return;
  }

  configured = true;
  const restClient = getAblyRestClient();
  if (!restClient) {
    return;
  }

  setCommunityRealtimePublisher({
    publish: async (event) => {
      const channel = restClient.channels.get(communityChannelName(event.channelSlug));
      await channel.publish(event.type, toEventPayload(event));
    }
  });
}
