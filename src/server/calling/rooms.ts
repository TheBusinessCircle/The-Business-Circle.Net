import { randomUUID } from "node:crypto";
import {
  Prisma,
  SubscriptionStatus,
  type CallParticipantPresenceState,
  type CallParticipantRole,
  type CallRoom,
  type MembershipTier
} from "@prisma/client";
import { db } from "@/lib/db";
import { buildCallParticipantIdentity, normalizeTierVisibility } from "@/lib/calling";
import { slugify } from "@/lib/utils";
import { recordCallAuditLog } from "@/server/calling/audit";
import {
  isMissingCallingSchemaError,
  logCallingSchemaFallback
} from "@/server/calling/errors";
import { deleteLiveKitRoom, listLiveKitParticipants } from "@/server/calling/livekit";
import {
  canHostAudienceScope,
  canUserHostGroupCalls,
  canUserJoinCallRoom,
  canUserStartOneToOneCalls,
  type CallingUser
} from "@/server/calling/permissions";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

const callRoomDetailInclude = {
  hostUser: {
    select: {
      id: true,
      name: true,
      email: true,
      membershipTier: true,
      role: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      membershipTier: true,
      role: true
    }
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true,
          role: true,
          image: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  schedule: true
} satisfies Prisma.CallRoomInclude;

export type CallRoomDetail = Prisma.CallRoomGetPayload<{
  include: typeof callRoomDetailInclude;
}>;

export type CreateGroupCallRoomInput = {
  actor: CallingUser;
  title: string;
  description?: string | null;
  audienceScope: CallRoom["tierVisibility"];
  customTierVisibility?: MembershipTier[];
  maxParticipants?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isRecorded?: boolean;
  roomType: CallRoom["type"];
};

type ParticipantPresenceInput = {
  roomId: string;
  userId: string;
  role?: CallParticipantRole;
  state: CallParticipantPresenceState;
};

function toCallingUser(input: {
  id: string;
  name: string | null;
  email: string;
  role: CallingUser["role"];
  membershipTier: CallingUser["membershipTier"];
  suspended: boolean;
  subscription: {
    status: SubscriptionStatus;
  } | null;
}): CallingUser {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    membershipTier: input.membershipTier,
    suspended: input.suspended,
    hasActiveSubscription:
      input.role === "ADMIN" ||
      ENTITLED_SUBSCRIPTION_STATUSES.has(input.subscription?.status ?? SubscriptionStatus.INCOMPLETE)
  };
}

function buildRoomIdentifiers(title: string, prefix: string) {
  const unique = randomUUID().slice(0, 8);
  const baseSlug = slugify(title) || prefix;

  return {
    slug: `${baseSlug}-${unique}`,
    livekitRoomName: `bc-${prefix}-${unique}`
  };
}

function normalizeMaxParticipants(input: {
  requestedCap: number | undefined;
  allowedCap: number;
  isAdminOverride: boolean;
}) {
  if (input.isAdminOverride) {
    return Math.min(Math.max(input.requestedCap ?? input.allowedCap, 2), 100);
  }

  return Math.min(Math.max(input.requestedCap ?? input.allowedCap, 2), input.allowedCap);
}

async function getMemberForCalling(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipTier: true,
      suspended: true,
      subscription: {
        select: {
          status: true
        }
      }
    }
  });

  return user ? toCallingUser(user) : null;
}

function getParticipantUserIds(room: Pick<CallRoomDetail, "participants">) {
  return room.participants.map((participant) => participant.userId);
}

export async function getCallRoomById(roomId: string) {
  try {
    return await db.callRoom.findUnique({
      where: {
        id: roomId
      },
      include: callRoomDetailInclude
    });
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("get-call-room-by-id", error);
    return null;
  }
}

export async function syncCallRoomStatus(roomId: string) {
  try {
    const room = await db.callRoom.findUnique({
      where: {
        id: roomId
      },
      select: {
        id: true,
        status: true,
        startsAt: true
      }
    });

    if (!room) {
      return null;
    }

    if (
      room.status === "SCHEDULED" &&
      room.startsAt &&
      room.startsAt.getTime() <= Date.now()
    ) {
      await db.callRoom.update({
        where: {
          id: room.id
        },
        data: {
          status: "LIVE",
          startedAt: new Date()
        }
      });
    }

    return getCallRoomById(roomId);
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("sync-call-room-status", error);
    return null;
  }
}

