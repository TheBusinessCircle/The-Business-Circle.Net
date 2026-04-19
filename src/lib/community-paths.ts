import { getStandaloneCommunityChannelPath } from "@/config/community";

function resolveStandalonePath(channelSlug: string) {
  return getStandaloneCommunityChannelPath(channelSlug);
}

export function buildCommunityChannelPath(channelSlug: string) {
  const standalonePath = resolveStandalonePath(channelSlug);
  if (standalonePath) {
    return standalonePath;
  }

  const params = new URLSearchParams({ channel: channelSlug });
  return `/community?${params.toString()}`;
}

export function buildCommunityFeedPostPath(channelSlug: string, postId: string) {
  const standalonePath = resolveStandalonePath(channelSlug);
  if (standalonePath) {
    const params = new URLSearchParams({
      post: postId
    });
    return `${standalonePath}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    channel: channelSlug,
    post: postId
  });
  return `/community?${params.toString()}`;
}

export function buildCommunityPostPath(postId: string, channelSlug?: string | null) {
  const standalonePath = channelSlug ? resolveStandalonePath(channelSlug) : null;
  if (standalonePath) {
    return `${standalonePath}/post/${postId}`;
  }

  return `/community/post/${postId}`;
}
