import { SubscriptionStatus, type MembershipTier } from "@prisma/client";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { isAdminRole, userCanAccessTier } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

type ApiAuthOptions = {
  adminOnly?: boolean;
  requiredTier?: MembershipTier;
  allowUnentitled?: boolean;
};

type ApiAuthSuccess = {
  user: SessionUser;
};

type ApiAuthFailure = {
  response: NextResponse;
};

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

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

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

function hasEntitledSubscription(status: SubscriptionStatus | null | undefined) {
  if (!status) {
    return false;
  }

  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

async function refreshUserEntitlement(userId: string) {
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

export async function requireApiUser(options: ApiAuthOptions = {}): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const session = (await auth()) as Session | null;
  const user = toSessionUser(session);

  if (!user) {
    return { response: unauthorized() };
  }

  const fresh = await refreshUserEntitlement(user.id);
  if (!fresh) {
    return { response: unauthorized() };
  }

  if (fresh.suspended) {
    return { response: forbidden("Account suspended") };
  }

  const hasActiveSubscription =
    fresh.role === "ADMIN" ? true : hasEntitledSubscription(fresh.subscription?.status ?? null);

  const resolvedUser: SessionUser = {
    ...user,
    role: fresh.role,
    membershipTier: fresh.membershipTier,
    subscriptionStatus: fresh.subscription?.status ?? null,
    hasActiveSubscription,
    suspended: fresh.suspended
  };

  if (options.adminOnly && !isAdminRole(resolvedUser.role)) {
    return { response: forbidden() };
  }

  if (!options.allowUnentitled && !isAdminRole(resolvedUser.role) && !resolvedUser.hasActiveSubscription) {
    return { response: forbidden("Active membership required") };
  }

  if (options.requiredTier && !userCanAccessTier(resolvedUser, options.requiredTier)) {
    return { response: forbidden() };
  }

  return { user: resolvedUser };
}
