import type {
  DirectMessageAttachmentKind,
  WinCategory,
  WinParticipantStatus,
  WinStatus
} from "@prisma/client";
import type { DirectMessageMemberSummary } from "@/types/messages";

export interface WinAttachmentModel {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DirectMessageAttachmentKind;
  url: string;
}

export interface WinParticipantModel {
  id: string;
  role: "AUTHOR" | "CREDITED";
  status: WinParticipantStatus;
  respondedAt: string | null;
  user: DirectMessageMemberSummary;
}

export interface WinCardModel {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: WinCategory;
  tags: string[];
  quote: string | null;
  status: WinStatus;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: DirectMessageMemberSummary;
  participants: WinParticipantModel[];
}

export interface WinDetailModel extends WinCardModel {
  sourceThreadId: string | null;
  attachments: WinAttachmentModel[];
}

export interface WinEditorSeedModel {
  id: string | null;
  threadId: string | null;
  title: string;
  summary: string;
  category: WinCategory;
  tags: string[];
  quote: string;
  creditedUserIds: string[];
  participants: WinParticipantModel[];
}

export interface WinAdminStats {
  totalWins: number;
  publishedWins: number;
  pendingApprovalWins: number;
  featuredWins: number;
}
