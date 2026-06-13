type CommunityChannelDisplayInput = {
  name?: string | null;
  slug?: string | null;
};

const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
  introductions: "Introduction"
};

export function getCommunityChannelDisplayName(channel: CommunityChannelDisplayInput) {
  if (channel.slug && CHANNEL_DISPLAY_NAMES[channel.slug]) {
    return CHANNEL_DISPLAY_NAMES[channel.slug];
  }

  return channel.name?.trim() || "Community";
}
