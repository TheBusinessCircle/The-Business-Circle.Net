import type { MembershipTier } from "@prisma/client";
import { getMembershipTierLabel } from "@/config/membership";
import { canTierAccess } from "@/lib/auth/permissions";

export type CallAudienceScope = "FOUNDATION" | "INNER_CIRCLE" | "CORE" | "CUSTOM";
export type CallRoomType = "ONE_TO_ONE" | "GROUP" | "FOUNDER_EVENT" | "APPROVED_HOST_EVENT";
export type CallRoomStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

export const ALL_CALL_MEMBERSHIP_TIERS: MembershipTier[] = [
  "FOUNDATION",
  "INNER_CIRCLE",
  "CORE"
];

export const CALL_AUDIENCE_SCOPE_VALUES = [
  "FOUNDATION",
  "INNER_CIRCLE",
  "CORE",
  "CUSTOM"
] as const satisfies readonly CallAudienceScope[];

export const CALL_ROOM_TYPE_VALUES = [
  "ONE_TO_ONE",
  "GROUP",
  "FOUNDER_EVENT",
  "APPROVED_HOST_EVENT"
] as const satisfies readonly CallRoomType[];

export const CALL_ROOM_STATUS_VALUES = [
  "SCHEDULED",
  "LIVE",
  "ENDED",
  "CANCELLED"
] as const satisfies readonly CallRoomStatus[];

export const GROUP_HOST_REQUEST_MIN_TIER: MembershipTier = "INNER_CIRCLE";

const HOST_LEVEL_LABELS: Record<number, string> = {
  0: "No group hosting",
  1: "Small host",
  2: "Approved host",
  3: "Trusted host"
};

export function normalizeTierVisibility(tiers: MembershipTier[]): MembershipTier[] {
  return ALL_CALL_MEMBERSHIP_TIERS.filter((tier) => tiers.includes(tier));
}

export function getAudienceBaseTier(scope: Exclude<CallAudienceScope, "CUSTOM">): MembershipTier {
  if (scope === "CORE") {
    return "CORE";
  }

  if (scope === "INNER_CIRCLE") {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

export function resolveAudienceTiers(
  scope: CallAudienceScope,
  customTierVisibility: MembershipTier[] = []
): MembershipTier[] {
  if (scope === "CUSTOM") {
    return normalizeTierVisibility(customTierVisibility);
  }

  return [getAudienceBaseTier(scope)];
}

export function canAccessCallAudience(
  membershipTier: MembershipTier,
  scope: CallAudienceScope,
  customTierVisibility: MembershipTier[] = []
): boolean {
  if (scope === "CUSTOM") {
    return normalizeTierVisibility(customTierVisibility).includes(membershipTier);
  }

  return canTierAccess(membershipTier, getAudienceBaseTier(scope));
}

export function getCallAudienceLabel(
  scope: CallAudienceScope,
  customTierVisibility: MembershipTier[] = []
): string {
  if (scope === "CUSTOM") {
    const tiers = normalizeTierVisibility(customTierVisibility);

    if (!tiers.length) {
      return "Custom audience";
    }

    return `Custom: ${formatTierVisibility(tiers)}`;
  }

  return getMembershipTierLabel(getAudienceBaseTier(scope));
}

export function formatTierVisibility(tiers: MembershipTier[]): string {
  const normalized = normalizeTierVisibility(tiers);

  if (!normalized.length) {
    return "No tiers selected";
  }

  return normalized.map((tier) => getMembershipTierLabel(tier)).join(", ");
}

export function getHostLevelLabel(level: number): string {
  return HOST_LEVEL_LABELS[level] ?? `Host level ${level}`;
}

export function getCallRoomTypeLabel(type: CallRoomType): string {
  if (type === "FOUNDER_EVENT") {
    return "Founder session";
  }

  if (type === "APPROVED_HOST_EVENT") {
    return "Approved host session";
  }

  if (type === "ONE_TO_ONE") {
    return "1 to 1 call";
  }

  return "Group call";
}

export function getCallRoomStatusLabel(status: CallRoomStatus): string {
  if (status === "LIVE") {
    return "Live";
  }

  if (status === "SCHEDULED") {
    return "Scheduled";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return "Ended";
}

export function buildCallParticipantIdentity(userId: string): string {
  return `member:${userId}`;
}
