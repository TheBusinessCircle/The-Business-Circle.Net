import type { CommunityTransportMode } from "@/lib/community/transport";

function parseBoolean(value: string | undefined) {
  if (!value) {
    return false;
  }

  return value.trim().toLowerCase() === "true";
}

export function isCommunityRealtimeFlagEnabled() {
  return parseBoolean(process.env.NEXT_PUBLIC_COMMUNITY_REALTIME_ENABLED);
}

export function isCommunityRealtimeConfiguredOnServer() {
  return Boolean(process.env.ABLY_API_KEY?.trim());
}

export function resolveCommunityTransportMode(): CommunityTransportMode {
  return isCommunityRealtimeFlagEnabled() && isCommunityRealtimeConfiguredOnServer()
    ? "realtime"
    : "polling";
}
