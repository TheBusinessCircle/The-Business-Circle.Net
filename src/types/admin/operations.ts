import type { MembershipTier } from "@prisma/client";

export interface AdminRevenueSnapshot {
  currentMrr: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  discountedActiveMembers: number;
  fullPriceActiveMembers: number;
  cancelAtPeriodEnd: number;
  failedPayments: number;
  subscriptionsByTier: Record<MembershipTier, number>;
}

export interface AdminSecurityPasswordResetItem {
  id: string;
  createdAt: Date;
  requestedIp: string | null;
  usedAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface AdminSecuritySnapshot {
  authSecretConfigured: boolean;
  httpsConfigured: boolean;
  billingEnabled: boolean;
  rateLimitBackend: "upstash" | "in-memory";
  suspendedUsers: number;
  unverifiedMembers: number;
  paymentRiskMembers: number;
  passwordResetRequests24h: number;
  recentPasswordResetRequests: AdminSecurityPasswordResetItem[];
  warnings: string[];
}

export interface AdminSystemHealthSnapshot {
  appStatus: "healthy" | "attention";
  databaseStatus: "healthy" | "degraded";
  billingEnabled: boolean;
  rateLimitBackend: "upstash" | "in-memory";
  scheduledResourcesDue: number;
  nextScheduledResourceAt: Date | null;
  lastPublishedResourceAt: Date | null;
  lastCommunityPromptAt: Date | null;
  warnings: string[];
}

export interface AdminLiveActivityItem {
  id: string;
  type:
    | "member-signup"
    | "community-post"
    | "community-comment"
    | "connection-win"
    | "resource"
    | "event"
    | "profile"
    | "billing";
  title: string;
  detail: string;
  href: string | null;
  createdAt: Date;
  tone?: "default" | "attention";
}

export interface AdminLiveSnapshot {
  pulse: {
    signups24h: number;
    posts24h: number;
    comments24h: number;
    wins24h: number;
  };
  system: {
    appStatus: "healthy" | "attention";
    databaseStatus: "healthy" | "degraded";
    warnings: number;
  };
  security: {
    warnings: number;
    suspendedUsers: number;
    paymentRiskMembers: number;
    passwordResetRequests24h: number;
  };
  activity: AdminLiveActivityItem[];
  lastUpdatedAt: Date;
}
