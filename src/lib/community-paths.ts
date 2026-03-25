export function buildCommunityChannelPath(channelSlug: string) {
  const params = new URLSearchParams({ channel: channelSlug });
  return `/community?${params.toString()}`;
}

export function buildCommunityFeedPostPath(channelSlug: string, postId: string) {
  const params = new URLSearchParams({
    channel: channelSlug,
    post: postId
  });
  return `/community?${params.toString()}`;
}

export function buildCommunityPostPath(postId: string) {
  return `/community/post/${postId}`;
}
