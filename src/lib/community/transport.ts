import {
  deleteChannelMessage,
  fetchChannelMessages,
  sendChannelMessage
} from "@/lib/community/client";
import { subscribeToCommunityChannel } from "@/lib/community/realtime-client";
import type { ChannelMessageModel } from "@/types";

export type CommunityTransportMode = "polling" | "realtime";

export type CommunityMessageSubscription = {
  onCreated?: (message: ChannelMessageModel) => void;
  onDeleted?: (messageId: string) => void;
};

export type CommunityTransport = {
  mode: CommunityTransportMode;
  fetchMessages: (channelSlug: string) => Promise<ChannelMessageModel[]>;
  sendMessage: (
    channelSlug: string,
    content: string,
    options?: {
      parentMessageId?: string;
    }
  ) => Promise<ChannelMessageModel>;
  deleteMessage: (channelSlug: string, messageId: string) => Promise<string>;
  subscribe?: (
    channelSlug: string,
    handlers: CommunityMessageSubscription
  ) => (() => void) | null;
};

export const pollingCommunityTransport: CommunityTransport = {
  mode: "polling",
  fetchMessages: fetchChannelMessages,
  sendMessage: sendChannelMessage,
  deleteMessage: deleteChannelMessage
};

export const realtimeReadyTransport: CommunityTransport = {
  mode: "realtime",
  fetchMessages: fetchChannelMessages,
  sendMessage: sendChannelMessage,
  deleteMessage: deleteChannelMessage,
  subscribe: subscribeToCommunityChannel
};

export function resolveCommunityTransport(mode: CommunityTransportMode): CommunityTransport {
  if (mode === "realtime") {
    return realtimeReadyTransport;
  }

  return pollingCommunityTransport;
}
