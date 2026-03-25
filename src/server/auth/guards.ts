import type { MembershipTier } from "@prisma/client";
import type { SessionUser } from "@/types";
import { canTierAccess } from "@/lib/auth/permissions";
import {
  getCurrentUser,
  requireAdminUser as requireAdminGuard,
  requireCurrentUser,
  requireInnerCircleUser,
  requireStandardMemberUser as requireStandardGuard
} from "@/lib/auth/session";

export async function requireSessionUser(): Promise<SessionUser> {
  return requireCurrentUser();
}

export async function requireAdminUser(): Promise<SessionUser> {
  return requireAdminGuard();
}

export async function requireStandardMemberUser(): Promise<SessionUser> {
  return requireStandardGuard();
}

export async function requireInnerCircleMemberUser(): Promise<SessionUser> {
  return requireInnerCircleUser();
}

export async function getOptionalSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export function hasTierAccess(userTier: MembershipTier, requiredTier: MembershipTier): boolean {
  return canTierAccess(userTier, requiredTier);
}

export function isAdmin(role: SessionUser["role"]): boolean {
  return role === "ADMIN";
}
