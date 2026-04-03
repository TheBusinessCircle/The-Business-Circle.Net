import type { CallingUser } from "@/server/calling/permissions";

type CallingSessionUserInput = Pick<
  CallingUser,
  "id" | "role" | "membershipTier" | "hasActiveSubscription" | "suspended" | "name" | "email"
>;

export function toCallingUser(user: CallingSessionUserInput): CallingUser {
  return {
    id: user.id,
    role: user.role,
    membershipTier: user.membershipTier,
    hasActiveSubscription: user.hasActiveSubscription,
    suspended: user.suspended,
    name: user.name,
    email: user.email || null
  };
}