export async function createOneToOneCallRoom(input: {
  actor: CallingUser;
  targetUserId: string;
}) {
  const directAuth = await canUserStartOneToOneCalls(input.actor);

  if (!directAuth.allowed) {
    throw new Error(directAuth.code ?? "calling-not-allowed");
  }

  if (input.actor.id === input.targetUserId) {
    throw new Error("direct-call-self");
  }

  const targetUser = await getMemberForCalling(input.targetUserId);

  if (!targetUser) {
    throw new Error("target-not-found");
  }

  const targetAuth = await canUserStartOneToOneCalls(targetUser);

  if (!targetAuth.allowed) {
    throw new Error("target-not-eligible");
  }

  const identifiers = buildRoomIdentifiers("private-call", "one-to-one");
  const now = new Date();
  const room = await db.callRoom.create({
    data: {
      type: "ONE_TO_ONE",
      status: "LIVE",
      createdByUserId: input.actor.id,
      hostUserId: input.actor.id,
      title: `Private call with ${targetUser.name ?? targetUser.email}`,
      description: "Private 1 to 1 member call.",
      slug: identifiers.slug,
      livekitRoomName: identifiers.livekitRoomName,
      tierVisibility: "CUSTOM",
      customTierVisibility: [],
      maxParticipants: 2,
      startedAt: now,
      participants: {
        create: [
          {
            userId: input.actor.id,
            role: "HOST",
            presenceState: "INVITED",
            livekitIdentity: buildCallParticipantIdentity(input.actor.id)
          },
          {
            userId: targetUser.id,
            role: "MEMBER",
            presenceState: "INVITED",
            livekitIdentity: buildCallParticipantIdentity(targetUser.id)
          }
        ]
      }
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actor.id,
    targetUserId: input.targetUserId,
    roomId: room.id,
    action: "call-room.created.one-to-one",
    metadata: {
      hostUserId: input.actor.id,
      targetUserId: input.targetUserId
    }
  });

  return getCallRoomById(room.id);
}

async function createGroupCallRoom(input: CreateGroupCallRoomInput) {
  const hostAuth = await canUserHostGroupCalls(input.actor);

  if (!hostAuth.allowed) {
    throw new Error(hostAuth.code ?? "group-call-not-allowed");
  }

  if (input.roomType === "FOUNDER_EVENT" && input.actor.role !== "ADMIN") {
    throw new Error("founder-room-admin-only");
  }

  const customTierVisibility = normalizeTierVisibility(input.customTierVisibility ?? []);

  if (!canHostAudienceScope(hostAuth, input.audienceScope, customTierVisibility)) {
    throw new Error("host-audience-not-allowed");
  }

  if (!hostAuth.isAdminOverride) {
    const activeRoomCount = await db.callRoom.count({
      where: {
        hostUserId: input.actor.id,
        type: {
          not: "ONE_TO_ONE"
        },
        status: {
          in: ["SCHEDULED", "LIVE"]
        }
      }
    });

    if (activeRoomCount >= hostAuth.maxConcurrentRooms) {
      throw new Error("host-room-limit-reached");
    }
  }

  const now = new Date();
  const scheduledStart =
    input.startsAt && input.startsAt.getTime() > now.getTime() ? input.startsAt : null;
  const status = scheduledStart ? "SCHEDULED" : "LIVE";
  const identifiers = buildRoomIdentifiers(input.title, input.roomType.toLowerCase());
  const maxParticipants = normalizeMaxParticipants({
    requestedCap: input.maxParticipants,
    allowedCap: hostAuth.isAdminOverride
      ? hostAuth.maxParticipants
      : Math.max(2, hostAuth.maxParticipants),
    isAdminOverride: hostAuth.isAdminOverride
  });

  const room = await db.callRoom.create({
    data: {
      type: input.roomType,
      status,
      createdByUserId: input.actor.id,
      hostUserId: input.actor.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      slug: identifiers.slug,
      livekitRoomName: identifiers.livekitRoomName,
      tierVisibility: input.audienceScope,
      customTierVisibility,
      maxParticipants,
      hostLevelRequired: hostAuth.isAdminOverride ? null : hostAuth.hostLevel,
      startsAt: scheduledStart ?? now,
      startedAt: scheduledStart ? null : now,
      isRecorded: input.isRecorded ?? false,
      participants: {
        create: {
          userId: input.actor.id,
          role: input.actor.role === "ADMIN" ? "ADMIN" : "HOST",
          presenceState: "INVITED",
          livekitIdentity: buildCallParticipantIdentity(input.actor.id)
        }
      },
      ...(input.startsAt || input.endsAt
        ? {
            schedule: {
              create: {
                title: input.title.trim(),
                description: input.description?.trim() || null,
                hostUserId: input.actor.id,
                startsAt: input.startsAt ?? now,
                endsAt: input.endsAt ?? null,
                tierVisibility: input.audienceScope,
                customTierVisibility
              }
            }
          }
        : {})
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actor.id,
    roomId: room.id,
    action: "call-room.created.group",
    metadata: {
      roomType: input.roomType,
      audienceScope: input.audienceScope,
      customTierVisibility,
      maxParticipants,
      scheduled: Boolean(scheduledStart)
    }
  });

  return getCallRoomById(room.id);
}

export async function createFounderCallRoom(
  input: Omit<CreateGroupCallRoomInput, "roomType">
) {
  return createGroupCallRoom({
    ...input,
    roomType: "FOUNDER_EVENT"
  });
}

export async function createApprovedHostCallRoom(
  input: Omit<CreateGroupCallRoomInput, "roomType">
) {
  return createGroupCallRoom({
    ...input,
    roomType: "APPROVED_HOST_EVENT"
  });
}

export async function recordCallParticipantPresence(input: ParticipantPresenceInput) {
  const now = new Date();
  const room = await db.callRoom.findUnique({
    where: {
      id: input.roomId
    },
    select: {
      id: true,
      hostUserId: true,
      status: true,
      startsAt: true
    }
  });

  if (!room) {
    throw new Error("room-not-found");
  }

  await db.callParticipant.upsert({
    where: {
      roomId_userId: {
        roomId: input.roomId,
        userId: input.userId
      }
    },
    update: {
      role: input.role,
      presenceState: input.state,
      joinedAt: input.state === "JOINED" ? now : undefined,
      leftAt: input.state === "LEFT" ? now : input.state === "JOINED" ? null : undefined,
      livekitIdentity: buildCallParticipantIdentity(input.userId)
    },
    create: {
      roomId: input.roomId,
      userId: input.userId,
      role: input.role ?? (room.hostUserId === input.userId ? "HOST" : "MEMBER"),
      presenceState: input.state,
      joinedAt: input.state === "JOINED" ? now : null,
      leftAt: input.state === "LEFT" ? now : null,
      livekitIdentity: buildCallParticipantIdentity(input.userId)
    }
  });

  if (
    room.status === "SCHEDULED" &&
    room.startsAt &&
    room.startsAt.getTime() <= now.getTime()
  ) {
    await db.callRoom.update({
      where: {
        id: room.id
      },
      data: {
        status: "LIVE",
        startedAt: now
      }
    });
  }
}

export async function getAccessibleCallRoomForUser(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await syncCallRoomStatus(input.roomId);

  if (!room) {
    return null;
  }

  const access = await canUserJoinCallRoom(
    input.actor,
    room,
    getParticipantUserIds(room)
  );

  if (!access.allowed) {
    return null;
  }

  return room;
}

export async function listVisibleCallRoomsForUser(actor: CallingUser) {
  try {
    const rooms = await db.callRoom.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "LIVE"]
        }
      },
      orderBy: [
        {
          startsAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 40,
      include: callRoomDetailInclude
    });

    const visibleRooms = await Promise.all(
      rooms.map(async (room) => {
        const access = await canUserJoinCallRoom(actor, room, getParticipantUserIds(room));
        return access.allowed ? room : null;
      })
    );

    return visibleRooms.filter((room): room is CallRoomDetail => Boolean(room));
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("list-visible-call-rooms-for-user", error);
    return [];
  }
}

