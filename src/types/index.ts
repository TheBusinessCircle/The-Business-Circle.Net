import type { MembershipTier, Role } from "@prisma/client";

export type RouteArea = "public" | "auth" | "member" | "admin";

export interface NavigationItem {
  label: string;
  href: string;
  description?: string;
  requiresRole?: Role;
  requiresTier?: MembershipTier;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  url: string;
  supportEmail: string;
  publicNavigation: NavigationItem[];
  memberNavigation: NavigationItem[];
  adminNavigation: NavigationItem[];
  social: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    x?: string;
  };
  seo: {
    titleTemplate: string;
    defaultTitle: string;
  };
}

export interface MembershipPlan {
  tier: MembershipTier;
  name: string;
  slug: string;
  monthlyPrice: number;
  currency: "GBP";
  stripePriceId: string;
  features: string[];
}

export type MembershipPlanMap = Record<MembershipTier, MembershipPlan>;

export interface AuthenticatedUserContext {
  id: string;
  email: string;
  role: Role;
  membershipTier: MembershipTier;
  suspended: boolean;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export * from "@/types/auth/session";
export * from "@/types/admin/metrics";
export * from "@/types/admin/operations";
export * from "@/types/admin/members";
export * from "@/types/admin/products-pricing";
export * from "@/types/resources/resource";
export * from "@/types/events/event";
export * from "@/types/community/chat";
export * from "@/types/community/feed";
export * from "@/types/community/recognition";
export * from "@/types/profile/profile";
export * from "@/types/founder/service";
export * from "@/types/founding/offer";
export * from "@/types/insights";
