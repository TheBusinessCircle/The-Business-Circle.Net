import type {
  CallHostPermission,
  CallRoom,
  MembershipTier,
  RealtimeSystemConfig,
  Role
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  ALL_CALL_MEMBERSHIP_TIERS,
  GROUP_HOST_REQUEST_MIN_TIER,
  canAccessCallAudience,
  normalizeTierVisibility
} from "@/lib/calling";
import { canTierAccess, resolveEffectiveTier } from "@/lib/auth/permissions";
import { ensureRealtimeSystemConfig, isCallingSystemEnabled } from "@/server/calling/config";
import {
  isMissingCallingSchemaError,
  logCallingSchemaFallback
} from "@/server/calling/errors";

export type CallingUser = {
  id: string;
  role: Role;
  membershipTier: MembershipTier;
  hasActiveSubscription: boolean;
  suspended: boolean;
  name?: string | null;
  email?: string | null;
};

export type CallingContext = {
  config: RealtimeSystemConfig;
  effectiveTier: MembershipTier;
  hostPermission: CallHostPermission | null;
};

export type CallingDecision = CallingContext & {
  allowed: boolean;
  code?: string;
  message?: string;
};

export type GroupHostDecision = CallingDecision & {
  isAdminOverride: boolean;
  hostLevel: number;
  maxParticipants: number;
  maxConcurrentRooms: number;
  allowedTierVisibility: MembershipTier[];
};

type JoinableCallRoom = Pick<
  CallRoom,
  "id" | "type" | "status" | "hostUserId" | "tierVisibility" | "customTierVisibility"
>;

function createDecision(
  context: CallingContext,
  allowed: boolean,
  code?: string,
  message?: string
): CallingDecision {
  return {
    ...context,
    allowed,
    code,
    message
  };
}

export function isCallHostPermissionActive(permission: CallHostPermission | null) {
  if (!permission) {
    return false;
  }

  if (!permission.isActive || !permission.canHostGroupCalls || permission.hostLevel <= 0) {
    return false;
  }

  if (permission.expiresAt && permission.expiresAt.getTime() <= Date.now()) {
    return false;
  }

  return true;
}

function getAllowedHostAudience(
  effectiveTier: MembershipTier,
  permission: CallHostPermission | null,
  isAdminOverride: boolean
) {
  if (isAdminOverride) {
    return ALL_CALL_MEMBERSHIP_TIERS;
  }

  if (!permission) {
    return [];
  }

  const allowed = normalizeTierVisibility(permission.allowedTierVisibility);
  return allowed.length ? allowed : [effectiveTier];
}

async function getCallHostPermission(userId: string) {
  try {
    return await db.callHostPermission.findUnique({
      where: {
        userId
      }
    });
  } catch (error) {
    if (!isMissingCallingSchemaError(error)) {
      throw error;
    }

    logCallingSchemaFallback("call-host-permission", error);
    return null;
  }
}

export async function getCallingContext(user: CallingUser): Promise<CallingContext> {
  const [config, hostPermission] = await Promise.all([
    ensureRealtimeSystemConfig(),
    getCallHostPermission(user.id)
  ]);

  return {
    config,
    effectiveTier: resolveEffectiveTier(user.role, user.membershipTier),
    hostPermission
  };
}

function checkBaseCallAvailability(user: CallingUser, context: CallingContext): CallingDecision {
  if (!isCallingSystemEnabled(context.config)) {
    const code = context.config.emergencyShutdownEnabled ? "calling-emergency-disabled" : "calling-disabled";

    return createDecision(
      context,
      false,
      code,
      context.config.emergencyShutdownEnabled
        ? "Calling is temporarily disabled across the platform."
        : "Calling is not enabled right now."
    );
  }

  if (user.suspended) {
    return createDecision(context, false, "user-suspended", "Suspended users cannot access calling.");
  }

  if (user.role !== "ADMIN" && !user.hasActiveSubscription) {
    return createDecision(
      context,
      false,
      "billing-required",
      "An active membership subscription is required to access calling."
    );
  }

  return createDecision(context, true);
}

export async function canUserStartOneToOneCalls(user: CallingUser) {
  const context = await getCallingContext(user);
  return checkBaseCallAvailability(user, context);
}

