import type { ChannelMessageModel, CommunityChannelModel } from "@/types";

type ChannelMessagesResponse = {
  messages?: ChannelMessageModel[];
  channel?: CommunityChannelModel;
  error?: string;
};

type ChannelMessageResponse = {
  message?: ChannelMessageModel;
  error?: string;
};

type DeleteChannelMessageResponse = {
  ok?: boolean;
  messageId?: string;
  error?: string;
};

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function fetchChannelMessages(slug: string): Promise<ChannelMessageModel[]> {
  try {
    const response = await fetch(`/api/channels/${slug}/messages`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as ChannelMessagesResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load channel messages.");
    }

    return payload.messages ?? [];
  } catch (error) {
    throw new Error(toErrorMessage(error, "Unable to load channel messages."));
  }
}

export async function sendChannelMessage(
  slug: string,
  content: string,
  options?: {
    parentMessageId?: string;
  }
): Promise<ChannelMessageModel> {
  try {
    const response = await fetch(`/api/channels/${slug}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content,
        parentMessageId: options?.parentMessageId
      })
    });
    const payload = (await response.json()) as ChannelMessageResponse;

    if (!response.ok || !payload.message) {
      throw new Error(payload.error ?? "Unable to send message.");
    }

    return payload.message;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Unable to send message."));
  }
}

export async function deleteChannelMessage(slug: string, messageId: string): Promise<string> {
  try {
    const response = await fetch(`/api/channels/${slug}/messages/${messageId}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as DeleteChannelMessageResponse;

    if (!response.ok || !payload.ok || !payload.messageId) {
      throw new Error(payload.error ?? "Unable to delete message.");
    }

    return payload.messageId;
  } catch (error) {
    throw new Error(toErrorMessage(error, "Unable to delete message."));
  }
}
