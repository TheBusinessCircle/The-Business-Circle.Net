import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CallAuditInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  roomId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordCallAuditLog(input: CallAuditInput) {
  return db.callAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      roomId: input.roomId ?? null,
      action: input.action,
      metadata: input.metadata
    }
  });
}

export async function listCallAuditLogs(limit = 50) {
  return db.callAuditLog.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      room: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true
        }
      }
    }
  });
}
