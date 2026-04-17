import type {
  CollaborationStatus,
  DirectMessageAttachmentKind,
  DirectMessageReportReason,
  DirectMessageRequestStatus,
  DirectMessageType,
  MembershipTier,
  MemberRoleTag
} from "@prisma/client";

export interface DirectMessageMemberSummary {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  membershipTier: MembershipTier;
  memberRoleTag: MemberRoleTag;
  foundingTier: MembershipTier | null;
  companyName: string | null;
  headline: string | null;
  bio: string | null;
  collaborationTags: string[];
}

export interface DirectMessageOriginSummary {
  postId: string | null;
  commentId: string | null;
  channelSlug: string | null;
  channelName: string | null;
  postTitle: string | null;
  commentPreview: string | null;
  href: string | null;
}

export interface DirectMessageAttachmentModel {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DirectMessageAttachmentKind;
  url: string;
}

export interface DirectMessageMessageModel {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  messageType: DirectMessageType;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  sender: DirectMessageMemberSummary;
  attachments: DirectMessageAttachmentModel[];
}

export interface DirectMessageThreadSummaryModel {
  id: string;
  otherMember: DirectMessageMemberSummary;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  collaborationStatus: CollaborationStatus;
  hasUnread: boolean;
  origin: DirectMessageOriginSummary | null;
}

export interface DirectMessageRequestModel {
  id: string;
  status: DirectMessageRequestStatus;
  introMessage: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  requester: DirectMessageMemberSummary;
  recipient: DirectMessageMemberSummary;
  origin: DirectMessageOriginSummary | null;
  threadId: string | null;
}

export interface DirectMessageThreadDetailModel {
  id: string;
  collaborationStatus: CollaborationStatus;
  collaborationNotes: string | null;
  pinnedSummary: string | null;
  lastMessageAt: string | null;
  otherMember: DirectMessageMemberSummary;
  messages: DirectMessageMessageModel[];
  origin: DirectMessageOriginSummary | null;
  isArchived: boolean;
  isMuted: boolean;
  isBlockedByViewer: boolean;
  hasBlockedViewer: boolean;
  seenByOtherAt: string | null;
  latestDraftWinId: string | null;
}

export interface DirectMessageNavCounts {
  unreadCount: number;
  pendingRequestCount: number;
  pendingWinCredits: number;
}

export interface DirectMessageModerationReportModel {
  id: string;
  reason: DirectMessageReportReason;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  reporter: DirectMessageMemberSummary;
  reportedUser: DirectMessageMemberSummary | null;
  threadId: string | null;
  messageId: string | null;
  attachmentCount: number;
  messagePreview: string | null;
}

export interface DirectMessageAdminStats {
  requestCount: number;
  threadCount: number;
  activeThreadCount: number;
  pendingReportCount: number;
}
