import type { MembershipTier } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canTierAccess, resolveEffectiveTier } from "@/lib/auth/permissions";
import {
  hasEntitledSubscription,
  membershipAccessBillingQuery
} from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";

async function getFreshUserEntitlement(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
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
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const fresh = await getFreshUserEntitlement(session.user.id);

  if (!fresh) {
    redirect("/login");
  }

  if (fresh.suspended) {
    redirect("/login?error=suspended");
  }

  const hasActiveSubscription =
    fresh.role === "ADMIN" ? true : hasEntitledSubscription(fresh.subscription?.status ?? null);

  session.user.role = fresh.role;
  session.user.membershipTier = fresh.membershipTier;
  session.user.subscriptionStatus = fresh.subscription?.status ?? null;
  session.user.hasActiveSubscription = hasActiveSubscription;
  session.user.suspended = fresh.suspended;

  if (fresh.role !== "ADMIN" && !hasActiveSubscription) {
    redirect(
      `/membership?billing=${membershipAccessBillingQuery(
        fresh.subscription?.status ?? null
      )}`
    );
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
