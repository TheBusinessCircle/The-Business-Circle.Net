import type { MembershipTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canTierAccess, resolveEffectiveTier } from "@/lib/auth/permissions";

export async function requireUser() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.suspended) {
    redirect("/login?error=suspended");
  }

  if (session.user.role !== "ADMIN" && !session.user.hasActiveSubscription) {
    redirect("/membership?billing=required");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireUser();

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}

export async function requireStandardMember() {
  const session = await requireUser();
  const effectiveTier = resolveEffectiveTier(session.user.role, session.user.membershipTier);

  if (!canTierAccess(effectiveTier, "FOUNDATION")) {
    redirect("/membership");
  }

  return session;
}

export async function requireInnerCircle() {
  const session = await requireUser();
  const effectiveTier = resolveEffectiveTier(session.user.role, session.user.membershipTier);

  if (!canTierAccess(effectiveTier, "INNER_CIRCLE")) {
    redirect("/membership?upgrade=inner-circle");
  }

  return session;
}

export function ensureTier(userTier: MembershipTier, requiredTier: MembershipTier) {
  return canTierAccess(userTier, requiredTier);
}

