import type { MembershipTier } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeTierVisibility } from "@/lib/calling";
import { recordCallAuditLog } from "@/server/calling/audit";
import {
  canUserRequestGroupHostAccess,
  type CallingUser
} from "@/server/calling/permissions";

export type CallHostPermissionInput = {
  userId: string;
  actorUserId: string;
  canHostGroupCalls: boolean;
  hostLevel: number;
  maxParticipants: number;
  maxConcurrentRooms: number;
  allowedTierVisibility: MembershipTier[];
  expiresAt?: Date | null;
  isActive?: boolean;
};

function normalizeHostPermissionInput(input: CallHostPermissionInput) {
  const canHostGroupCalls = input.canHostGroupCalls;
  const hostLevel = canHostGroupCalls ? Math.min(Math.max(input.hostLevel, 1), 3) : 0;
  const maxParticipants = canHostGroupCalls ? Math.max(2, input.maxParticipants) : 0;
  const maxConcurrentRooms = canHostGroupCalls ? Math.max(1, input.maxConcurrentRooms) : 0;
  const allowedTierVisibility = normalizeTierVisibility(input.allowedTierVisibility);

  return {
    canHostGroupCalls,
    hostLevel,
    maxParticipants,
    maxConcurrentRooms,
    allowedTierVisibility,
    expiresAt: input.expiresAt ?? null,
    isActive: input.isActive ?? canHostGroupCalls
  };
}

export async function submitGroupHostAccessRequest(input: {
  actor: CallingUser;
  message?: string | null;
}) {
  const requestAccess = await canUserRequestGroupHostAccess(input.actor);

  if (!requestAccess.allowed) {
    throw new Error(requestAccess.code ?? "host-request-not-allowed");
  }

  const existingRequest = await db.groupHostAccessRequest.findFirst({
    where: {
      userId: input.actor.id,
      status: "PENDING"
    },
    select: {
      id: true
    }
  });

  if (existingRequest) {
    throw new Error("host-request-already-pending");
  }

  const request = await db.groupHostAccessRequest.create({
    data: {
      userId: input.actor.id,
      message: input.message?.trim() || null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true
        }
      }
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actor.id,
    targetUserId: input.actor.id,
    action: "call-host-request.submitted",
    metadata: {
      membershipTier: input.actor.membershipTier
    }
  });

  return request;
}

