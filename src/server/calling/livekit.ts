import type { CallRoom } from "@prisma/client";
import { RoomServiceClient } from "livekit-server-sdk";

let roomServiceClient: RoomServiceClient | null = null;

function getLiveKitCredentials() {
  const publicUrl = process.env.LIVEKIT_URL?.trim();
  const serverUrl = process.env.LIVEKIT_SERVER_URL?.trim() || publicUrl;
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!publicUrl || !serverUrl || !apiKey || !apiSecret) {
    throw new Error("livekit-not-configured");
  }

  return {
    publicUrl,
    serverUrl,
    apiKey,
    apiSecret
  };
}

function getRoomServiceClient() {
  if (roomServiceClient) {
    return roomServiceClient;
  }

  const credentials = getLiveKitCredentials();
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
  return Boolean(
    process.env.LIVEKIT_URL?.trim() &&
      process.env.LIVEKIT_API_KEY?.trim() &&
      process.env.LIVEKIT_API_SECRET?.trim()
  );
}

export function getLiveKitPublicConfig() {
  const { publicUrl } = getLiveKitCredentials();

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
