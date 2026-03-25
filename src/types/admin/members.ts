import type { MembershipTier, Role, SubscriptionStatus } from "@prisma/client";
import type {
  CommunityRecognitionSummary,
  InviteDashboardModel
} from "@/types/community/recognition";

export type AdminMemberSuspensionFilter = "ANY" | "ACTIVE" | "SUSPENDED";
export type AdminMemberSubscriptionFilter = SubscriptionStatus | "NONE" | "ANY";

export interface AdminMembersQueryInput {
  query: string;
  role: Role | "";
  membershipTier: MembershipTier | "";
  subscriptionStatus: AdminMemberSubscriptionFilter;
  suspension: AdminMemberSuspensionFilter;
  page: number;
  pageSize: number;
}

export interface AdminMemberListItem {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
  subscriptionStatus: SubscriptionStatus | "NONE";
  createdAt: Date;
  suspended: boolean;
  companyName: string | null;
}

export interface AdminMembersListResult {
  items: AdminMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AdminMemberDetails {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
  suspended: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subscriptionStatus: SubscriptionStatus | "NONE";
  companyName: string | null;
  businessIndustry: string | null;
  location: string | null;
  recognition: CommunityRecognitionSummary;
  inviteDashboard: InviteDashboardModel | null;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
    inviteCode: string | null;
    joinedAt: Date;
    subscriptionTier: MembershipTier;
  } | null;
}
