import { PrismaAdapter } from "@auth/prisma-adapter";
import { SubscriptionStatus, type MembershipTier, type Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";
import { buildAuthProviders } from "@/lib/auth/providers";
import { normalizeEmail } from "@/lib/auth/utils";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (process.env.NODE_ENV === "production" && !authSecret) {
  throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) must be set in production.");
}

function hasEntitledSubscription(status: SubscriptionStatus | null | undefined) {
  if (!status) {
    return false;
  }

  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS
  },
  secret: authSecret,
  trustHost: true,
  pages: {
    signIn: "/login"
  },
  providers: buildAuthProviders(),
  callbacks: {
    async signIn({ user, account }) {
      const dbUser = user.id
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: { suspended: true }
          })
        : user.email
          ? await prisma.user.findUnique({
              where: { email: normalizeEmail(user.email) },
              select: { suspended: true }
            })
          : null;

      if (!dbUser) {
        return account?.provider ? account.provider !== "credentials" : false;
      }

      return !dbUser.suspended;
    },
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          membershipTier: true,
          foundingMember: true,
          foundingTier: true,
          foundingPrice: true,
          foundingClaimedAt: true,
          emailVerified: true,
          suspended: true,
          subscription: {
            select: {
              status: true
            }
          }
        }
      });

      const fallbackSubscriptionStatus =
        (user as { subscriptionStatus?: SubscriptionStatus | null } | undefined)?.subscriptionStatus ??
        token.subscriptionStatus ??
        null;
      const subscriptionStatus = dbUser?.subscription?.status ?? fallbackSubscriptionStatus ?? null;
      const resolvedRole = (dbUser?.role ??
        (user as { role?: Role } | undefined)?.role ??
        token.role ??
        "MEMBER") as Role;
      const resolvedMembershipTier = (dbUser?.membershipTier ??
        (user as { membershipTier?: MembershipTier } | undefined)?.membershipTier ??
        token.membershipTier ??
        "FOUNDATION") as MembershipTier;
      const resolvedFoundingMember =
        dbUser?.foundingMember ??
        (user as { foundingMember?: boolean } | undefined)?.foundingMember ??
        token.foundingMember ??
        false;
      const resolvedFoundingTier =
        dbUser?.foundingTier ??
        (user as { foundingTier?: MembershipTier | null } | undefined)?.foundingTier ??
        token.foundingTier ??
        null;
      const resolvedFoundingPrice =
        dbUser?.foundingPrice ??
        (user as { foundingPrice?: number | null } | undefined)?.foundingPrice ??
        token.foundingPrice ??
        null;
      const fallbackFoundingClaimedAt = (
        user as { foundingClaimedAt?: Date | string | null } | undefined
      )?.foundingClaimedAt;
      const normalizedFallbackFoundingClaimedAt =
        fallbackFoundingClaimedAt instanceof Date
          ? fallbackFoundingClaimedAt.toISOString()
          : typeof fallbackFoundingClaimedAt === "string"
            ? fallbackFoundingClaimedAt
            : null;
      const resolvedFoundingClaimedAt =
        dbUser?.foundingClaimedAt?.toISOString() ??
        normalizedFallbackFoundingClaimedAt ??
        token.foundingClaimedAt ??
        null;
      const resolvedSuspended =
        dbUser?.suspended ??
        (user as { suspended?: boolean } | undefined)?.suspended ??
        token.suspended ??
        false;
      const fallbackEmailVerified = (user as { emailVerified?: Date | string | null } | undefined)
        ?.emailVerified;
      const normalizedFallbackEmailVerified =
        fallbackEmailVerified instanceof Date
          ? fallbackEmailVerified.toISOString()
          : typeof fallbackEmailVerified === "string"
            ? fallbackEmailVerified
            : null;
      const resolvedEmailVerified =
        dbUser?.emailVerified?.toISOString() ??
        normalizedFallbackEmailVerified ??
        token.emailVerified ??
        null;
      const hasActiveSubscription =
        resolvedRole === "ADMIN"
          ? true
          : hasEntitledSubscription(subscriptionStatus);

      token.id = userId;
      token.sub = userId;
      token.role = resolvedRole;
      token.membershipTier = resolvedMembershipTier;
      token.foundingMember = resolvedFoundingMember;
      token.foundingTier = resolvedFoundingTier;
      token.foundingPrice = resolvedFoundingPrice;
      token.foundingClaimedAt = resolvedFoundingClaimedAt;
      token.subscriptionStatus = subscriptionStatus;
      token.hasActiveSubscription = hasActiveSubscription;
      token.suspended = resolvedSuspended;
      token.emailVerified = resolvedEmailVerified;

      return token;
    },
    async session({ session, token }) {
      const userId = token.id ?? token.sub;
      if (!session.user || !userId) {
        return session;
      }

      session.user.id = userId;
      session.user.role = (token.role ?? "MEMBER") as Role;
      session.user.membershipTier = (token.membershipTier ?? "FOUNDATION") as MembershipTier;
      session.user.foundingMember = token.foundingMember ?? false;
      session.user.foundingTier = (token.foundingTier ?? null) as MembershipTier | null;
      session.user.foundingPrice = token.foundingPrice ?? null;
      session.user.foundingClaimedAt = token.foundingClaimedAt
        ? new Date(token.foundingClaimedAt)
        : null;
      session.user.subscriptionStatus = token.subscriptionStatus ?? null;
      session.user.hasActiveSubscription = token.hasActiveSubscription ?? false;
      session.user.suspended = token.suspended ?? false;
      session.user.emailVerified = token.emailVerified ? new Date(token.emailVerified) : null;

      return session;
    }
  }
} satisfies NextAuthConfig;