export async function upsertCallHostPermission(input: CallHostPermissionInput) {
  const user = await db.user.findUnique({
    where: {
      id: input.userId
    },
    select: {
      id: true,
      membershipTier: true
    }
  });

  if (!user) {
    throw new Error("user-not-found");
  }

  const normalized = normalizeHostPermissionInput({
    ...input,
    allowedTierVisibility:
      input.allowedTierVisibility.length > 0 ? input.allowedTierVisibility : [user.membershipTier]
  });

  const permission = await db.callHostPermission.upsert({
    where: {
      userId: input.userId
    },
    update: {
      canHostGroupCalls: normalized.canHostGroupCalls,
      hostLevel: normalized.hostLevel,
      maxParticipants: normalized.maxParticipants,
      maxConcurrentRooms: normalized.maxConcurrentRooms,
      allowedTierVisibility: normalized.allowedTierVisibility,
      expiresAt: normalized.expiresAt,
      isActive: normalized.isActive,
      grantedByUserId: input.actorUserId,
      grantedAt: new Date()
    },
    create: {
      userId: input.userId,
      canHostGroupCalls: normalized.canHostGroupCalls,
      hostLevel: normalized.hostLevel,
      maxParticipants: normalized.maxParticipants,
      maxConcurrentRooms: normalized.maxConcurrentRooms,
      allowedTierVisibility: normalized.allowedTierVisibility,
      expiresAt: normalized.expiresAt,
      isActive: normalized.isActive,
      grantedByUserId: input.actorUserId
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: input.userId,
    action: "call-host-permission.updated",
    metadata: {
      canHostGroupCalls: normalized.canHostGroupCalls,
      hostLevel: normalized.hostLevel,
      maxParticipants: normalized.maxParticipants,
      maxConcurrentRooms: normalized.maxConcurrentRooms,
      allowedTierVisibility: normalized.allowedTierVisibility,
      expiresAt: normalized.expiresAt?.toISOString() ?? null,
      isActive: normalized.isActive
    }
  });

  return permission;
}

export async function revokeCallHostPermission(input: {
  userId: string;
  actorUserId: string;
}) {
  const permission = await db.callHostPermission.upsert({
    where: {
      userId: input.userId
    },
    update: {
      canHostGroupCalls: false,
      hostLevel: 0,
      maxParticipants: 0,
      maxConcurrentRooms: 0,
      isActive: false,
      expiresAt: null,
      grantedByUserId: input.actorUserId,
      grantedAt: new Date()
    },
    create: {
      userId: input.userId,
      canHostGroupCalls: false,
      hostLevel: 0,
      maxParticipants: 0,
      maxConcurrentRooms: 0,
      isActive: false,
      grantedByUserId: input.actorUserId
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: input.userId,
    action: "call-host-permission.revoked"
  });

  return permission;
}

export async function approveGroupHostAccessRequest(input: {
  requestId: string;
  actorUserId: string;
  permission: Omit<CallHostPermissionInput, "userId" | "actorUserId">;
  reviewNotes?: string | null;
}) {
  const request = await db.groupHostAccessRequest.findUnique({
    where: {
      id: input.requestId
    },
    select: {
      id: true,
      userId: true,
      status: true
    }
  });

  if (!request) {
    throw new Error("host-request-not-found");
  }

  if (request.status !== "PENDING") {
    throw new Error("host-request-already-reviewed");
  }

  const permission = await upsertCallHostPermission({
    userId: request.userId,
    actorUserId: input.actorUserId,
    ...input.permission
  });

  await db.groupHostAccessRequest.update({
    where: {
      id: request.id
    },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      reviewNotes: input.reviewNotes?.trim() || null
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: request.userId,
    action: "call-host-request.approved",
    metadata: {
      requestId: request.id
    }
  });

  return permission;
}

export async function rejectGroupHostAccessRequest(input: {
  requestId: string;
  actorUserId: string;
  reviewNotes?: string | null;
}) {
  const request = await db.groupHostAccessRequest.findUnique({
    where: {
      id: input.requestId
    },
    select: {
      id: true,
      userId: true,
      status: true
    }
  });

  if (!request) {
    throw new Error("host-request-not-found");
  }

  if (request.status !== "PENDING") {
    throw new Error("host-request-already-reviewed");
  }

  const updatedRequest = await db.groupHostAccessRequest.update({
    where: {
      id: request.id
    },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      reviewNotes: input.reviewNotes?.trim() || null
    }
  });

  await recordCallAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: request.userId,
    action: "call-host-request.rejected",
    metadata: {
      requestId: request.id
    }
  });

  return updatedRequest;
}

export async function listPendingGroupHostAccessRequests() {
  return db.groupHostAccessRequest.findMany({
    where: {
      status: "PENDING"
    },
    orderBy: {
      requestedAt: "asc"
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true
        }
      }
    }
  });
}

export async function listUserGroupHostAccessRequests(userId: string, limit = 5) {
  return db.groupHostAccessRequest.findMany({
    where: {
      userId
    },
    take: limit,
    orderBy: {
      requestedAt: "desc"
    }
  });
}

export async function listRecentGroupHostAccessRequests(limit = 50) {
  return db.groupHostAccessRequest.findMany({
    take: limit,
    orderBy: {
      requestedAt: "desc"
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          membershipTier: true
        }
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

export async function listCallHostPermissions(query?: string) {
  const normalizedQuery = query?.trim() ?? "";

  return db.user.findMany({
    where: {
      OR: [
        {
          callHostPermission: {
            isNot: null
          }
        },
        {
          role: "ADMIN"
        },
        normalizedQuery
          ? {
              OR: [
                {
                  name: {
                    contains: normalizedQuery,
                    mode: "insensitive"
                  }
                },
                {
                  email: {
                    contains: normalizedQuery,
                    mode: "insensitive"
                  }
                }
              ]
            }
          : {
              subscription: {
                is: {
                  status: {
                    in: ["ACTIVE", "TRIALING"]
                  }
                }
              }
            }
      ]
    },
    take: 50,
    orderBy: [
      {
        role: "desc"
      },
      {
        membershipTier: "desc"
      },
      {
        createdAt: "desc"
      }
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipTier: true,
      callHostPermission: true
    }
  });
}
