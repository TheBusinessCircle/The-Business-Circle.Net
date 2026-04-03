import { AccessToken } from "livekit-server-sdk";
import { buildCallParticipantIdentity } from "@/lib/calling";
import { ensureLiveKitRoom, getLiveKitPublicConfig, listLiveKitParticipants } from "@/server/calling/livekit";
import {
  canUserJoinCallRoom,
  getCallingContext,
  type CallingUser
} from "@/server/calling/permissions";
import {
  getCallRoomById,
  recordCallParticipantPresence,
  syncCallRoomStatus
} from "@/server/calling/rooms";
import { getCallingRtcConfig } from "@/server/calling/turn";

function getTokenIssuerCredentials() {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    throw new Error("livekit-not-configured");
  }

  return {
    apiKey,
    apiSecret
  };
}

export async function validateCallRoomAccess(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await syncCallRoomStatus(input.roomId);

  if (!room) {
    return {
      allowed: false,
      code: "room-not-found",
      message: "That call room could not be found.",
      room: null
    };
  }

  const access = await canUserJoinCallRoom(
    input.actor,
    room,
    room.participants.map((participant) => participant.userId)
  );

  if (!access.allowed) {
    return {
      allowed: false,
      code: access.code,
      message: access.message,
      room
    };
  }

  return {
    allowed: true,
    room,
    canJoinNow:
      input.actor.role === "ADMIN" ||
      room.hostUserId === input.actor.id ||
      !room.startsAt ||
      room.startsAt.getTime() <= Date.now()
  };
}

export async function issueCallRoomToken(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await syncCallRoomStatus(input.roomId);

  if (!room) {
    throw new Error("room-not-found");
  }

  const access = await canUserJoinCallRoom(
    input.actor,
    room,
    room.participants.map((participant) => participant.userId)
  );

  if (!access.allowed) {
    throw new Error(access.code ?? "room-join-forbidden");
  }

  const canJoinNow =
    input.actor.role === "ADMIN" ||
    room.hostUserId === input.actor.id ||
    !room.startsAt ||
    room.startsAt.getTime() <= Date.now();

  if (!canJoinNow) {
    throw new Error("room-not-live");
  }

  await ensureLiveKitRoom(room);

  const liveParticipants = await listLiveKitParticipants(room.livekitRoomName);
  const identity = buildCallParticipantIdentity(input.actor.id);
  const isAlreadyConnected = liveParticipants.some((participant) => participant.identity === identity);

  if (!isAlreadyConnected && liveParticipants.length >= room.maxParticipants) {
    throw new Error("room-full");
  }

  const { apiKey, apiSecret } = getTokenIssuerCredentials();
  const { effectiveTier } = await getCallingContext(input.actor);
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: input.actor.name ?? input.actor.email ?? "Business Circle Member",
    ttl: "10m",
    metadata: JSON.stringify({
      appUserId: input.actor.id,
      roomId: room.id,
      role:
        input.actor.role === "ADMIN"
          ? "admin"
          : room.hostUserId === input.actor.id
            ? "host"
            : "member",
      membershipTier: effectiveTier
    }),
    attributes: {
      appUserId: input.actor.id,
      roomId: room.id,
      membershipTier: effectiveTier
    }
  });

  token.addGrant({
    roomJoin: true,
    room: room.livekitRoomName,
    roomAdmin: input.actor.role === "ADMIN" || room.hostUserId === input.actor.id,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false
  });

  await recordCallParticipantPresence({
    roomId: room.id,
    userId: input.actor.id,
    role:
      input.actor.role === "ADMIN"
        ? "ADMIN"
        : room.hostUserId === input.actor.id
          ? "HOST"
          : "MEMBER",
    state: "JOINED"
  });

  return {
    token: await token.toJwt(),
    identity,
    url: getLiveKitPublicConfig().url,
    rtcConfig: getCallingRtcConfig(input.actor.id),
    room
  };
}

export async function markCallParticipantLeft(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await getCallRoomById(input.roomId);

  if (!room) {
    throw new Error("room-not-found");
  }

  await recordCallParticipantPresence({
    roomId: room.id,
    userId: input.actor.id,
    state: "LEFT"
  });
}
