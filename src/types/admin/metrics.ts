import type { MembershipTier, ResourceStatus, ResourceTier, Role } from "@prisma/client";

export interface AdminMetrics {
  totalUsers: number;
  activeMembers: number;
  foundationMembers: number;
  innerCircleMembers: number;
  coreMembers: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  cancellationsThisMonth: number;
  discountedActiveMembers: number;
  fullPriceActiveMembers: number;
  resourcesCount: number;
  newResourcesThisWeek: number;
  insightsCount: number;
  postsThisWeek: number;
  commentsThisWeek: number;
  likesThisWeek: number;
  activeDiscussionsThisWeek: number;
  contributorsThisWeek: number;
  profileCompletionRate: number;
  incompleteProfiles: number;
  currentMrr: number;
  failedPayments: number;
  totalChannels: number;
  upcomingEvents: number;
}

export interface AdminRecentMember {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
  suspended: boolean;
  createdAt: Date;
}

export interface AdminRecentResource {
  id: string;
  title: string;
  slug: string;
  status: ResourceStatus;
  tier: ResourceTier;
  updatedAt: Date;
}

export interface AdminRecentMessageActivity {
  id: string;
  content: string;
  createdAt: Date;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface AdminUpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  accessTier: MembershipTier;
  hostName: string | null;
}

export interface AdminGrowthMemberSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface AdminInviteLeaderboardEntry {
  user: AdminGrowthMemberSummary | null;
  totalInvites: number;
}

export interface AdminContributorLeaderboardEntry {
  user: AdminGrowthMemberSummary | null;
  score: number;
}

export interface AdminActiveMemberLeaderboardEntry {
  user: AdminGrowthMemberSummary | null;
  messageCount: number;
}

export interface AdminCommunityGrowthSnapshot {
  topInviters: AdminInviteLeaderboardEntry[];
  topContributors: AdminContributorLeaderboardEntry[];
  mostActiveMembers: AdminActiveMemberLeaderboardEntry[];
}

export interface AdminDashboardData {
  metrics: AdminMetrics;
  recentMembers: AdminRecentMember[];
  recentResources: AdminRecentResource[];
  recentCommunityActivity: AdminRecentMessageActivity[];
  upcomingEventItems: AdminUpcomingEvent[];
  communityGrowth: AdminCommunityGrowthSnapshot;
}
