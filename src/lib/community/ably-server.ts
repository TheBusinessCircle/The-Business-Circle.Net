import "server-only";
import Ably from "ably";

let restClient: Ably.Rest | null | undefined;

export function communityChannelPrefix() {
  return process.env.ABLY_CHANNEL_PREFIX?.trim() || "community";
}

export function communityChannelName(channelSlug: string) {
  return `${communityChannelPrefix()}:${channelSlug}`;
}

export function getAblyRestClient() {
  if (restClient !== undefined) {
    return restClient;
  }

  const apiKey = process.env.ABLY_API_KEY?.trim();
  if (!apiKey) {
    restClient = null;
    return restClient;
  }

  restClient = new Ably.Rest({
    key: apiKey
  });

  return restClient;
}
