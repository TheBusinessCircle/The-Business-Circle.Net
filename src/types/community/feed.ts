import type { CommunityPostKind, MembershipTier } from "@prisma/client";
import type { CommunityChannelModel, CommunityUserSummaryModel } from "@/types/community/chat";

export interface CommunityFeedChannelModel extends CommunityChannelModel {
  postCount: number;
  lastActivityAt: string | null;
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
