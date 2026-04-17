import "server-only";

import { getAblyRestClient } from "@/lib/community/ably-server";
import { messagesThreadChannelName, messagesUserChannelName } from "@/lib/messages/realtime";

async function publishRefresh(channelName: string, payload: Record<string, unknown>) {
  const restClient = getAblyRestClient();
  if (!restClient) {
    return;
  }

  const channel = restClient.channels.get(channelName);
  await channel.publish("refresh", payload);
}

export async function publishMessagesUserRefresh(userId: string, payload: Record<string, unknown> = {}) {
  await publishRefresh(messagesUserChannelName(userId), payload);
}

export async function publishMessagesThreadRefresh(threadId: string, payload: Record<string, unknown> = {}) {
  await publishRefresh(messagesThreadChannelName(threadId), payload);
}
