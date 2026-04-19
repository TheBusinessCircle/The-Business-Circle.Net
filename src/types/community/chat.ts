import type {
  ChannelAccessLevel,
  MemberRoleTag,
  MembershipTier,
  Role
} from "@prisma/client";
import type { PlatformEventModel } from "@/types/events/event";
import type {
  CommunityBadgeModel,
  CommunityStatusLevel
} from "@/types/community/recognition";

export interface CommunityChannelModel {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  topic?: string | null;
  accessTier: MembershipTier;
  accessLevel: ChannelAccessLevel;
  position: number;
  isPrivate: boolean;
  isPremiumChannel: boolean;
  allowMemberPosts: boolean;
  isAutomatedFeed: boolean;
  isStandaloneDestination: boolean;
}

export interface CommunityUserSummaryModel {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  membershipTier: MembershipTier;
  role: Role;
  memberRoleTag: MemberRoleTag;
  foundingMember: boolean;
  foundingTier: MembershipTier | null;
  primaryBadge: CommunityBadgeModel | null;
  statusLevel: CommunityStatusLevel;
  reputationScore: number;
  referralCount: number;
  industry: string | null;
  focusTags: string[];
}

export interface ChannelMessageModel {
  id: string;
  channelId: string;
  userId: string;
  parentMessageId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  user: CommunityUserSummaryModel;
}

export type CommunityEventModel = PlatformEventModel;
