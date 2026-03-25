import type { MembershipTier } from "@prisma/client";

export type CommunityBadgeIcon =
  | "crown"
  | "star"
  | "link"
  | "shield"
  | "medal"
  | "sparkles";

export type CommunityBadgeSource = "system" | "assigned";

export type CommunityStatusLevel =
  | "Member"
  | "Contributor"
  | "Community Builder"
  | "Circle Leader"
  | "Inner Circle"
  | "Core";

export interface CommunityBadgeModel {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: CommunityBadgeIcon;
  priority: number;
  source: CommunityBadgeSource;
  awardedAt: Date | null;
  awardedByAdmin: boolean;
}

export interface CommunityRecognitionSummary {
  score: number;
  statusLevel: CommunityStatusLevel;
  badges: CommunityBadgeModel[];
  primaryBadge: CommunityBadgeModel | null;
  referralCount: number;
  memberReferralCount: number;
  innerCircleReferralCount: number;
}

export interface InviteReferralMemberModel {
  id: string;
  name: string | null;
  email: string;
  subscriptionTier: MembershipTier;
  joinedAt: Date;
}

export interface InviteDashboardModel {
  inviteCode: string;
  inviteLink: string;
  totalReferrals: number;
  memberReferrals: number;
  innerCircleReferrals: number;
  referrals: InviteReferralMemberModel[];
}

export type DirectoryCommunityFilter =
  | "ALL"
  | "INNER_CIRCLE"
  | "FOUNDING_MEMBERS"
  | "TOP_CONTRIBUTORS"
  | "MOST_INVITES"
  | "NEWEST_MEMBERS";
