import type { MembershipTier } from "@prisma/client";
import { db } from "@/lib/db";
import type { CallAudienceScope } from "@/lib/calling";
import { normalizeTierVisibility } from "@/lib/calling";
import { recordCallAuditLog } from "@/server/calling/audit";
import { canHostAudienceScope, canUserHostGroupCalls, type CallingUser } from "@/server/calling/permissions";
import {
  cancelCallRoom,
  createApprovedHostCallRoom,
  createFounderCallRoom,
  listVisibleCallRoomsForUser,
  syncCallRoomStatus
} from "@/server/calling/rooms";

type ScheduledRoomInput = {
  actor: CallingUser;
  title: string;
  description?: string | null;
  audienceScope: CallAudienceScope;
  customTierVisibility?: MembershipTier[];
  maxParticipants?: number;
  startsAt: Date;
  endsAt?: Date | null;
  isRecorded?: boolean;
};

export async function createScheduledFounderRoom(input: ScheduledRoomInput) {
  return createFounderCallRoom(input);
}

export async function createScheduledApprovedHostRoom(input: ScheduledRoomInput) {
  return createApprovedHostCallRoom(input);
}

export async function listUpcomingCallSchedulesForUser(actor: CallingUser) {
  const rooms = await listVisibleCallRoomsForUser(actor);

  return rooms.filter((room) => room.startsAt && room.startsAt.getTime() >= Date.now());
}

export async function listUpcomingCallSchedulesForAdmin(limit = 25) {
  return db.callSchedule.findMany({
    where: {
      startsAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000)
      }
    },
    orderBy: {
      startsAt: "asc"
    },
    take: limit,
    include: {
      hostUser: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true
        }
      },
      room: {
        include: {
          hostUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });
}

export async function updateScheduledCallRoom(input: {
  roomId: string;
  actor: CallingUser;
  title: string;
  description?: string | null;
  audienceScope: CallAudienceScope;
  customTierVisibility?: MembershipTier[];
  maxParticipants?: number;
  startsAt: Date;
  endsAt?: Date | null;
  isRecorded?: boolean;
}) {
  const room = await syncCallRoomStatus(input.roomId);

  if (!room) {
    throw new Error("room-not-found");
  }

  if (input.actor.role !== "ADMIN" && room.hostUserId !== input.actor.id) {
    throw new Error("room-update-forbidden");
  }

  const hostAuth = await canUserHostGroupCalls(input.actor);
  const customTierVisibility = normalizeTierVisibility(input.customTierVisibility ?? []);

  if (!hostAuth.isAdminOverride && !canHostAudienceScope(hostAuth, input.audienceScope, customTierVisibility)) {
    throw new Error("host-audience-not-allowed");
  }

  const startsAt = input.startsAt;
  const endsAt = input.endsAt ?? null;
  const maxParticipants = hostAuth.isAdminOverride
    ? Math.min(Math.max(input.maxParticipants ?? room.maxParticipants, 2), 100)
    : Math.min(
        Math.max(input.maxParticipants ?? room.maxParticipants, 2),
        Math.max(2, hostAuth.maxParticipants)
      );
  const nextStatus = startsAt.getTime() > Date.now() ? "SCHEDULED" : "LIVE";

  await db.callRoom.update({
    where: {
      id: room.id
    },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      tierVisibility: input.audienceScope,
      customTierVisibility,
      maxParticipants,
      startsAt,
      status: nextStatus,
      startedAt: nextStatus === "LIVE" ? room.startedAt ?? new Date() : null,
      isRecorded: input.isRecorded ?? false,
      schedule: {
        upsert: {
          update: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            startsAt,
            endsAt,
            tierVisibility: input.audienceScope,
            customTierVisibility
          },
          create: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            hostUserId: room.hostUserId,
            startsAt,
            endsAt,
            tierVisibility: input.audienceScope,
            customTierVisibility
          }
        }
      }
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actor.id,
    roomId: room.id,
    action: "call-room.schedule.updated",
    metadata: {
      audienceScope: input.audienceScope,
      customTierVisibility,
      maxParticipants,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt?.toISOString() ?? null
    }
  });

  return syncCallRoomStatus(room.id);
}

export async function cancelScheduledCallRoom(input: {
  roomId: string;
  actor: CallingUser;
}) {
  return cancelCallRoom(input);
}

export async function syncScheduledRoomStates() {
  const readyRooms = await db.callRoom.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: {
        lte: new Date()
      }
    },
    select: {
      id: true
    }
  });

  await Promise.all(readyRooms.map((room) => syncCallRoomStatus(room.id)));
  return readyRooms.length;
}
