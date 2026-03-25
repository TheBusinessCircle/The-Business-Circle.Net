import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      membershipTier: MembershipTier;
      foundingMember: boolean;
      foundingTier: MembershipTier | null;
      foundingPrice: number | null;
      foundingClaimedAt: Date | null;
      subscriptionStatus: SubscriptionStatus | null;
      hasActiveSubscription: boolean;
      suspended: boolean;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    membershipTier: MembershipTier;
    foundingMember: boolean;
    foundingTier: MembershipTier | null;
    foundingPrice: number | null;
    foundingClaimedAt: Date | null;
    subscriptionStatus: SubscriptionStatus | null;
    hasActiveSubscription: boolean;
    suspended: boolean;
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    membershipTier?: MembershipTier;
    foundingMember?: boolean;
    foundingTier?: MembershipTier | null;
    foundingPrice?: number | null;
    foundingClaimedAt?: string | null;
    subscriptionStatus?: SubscriptionStatus | null;
    hasActiveSubscription?: boolean;
    suspended?: boolean;
    emailVerified?: string | null;
  }
}
