import type { CommunityPostKind, MembershipTier } from "@prisma/client";
import type { CommunityChannelModel, CommunityUserSummaryModel } from "@/types/community/chat";
import type { DirectMessageRelationshipStateModel } from "@/types/messages";

export interface CommunityFeedChannelModel extends CommunityChannelModel {
  postCount: number;
  lastActivityAt: string | null;
}

export interface CommunityReplyThreadMetaModel {
  participantCount: number;
  hasReplyToReplyEvent: boolean;
  maxDepth: number;
  nestedReplyCount: number;
}

export interface CommunityCommentModel {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  viewerHasLiked: boolean;
  user: CommunityUserSummaryModel;
  replyThread: CommunityReplyThreadMetaModel;
  directMessageContext: DirectMessageRelationshipStateModel | null;
  replies: CommunityCommentModel[];
}

export interface CommunityPostSummaryModel {
  id: string;
  channelId: string;
  title: string;
  content: string;
  tags: string[];
  kind: CommunityPostKind;
  promptId: string | null;
  promptTier: MembershipTier | null;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  previewImageUrl: string | null;
  previewImageKind: string | null;
  intelligenceSourceId: string | null;
  intelligenceSourceName: string | null;
  intelligenceCanonicalUrl: string | null;
  intelligenceAuthor: string | null;
  intelligencePublishedAt: string | null;
  intelligencePrimaryCategory: string | null;
  intelligenceSecondaryCategories: string[];
  intelligenceLabel: string | null;
  intelligenceShortSummary: string | null;
  intelligenceKeyDetail: string | null;
  intelligenceWhyThisMatters: string | null;
  intelligenceBusinessOwnerImpact: string | null;
  intelligenceFounderTakeaway: string | null;
  intelligenceWhatToWatchNext: string | null;
  intelligencePossibleRisks: string[];
  intelligencePossibleOpportunities: string[];
  intelligenceAffectedBusinessAreas: string[];
  intelligenceSuggestedDiscussionPrompt: string | null;
  intelligenceRecommendedRoom: string | null;
  intelligenceUrgencyScore: number | null;
  intelligenceRelevanceScore: number | null;
  intelligenceCommercialImpactScore: number | null;
  intelligenceConfidenceScore: number | null;
  intelligenceSourceCredibilityScore: number | null;
  intelligenceBusinessOwnerScore: number | null;
  intelligenceRegion: string | null;
  intelligenceSectorsAffected: string[];
  intelligenceFeatured: boolean;
  intelligenceStatus: string;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  user: CommunityUserSummaryModel;
}

export interface CommunityPostDetailModel extends CommunityPostSummaryModel {
  comments: CommunityCommentModel[];
  channel: CommunityChannelModel;
}

export interface CommunityRecentPostModel extends CommunityPostSummaryModel {
  channel: Pick<CommunityChannelModel, "name" | "slug">;
}

export interface CommunityFeedPageModel {
  channels: CommunityFeedChannelModel[];
  selectedChannel: CommunityFeedChannelModel | null;
  posts: CommunityPostSummaryModel[];
}
