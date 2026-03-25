import { MembershipTier, Role } from "@prisma/client";
import { MEMBERSHIP_PLANS } from "@/config/membership";
import { SITE_CONFIG } from "@/config/site";

export const APP_NAME = SITE_CONFIG.name;

export const STRIPE_PRICE_IDS = {
  FOUNDATION: MEMBERSHIP_PLANS.FOUNDATION.stripePriceId,
  INNER_CIRCLE: MEMBERSHIP_PLANS.INNER_CIRCLE.stripePriceId,
  CORE: MEMBERSHIP_PLANS.CORE.stripePriceId
} as const;

export const TIER_PRICES: Record<MembershipTier, string> = {
  FOUNDATION: `£${MEMBERSHIP_PLANS.FOUNDATION.monthlyPrice}/month`,
  INNER_CIRCLE: `£${MEMBERSHIP_PLANS.INNER_CIRCLE.monthlyPrice}/month`,
  CORE: `£${MEMBERSHIP_PLANS.CORE.monthlyPrice}/month`
};

export const PUBLIC_NAV = SITE_CONFIG.publicNavigation;
export const PLATFORM_NAV = SITE_CONFIG.memberNavigation;
export const ADMIN_NAV = SITE_CONFIG.adminNavigation;

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "Member",
  INNER_CIRCLE: "Inner Circle Member",
  ADMIN: "Admin"
};

export const DASHBOARD_QUICK_LINKS = [
  { href: "/dashboard/resources", label: "Browse Resources" },
  { href: "/community", label: "Open Community" },
  { href: "/events", label: "View Events" },
  { href: "/directory", label: "Find Collaborators" },
  { href: "/profile", label: "Complete Profile" }
] as const;