export async function canUserRequestGroupHostAccess(user: CallingUser) {
  const context = await getCallingContext(user);
  const baseDecision = checkBaseCallAvailability(user, context);

  if (!baseDecision.allowed) {
    return baseDecision;
  }

  if (!canTierAccess(context.effectiveTier, GROUP_HOST_REQUEST_MIN_TIER)) {
    return createDecision(
      context,
      false,
      "tier-not-eligible",
      "Group host requests are currently limited to Inner Circle and Core members."
    );
  }

  return createDecision(context, true);
}

export async function canUserHostGroupCalls(user: CallingUser): Promise<GroupHostDecision> {
  const context = await getCallingContext(user);
  const baseDecision = checkBaseCallAvailability(user, context);
  const isAdminOverride = user.role === "ADMIN";
  const activePermission = context.hostPermission;

  if (!baseDecision.allowed) {
    return {
      ...baseDecision,
      isAdminOverride,
      hostLevel: 0,
      maxParticipants: 0,
      maxConcurrentRooms: 0,
      allowedTierVisibility: []
    };
  }

  if (isAdminOverride) {
    return {
      ...createDecision(context, true),
      isAdminOverride: true,
      hostLevel: 99,
      maxParticipants: Math.max(2, context.config.founderRoomDefaultCap),
      maxConcurrentRooms: 10,
      allowedTierVisibility: ALL_CALL_MEMBERSHIP_TIERS
    };
  }

  if (!context.config.memberHostedGroupCallsEnabled) {
    return {
      ...createDecision(
        context,
        false,
        "member-hosting-disabled",
        "Member-hosted group calls are currently turned off."
      ),
      isAdminOverride: false,
      hostLevel: 0,
      maxParticipants: 0,
      maxConcurrentRooms: 0,
      allowedTierVisibility: []
    };
  }

  if (!isCallHostPermissionActive(activePermission)) {
    return {
      ...createDecision(
        context,
        false,
        "host-permission-required",
        "This account does not currently have group hosting permission."
      ),
      isAdminOverride: false,
      hostLevel: activePermission?.hostLevel ?? 0,
      maxParticipants: 0,
      maxConcurrentRooms: 0,
      allowedTierVisibility: []
    };
  }

  const allowedTierVisibility = getAllowedHostAudience(
    context.effectiveTier,
    activePermission,
    false
  );
  const permission = activePermission as CallHostPermission;

  return {
    ...createDecision(context, true),
    isAdminOverride: false,
    hostLevel: permission.hostLevel,
    maxParticipants: Math.max(2, permission.maxParticipants || context.config.defaultHostParticipantCap),
    maxConcurrentRooms: Math.max(1, permission.maxConcurrentRooms || 1),
    allowedTierVisibility
  };
}

export function canHostAudienceScope(
  auth: Pick<GroupHostDecision, "allowed" | "isAdminOverride" | "allowedTierVisibility">,
  audienceScope: JoinableCallRoom["tierVisibility"],
  customTierVisibility: MembershipTier[] = []
) {
  if (!auth.allowed) {
    return false;
  }

  if (auth.isAdminOverride) {
    return true;
  }

  if (audienceScope === "CUSTOM") {
    const requestedTiers = normalizeTierVisibility(customTierVisibility);
    return requestedTiers.length > 0 && requestedTiers.every((tier) => auth.allowedTierVisibility.includes(tier));
  }

  return auth.allowedTierVisibility.includes(audienceScope);
}

export async function canUserJoinCallRoom(
  user: CallingUser,
  room: JoinableCallRoom,
  participantUserIds: string[] = []
) {
  const context = await getCallingContext(user);
  const baseDecision = checkBaseCallAvailability(user, context);

  if (!baseDecision.allowed) {
    return baseDecision;
  }

  if (room.status === "ENDED" || room.status === "CANCELLED") {
    return createDecision(context, false, "room-closed", "This room is no longer available.");
  }

  if (user.role === "ADMIN" || room.hostUserId === user.id) {
    return createDecision(context, true);
  }

  if (room.type === "ONE_TO_ONE") {
    return participantUserIds.includes(user.id)
      ? createDecision(context, true)
      : createDecision(
          context,
          false,
          "room-private",
          "This private room is only available to invited participants."
        );
  }

  return canAccessCallAudience(context.effectiveTier, room.tierVisibility, room.customTierVisibility)
    ? createDecision(context, true)
    : createDecision(
        context,
        false,
        "tier-restricted",
        "Your membership tier is not eligible for this room."
      );
}
