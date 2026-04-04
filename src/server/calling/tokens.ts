import { AccessToken } from "livekit-server-sdk";
import { buildCallParticipantIdentity } from "@/lib/calling";
import type { SafeLogDetails } from "@/lib/security/logging";
import {
  ensureLiveKitRoom,
  getLiveKitConfig,
  type LiveKitConfigSummary,
  LiveKitConfigError,
  listLiveKitParticipants
} from "@/server/calling/livekit";
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

export type CallRoomTokenIssueStage =
  | "config-validation"
  | "livekit-room-prepare"
  | "livekit-participant-check"
  | "token-construction"
  | "token-signing"
  | "presence-record"
  | "response-build";

export class CallRoomTokenIssueError extends Error {
  readonly name = "CallRoomTokenIssueError";

  constructor(
    message: string,
    readonly stage: CallRoomTokenIssueStage,
    readonly safeMessage: string,
    readonly status: number,
    readonly details?: SafeLogDetails,
    readonly code?: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

function liveKitSummaryToLogDetails(summary: LiveKitConfigSummary): SafeLogDetails {
  return {
    livekitPublicUrlConfigured: summary.publicUrlConfigured,
    livekitPublicUrlProtocol: summary.publicUrlProtocol ?? undefined,
    livekitServerUrlConfigured: summary.serverUrlConfigured,
    livekitServerUrlProtocol: summary.serverUrlProtocol ?? undefined,
    livekitServerUrlDerived: summary.serverUrlDerivedFromPublicUrl,
    livekitApiKeyConfigured: summary.apiKeyConfigured,
    livekitApiSecretConfigured: summary.apiSecretConfigured
  };
}

function toCallRoomTokenIssueError(
  stage: CallRoomTokenIssueStage,
  error: unknown,
  options: {
    message: string;
    safeMessage: string;
    status: number;
    code?: string;
    details?: SafeLogDetails;
  }
) {
  if (error instanceof CallRoomTokenIssueError) {
    return error;
  }

  const liveKitDetails =
    error instanceof LiveKitConfigError ? liveKitSummaryToLogDetails(error.summary) : undefined;

  return new CallRoomTokenIssueError(
    options.message,
    stage,
    options.safeMessage,
    options.status,
    {
      ...liveKitDetails,
      ...options.details
    },
    options.code ?? (error instanceof LiveKitConfigError ? error.code : undefined),
    { cause: error }
  );
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

  const liveKitConfig = (() => {
    try {
      return getLiveKitConfig();
    } catch (error) {
      throw toCallRoomTokenIssueError("config-validation", error, {
        message: "LiveKit calling configuration is invalid.",
        safeMessage: "Calling is temporarily unavailable because realtime configuration is incomplete.",
        status: 503
      });
    }
  })();

  try {
    await ensureLiveKitRoom(room);
  } catch (error) {
    throw toCallRoomTokenIssueError("livekit-room-prepare", error, {
      message: "LiveKit room preparation failed.",
      safeMessage: "Unable to start the call right now. Please try again in a moment.",
      status: 503,
      details: liveKitSummaryToLogDetails(liveKitConfig.summary)
    });
  }

  const liveParticipants = await (async () => {
    try {
      return await listLiveKitParticipants(room.livekitRoomName);
    } catch (error) {
      throw toCallRoomTokenIssueError("livekit-participant-check", error, {
        message: "LiveKit participant lookup failed.",
        safeMessage: "Unable to start the call right now. Please try again in a moment.",
        status: 503,
        details: liveKitSummaryToLogDetails(liveKitConfig.summary)
      });
    }
  })();
  const identity = buildCallParticipantIdentity(input.actor.id);
  const isAlreadyConnected = liveParticipants.some((participant) => participant.identity === identity);

  if (!isAlreadyConnected && liveParticipants.length >= room.maxParticipants) {
    throw new Error("room-full");
  }

  const { effectiveTier } = await getCallingContext(input.actor);
  const token = (() => {
    try {
      return new AccessToken(liveKitConfig.apiKey, liveKitConfig.apiSecret, {
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
    } catch (error) {
      throw toCallRoomTokenIssueError("token-construction", error, {
        message: "LiveKit access token construction failed.",
        safeMessage: "Unable to start the call right now. Please try again in a moment.",
        status: 500,
        details: liveKitSummaryToLogDetails(liveKitConfig.summary)
      });
    }
  })();

  token.addGrant({
    roomJoin: true,
    room: room.livekitRoomName,
    roomAdmin: input.actor.role === "ADMIN" || room.hostUserId === input.actor.id,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false
  });

  const jwt = await (async () => {
    try {
      return await token.toJwt();
    } catch (error) {
      throw toCallRoomTokenIssueError("token-signing", error, {
        message: "LiveKit access token signing failed.",
        safeMessage: "Unable to start the call right now. Please try again in a moment.",
        status: 500,
        details: liveKitSummaryToLogDetails(liveKitConfig.summary)
      });
    }
  })();

  try {
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
  } catch (error) {
    throw toCallRoomTokenIssueError("presence-record", error, {
      message: "Call participant presence recording failed.",
      safeMessage: "Unable to complete the call join right now. Please try again in a moment.",
      status: 500
    });
  }

  try {
    return {
      token: jwt,
      identity,
      url: liveKitConfig.publicUrl,
      rtcConfig: getCallingRtcConfig(input.actor.id),
      room
    };
  } catch (error) {
    throw toCallRoomTokenIssueError("response-build", error, {
      message: "Call room token response formatting failed.",
      safeMessage: "Unable to complete the call join right now. Please try again in a moment.",
      status: 500,
      details: liveKitSummaryToLogDetails(liveKitConfig.summary)
    });
  }
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
