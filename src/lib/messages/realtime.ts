export function messagesChannelPrefix() {
  return process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX?.trim()
    ? `${process.env.NEXT_PUBLIC_ABLY_CHANNEL_PREFIX?.trim()}:messages`
    : "messages";
}

export function messagesUserChannelName(userId: string) {
  return `${messagesChannelPrefix()}:user:${userId}`;
}

export function messagesThreadChannelName(threadId: string) {
  return `${messagesChannelPrefix()}:thread:${threadId}`;
}