export async function listAdminCallRooms() {
  try {
    const rooms = await db.callRoom.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "LIVE"]
        }
      },
      orderBy: [
        {
          status: "asc"
        },
        {
          startsAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      include: callRoomDetailInclude
    });

    const withParticipantCounts = await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        liveParticipantCount: (await listLiveKitParticipants(room.livekitRoomName)).length
      }))
    );

    return withParticipantCounts;
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("list-admin-call-rooms", error);
    return [];
  }
}

export async function endCallRoom(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await getCallRoomById(input.roomId);

  if (!room) {
    throw new Error("room-not-found");
  }

  if (input.actor.role !== "ADMIN" && room.hostUserId !== input.actor.id) {
    throw new Error("room-end-forbidden");
  }

  const endedAt = new Date();

  await db.$transaction([
    db.callRoom.update({
      where: {
        id: room.id
      },
      data: {
        status: "ENDED",
        endedAt
      }
    }),
    db.callParticipant.updateMany({
      where: {
        roomId: room.id,
        leftAt: null
      },
      data: {
        leftAt: endedAt,
        presenceState: "LEFT"
      }
    })
  ]);

  await deleteLiveKitRoom(room.livekitRoomName);
  await recordCallAuditLog({
    actorUserId: input.actor.id,
    roomId: room.id,
    action: "call-room.ended",
    metadata: {
      roomType: room.type
    }
  });

  return getCallRoomById(room.id);
}

export async function cancelCallRoom(input: {
  roomId: string;
  actor: CallingUser;
}) {
  const room = await getCallRoomById(input.roomId);

  if (!room) {
    throw new Error("room-not-found");
  }

  if (input.actor.role !== "ADMIN" && room.hostUserId !== input.actor.id) {
    throw new Error("room-cancel-forbidden");
  }

  await db.callRoom.update({
    where: {
      id: room.id
    },
    data: {
      status: "CANCELLED",
      endedAt: new Date()
    }
  });

  await deleteLiveKitRoom(room.livekitRoomName);
  await recordCallAuditLog({
    actorUserId: input.actor.id,
    roomId: room.id,
    action: "call-room.cancelled",
    metadata: {
      roomType: room.type
    }
  });

  return getCallRoomById(room.id);
}
