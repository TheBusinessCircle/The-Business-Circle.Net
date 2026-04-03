import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isMissingCallingSchemaError,
  logCallingSchemaFallback
} from "@/server/calling/errors";

export type CallAuditInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  roomId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordCallAuditLog(input: CallAuditInput) {
  try {
    return await db.callAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        roomId: input.roomId ?? null,
        action: input.action,
        metadata: input.metadata
      }
    });
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("record-call-audit-log", error);
    return null;
  }
}

export async function listCallAuditLogs(limit = 50) {
  try {
    return await db.callAuditLog.findMany({
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
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("list-call-audit-logs", error);
    return [];
  }
}
