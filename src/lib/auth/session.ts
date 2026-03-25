import "server-only";
import type { MembershipTier } from "@prisma/client";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { canTierAccess, isAdminRole, resolveEffectiveTier, userCanAccessTier } from "@/lib/auth/permissions";

function toSessionUser(session: Session | null): SessionUser | null {
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
    role: session.user.role,
    membershipTier: session.user.membershipTier,
    foundingMember: session.user.foundingMember ?? false,
    foundingTier: session.user.foundingTier ?? null,
    foundingPrice: session.user.foundingPrice ?? null,
    foundingClaimedAt: session.user.foundingClaimedAt ?? null,
    subscriptionStatus: session.user.subscriptionStatus ?? null,
    hasActiveSubscription: session.user.hasActiveSubscription ?? false,
    suspended: session.user.suspended,
    emailVerified: session.user.emailVerified ?? null
  };
}

export async function getCurrentSession() {
  return auth();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return toSessionUser(session);
}

export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.suspended) {
    redirect("/login?error=suspended");
  }

  if (user.role !== "ADMIN" && !user.hasActiveSubscription) {
    redirect("/membership?billing=required");
  }

  return user;
}

export async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireCurrentUser();

  if (!isAdminRole(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireStandardMemberUser(): Promise<SessionUser> {
  const user = await requireCurrentUser();
  const effectiveTier = resolveEffectiveTier(user.role, user.membershipTier);

  if (!canTierAccess(effectiveTier, "FOUNDATION")) {
    redirect("/membership");
  }

  return user;
}

export async function requireInnerCircleUser(): Promise<SessionUser> {
  const user = await requireCurrentUser();

  if (!userCanAccessTier(user, "INNER_CIRCLE")) {
    redirect("/membership?upgrade=inner-circle");
  }

  return user;
}

export function hasRequiredTier(
  user: Pick<SessionUser, "role" | "membershipTier" | "hasActiveSubscription" | "suspended">,
  requiredTier: MembershipTier
): boolean {
  return userCanAccessTier(user, requiredTier);
}

