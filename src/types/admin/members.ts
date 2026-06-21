import type {
  BillingInterval,
  MembershipTier,
  PendingRegistrationStatus,
  Role,
  SubscriptionBillingVariant,
  SubscriptionStatus
} from "@prisma/client";
import type { AdminMemberCircleCardPlan } from "@/lib/admin/member-access";
import type { CircleCardPlanKey } from "@/lib/circle-card/plans";
import type { CircleCardEntitlementSource } from "@/lib/circle-card/permissions";
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
  circleCardPlan: AdminMemberCircleCardPlan;
  circleCardEntitlementPlan: CircleCardPlanKey;
  circleCardEntitlementSource: CircleCardEntitlementSource;
  bcnMembershipTier: MembershipTier | null;
  hasBcnMembershipAccess: boolean;
  isAdmin: boolean;
  foundingTier: MembershipTier | null;
  subscriptionStatus: SubscriptionStatus | "NONE";
  subscriptionBillingInterval: BillingInterval | null;
  subscriptionBillingVariant: SubscriptionBillingVariant | null;
  createdAt: Date;
  suspended: boolean;
  companyName: string | null;
  verificationEmailLastSentAt: Date | null;
  verificationEmailSendCount: number;
  emailVerifiedAt: Date | null;
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
  circleCardPlan: AdminMemberCircleCardPlan;
  circleCardEntitlementPlan: CircleCardPlanKey;
  circleCardEntitlementSource: CircleCardEntitlementSource;
  bcnMembershipTier: MembershipTier | null;
  hasBcnMembershipAccess: boolean;
  isAdmin: boolean;
  foundingTier: MembershipTier | null;
  suspended: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subscriptionStatus: SubscriptionStatus | "NONE";
  subscriptionBillingInterval: BillingInterval | null;
  subscriptionBillingVariant: SubscriptionBillingVariant | null;
  subscriptionCurrentPeriodEnd: Date | null;
  subscriptionCancelAtPeriodEnd: boolean;
  companyName: string | null;
  businessIndustry: string | null;
  location: string | null;
  verificationEmailLastSentAt: Date | null;
  verificationEmailSendCount: number;
  emailVerifiedAt: Date | null;
  acceptedTermsAt: Date | null;
  acceptedRulesAt: Date | null;
  acceptedTermsVersion: string | null;
  acceptedRulesVersion: string | null;
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

export interface AdminPendingRegistrationItem {
  id: string;
  email: string;
  fullName: string;
  selectedTier: MembershipTier;
  billingInterval: "monthly" | "annual";
  status: PendingRegistrationStatus;
  createdAt: Date;
  expiresAt: Date;
  completedUserId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface AdminPendingRegistrationsOverview {
  summary: Record<PendingRegistrationStatus, number>;
  items: AdminPendingRegistrationItem[];
}
