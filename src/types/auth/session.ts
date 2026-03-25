import { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
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

export interface SessionContext {
  user: SessionUser;
}
