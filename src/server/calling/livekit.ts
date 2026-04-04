import type { CallRoom } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";

let roomServiceClient: RoomServiceClient | null = null;

type LiveKitUrlProtocol = "http" | "https" | "ws" | "wss" | "unknown" | null;

export type LiveKitConfigSummary = {
  publicUrlConfigured: boolean;
  publicUrlProtocol: LiveKitUrlProtocol;
  serverUrlConfigured: boolean;
  serverUrlProtocol: LiveKitUrlProtocol;
  serverUrlDerivedFromPublicUrl: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
};

export type LiveKitConfig = {
  publicUrl: string;
  serverUrl: string;
  apiKey: string;
  apiSecret: string;
  summary: LiveKitConfigSummary;
};

export class LiveKitConfigError extends Error {
  readonly code = "livekit-config-invalid";

  constructor(
    message: string,
    readonly summary: LiveKitConfigSummary
  ) {
    super(message);
    this.name = "LiveKitConfigError";
  }
}

function getUrlProtocol(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith("https://")) {
    return "https";
  }

  if (value.startsWith("http://")) {
    return "http";
  }

  if (value.startsWith("wss://")) {
    return "wss";
  }

  if (value.startsWith("ws://")) {
    return "ws";
  }

  return "unknown";
}

function deriveServerUrl(publicUrl: string | undefined) {
  if (!publicUrl) {
    return undefined;
  }

  if (publicUrl.startsWith("wss://")) {
    return `https://${publicUrl.slice("wss://".length)}`;
  }

  if (publicUrl.startsWith("ws://")) {
    return `http://${publicUrl.slice("ws://".length)}`;
  }

  if (publicUrl.startsWith("https://") || publicUrl.startsWith("http://")) {
    return publicUrl;
  }

  return undefined;
}

function readRawLiveKitEnvironment() {
  const publicUrl = process.env.LIVEKIT_URL?.trim() || undefined;
  const configuredServerUrl = process.env.LIVEKIT_SERVER_URL?.trim() || undefined;
  const serverUrl = configuredServerUrl || deriveServerUrl(publicUrl);
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() || undefined;
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || undefined;

  return {
    publicUrl,
    configuredServerUrl,
    serverUrl,
    apiKey,
    apiSecret
  };
}

export function getLiveKitConfigSummary(): LiveKitConfigSummary {
  const env = readRawLiveKitEnvironment();

  return {
    publicUrlConfigured: Boolean(env.publicUrl),
    publicUrlProtocol: getUrlProtocol(env.publicUrl),
    serverUrlConfigured: Boolean(env.serverUrl),
    serverUrlProtocol: getUrlProtocol(env.serverUrl),
    serverUrlDerivedFromPublicUrl: !env.configuredServerUrl && Boolean(env.publicUrl && env.serverUrl),
    apiKeyConfigured: Boolean(env.apiKey),
    apiSecretConfigured: Boolean(env.apiSecret)
  };
}

export function getLiveKitConfig(): LiveKitConfig {
  const env = readRawLiveKitEnvironment();
  const summary = getLiveKitConfigSummary();

  if (!env.publicUrl || !env.apiKey || !env.apiSecret) {
    throw new LiveKitConfigError(
      "LiveKit calling is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      summary
    );
  }

  if (!["ws", "wss", "http", "https"].includes(summary.publicUrlProtocol ?? "")) {
    throw new LiveKitConfigError(
      "LIVEKIT_URL must use ws://, wss://, http://, or https://.",
      summary
    );
  }

  if (!env.serverUrl) {
    throw new LiveKitConfigError(
      "LIVEKIT_SERVER_URL is missing. Set it to the server-to-server HTTP endpoint for LiveKit.",
      summary
    );
  }

  if (!["http", "https"].includes(summary.serverUrlProtocol ?? "")) {
    throw new LiveKitConfigError(
      "LIVEKIT_SERVER_URL must use http:// or https:// so the server can call the LiveKit API.",
      summary
    );
  }

  return {
    publicUrl: env.publicUrl,
    serverUrl: env.serverUrl,
    apiKey: env.apiKey,
    apiSecret: env.apiSecret,
    summary
  };
}

function getRoomServiceClient() {
  if (roomServiceClient) {
    return roomServiceClient;
  }

  const credentials = getLiveKitConfig();
  roomServiceClient = new RoomServiceClient(
    credentials.serverUrl,
    credentials.apiKey,
    credentials.apiSecret
  );
  return roomServiceClient;
}

function isAlreadyExistsError(error: unknown) {
  return error instanceof Error && /already exists/i.test(error.message);
}

function isMissingRoomError(error: unknown) {
  return error instanceof Error && /(not found|requested room does not exist|room does not exist)/i.test(error.message);
}

export function isLiveKitConfigured() {
  try {
    getLiveKitConfig();
    return true;
  } catch {
    return false;
  }
}

export function getLiveKitPublicConfig() {
  const { publicUrl } = getLiveKitConfig();

  return {
    url: publicUrl
  };
}

export async function ensureLiveKitRoom(
  room: Pick<CallRoom, "id" | "type" | "status" | "hostUserId" | "livekitRoomName" | "maxParticipants">
) {
  const client = getRoomServiceClient();

  try {
    await client.createRoom({
      name: room.livekitRoomName,
      emptyTimeout: 60 * 10,
      departureTimeout: 90,
      maxParticipants: room.maxParticipants,
      metadata: JSON.stringify({
        roomId: room.id,
        type: room.type,
        status: room.status,
        hostUserId: room.hostUserId
      })
    });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return;
    }

    throw error;
  }
}

export async function listLiveKitParticipants(roomName: string) {
  const client = getRoomServiceClient();

  try {
    return await client.listParticipants(roomName);
  } catch (error) {
    if (isMissingRoomError(error)) {
      return [];
    }

    throw error;
  }
}

export async function deleteLiveKitRoom(roomName: string) {
  const client = getRoomServiceClient();

  try {
    await client.deleteRoom(roomName);
  } catch (error) {
    if (isMissingRoomError(error)) {
      return;
    }

    throw error;
  }
}
