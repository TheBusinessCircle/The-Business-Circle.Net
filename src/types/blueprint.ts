import type {
  BlueprintDiscussionMode,
  BlueprintVoteType,
  MembershipTier
} from "@prisma/client";

export type BlueprintVoteCounts = Record<BlueprintVoteType, number>;
export type BlueprintPriorityVoteType = "SUPPORT" | "HIGH_PRIORITY";

export type BlueprintStatusModel = {
  id: string;
  label: string;
  position: number;
  isHidden: boolean;
};

export type BlueprintIntroSectionModel = {
  id: string;
  title: string;
  copy: string;
  position: number;
  isHidden: boolean;
};

export type BlueprintCommentAuthorModel = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  membershipTier: MembershipTier;
  foundingTier: MembershipTier | null;
};

export type BlueprintDiscussionCommentModel = {
  id: string;
  cardId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  viewerHasLiked: boolean;
  author: BlueprintCommentAuthorModel;
  replies: BlueprintDiscussionCommentModel[];
};

export type BlueprintCardModel = {
  id: string;
  sectionId: string;
  title: string;
  shortDescription: string;
  detail: string | null;
  tierRelevance: MembershipTier | null;
  isCurrentFocus: boolean;
  isMemberShaped: boolean;
  discussionMode: BlueprintDiscussionMode;
  position: number;
  isHidden: boolean;
  status: BlueprintStatusModel | null;
  voteCounts: BlueprintVoteCounts;
  viewerPriorityVote: BlueprintPriorityVoteType | null;
  viewerNeedsDiscussionVote: boolean;
  discussionUnlocked: boolean;
  comments: BlueprintDiscussionCommentModel[];
};

export type BlueprintRoadmapSectionModel = {
  id: string;
  title: string;
  copy: string;
  position: number;
  isHidden: boolean;
  cards: BlueprintCardModel[];
};

export type BlueprintPageModel = {
  introSections: BlueprintIntroSectionModel[];
  roadmapSections: BlueprintRoadmapSectionModel[];
  statuses: BlueprintStatusModel[];
  viewerCanVote: boolean;
  viewerCanDiscuss: boolean;
  viewerIsAdmin: boolean;
};

export type BlueprintManagerPayloadStatus = {
  id?: string;
  clientId: string;
  label: string;
  position: number;
  isHidden: boolean;
};

export type BlueprintManagerPayloadIntroSection = {
  id?: string;
  clientId: string;
  title: string;
  copy: string;
  position: number;
  isHidden: boolean;
};

export type BlueprintManagerPayloadCard = {
  id?: string;
  clientId: string;
  title: string;
  shortDescription: string;
  detail: string;
  statusId: string;
  tierRelevance: MembershipTier | "";
  isCurrentFocus: boolean;
  isMemberShaped: boolean;
  discussionMode: BlueprintDiscussionMode;
  position: number;
  isHidden: boolean;
};

export type BlueprintManagerPayloadRoadmapSection = {
  id?: string;
  clientId: string;
  title: string;
  copy: string;
  position: number;
  isHidden: boolean;
  cards: BlueprintManagerPayloadCard[];
};

export type BlueprintManagerPayload = {
  statuses: BlueprintManagerPayloadStatus[];
  introSections: BlueprintManagerPayloadIntroSection[];
  roadmapSections: BlueprintManagerPayloadRoadmapSection[];
};

export type BlueprintManagerModel = BlueprintPageModel & {
  statuses: BlueprintStatusModel[];
};
