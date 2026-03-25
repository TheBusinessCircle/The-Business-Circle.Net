import type { MembershipTier } from "@prisma/client";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { isAdminRole, userCanAccessTier } from "@/lib/auth/permissions";

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

export async function requireApiUser(options: ApiAuthOptions = {}): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const session = (await auth()) as Session | null;
  const user = toSessionUser(session);

  if (!user) {
    return { response: unauthorized() };
  }

  if (user.suspended) {
    return { response: forbidden("Account suspended") };
  }

  if (options.adminOnly && !isAdminRole(user.role)) {
    return { response: forbidden() };
  }

  if (!options.allowUnentitled && !isAdminRole(user.role) && !user.hasActiveSubscription) {
    return { response: forbidden("Active membership required") };
  }

  if (options.requiredTier && !userCanAccessTier(user, options.requiredTier)) {
    return { response: forbidden() };
  }

  return { user };
}
