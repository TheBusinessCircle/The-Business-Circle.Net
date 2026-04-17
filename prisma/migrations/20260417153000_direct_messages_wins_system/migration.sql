CREATE TYPE "DirectMessageRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
CREATE TYPE "DirectMessageType" AS ENUM ('TEXT', 'SYSTEM');
CREATE TYPE "DirectMessageAttachmentKind" AS ENUM ('IMAGE', 'FILE');
CREATE TYPE "DirectMessageReportReason" AS ENUM ('SPAM', 'ABUSE', 'HARASSMENT', 'INAPPROPRIATE_FILE', 'OTHER');
CREATE TYPE "CollaborationStatus" AS ENUM ('EXPLORING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "WinStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'CHANGES_REQUESTED', 'ARCHIVED');
CREATE TYPE "WinCategory" AS ENUM ('REFERRAL', 'PARTNERSHIP', 'SALE', 'SUPPORT', 'BREAKTHROUGH', 'CONNECTION', 'COLLABORATION', 'CLARITY', 'OPPORTUNITY', 'MILESTONE');
CREATE TYPE "WinParticipantRole" AS ENUM ('AUTHOR', 'CREDITED');
CREATE TYPE "WinParticipantStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
CREATE TYPE "ModerationEntityType" AS ENUM ('DIRECT_MESSAGE_THREAD', 'DIRECT_MESSAGE_MESSAGE', 'DIRECT_MESSAGE_ATTACHMENT', 'WIN');
CREATE TYPE "ModerationActionType" AS ENUM ('RESOLVE_REPORT', 'DISMISS_REPORT', 'REMOVE_ATTACHMENT', 'CHANGE_WIN_STATUS', 'FLAG_USER');

CREATE TABLE "DirectMessageRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "originPostId" TEXT,
  "originCommentId" TEXT,
  "introMessage" TEXT,
  "status" "DirectMessageRequestStatus" NOT NULL DEFAULT 'PENDING',
  "threadId" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessageThread" (
  "id" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "sourcePostId" TEXT,
  "sourceCommentId" TEXT,
  "collaborationStatus" "CollaborationStatus" NOT NULL DEFAULT 'EXPLORING',
  "collaborationNotes" TEXT,
  "pinnedSummary" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessageParticipant" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "isMuted" BOOLEAN NOT NULL DEFAULT false,
  "mutedAt" TIMESTAMP(3),
  "lastReadMessageId" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "messageType" "DirectMessageType" NOT NULL DEFAULT 'TEXT',
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "kind" "DirectMessageAttachmentKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessageBlock" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectMessageReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reportedUserId" TEXT,
  "threadId" TEXT,
  "messageId" TEXT,
  "reason" "DirectMessageReportReason" NOT NULL,
  "detail" TEXT,
  "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Win" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "category" "WinCategory" NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "quote" TEXT,
  "status" "WinStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "authorId" TEXT NOT NULL,
  "sourceThreadId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Win_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WinParticipant" (
  "id" TEXT NOT NULL,
  "winId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WinParticipantRole" NOT NULL DEFAULT 'CREDITED',
  "status" "WinParticipantStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WinParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WinAttachment" (
  "id" TEXT NOT NULL,
  "winId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "kind" "DirectMessageAttachmentKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WinAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "entityType" "ModerationEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" "ModerationActionType" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DirectMessageThread_pairKey_key" ON "DirectMessageThread"("pairKey");
CREATE UNIQUE INDEX "DirectMessageParticipant_threadId_userId_key" ON "DirectMessageParticipant"("threadId", "userId");
CREATE UNIQUE INDEX "DirectMessageBlock_blockerId_blockedUserId_key" ON "DirectMessageBlock"("blockerId", "blockedUserId");
CREATE UNIQUE INDEX "Win_slug_key" ON "Win"("slug");
CREATE UNIQUE INDEX "WinParticipant_winId_userId_key" ON "WinParticipant"("winId", "userId");

CREATE INDEX "DirectMessageRequest_requesterId_status_createdAt_idx" ON "DirectMessageRequest"("requesterId", "status", "createdAt");
CREATE INDEX "DirectMessageRequest_recipientId_status_createdAt_idx" ON "DirectMessageRequest"("recipientId", "status", "createdAt");
CREATE INDEX "DirectMessageRequest_originPostId_idx" ON "DirectMessageRequest"("originPostId");
CREATE INDEX "DirectMessageRequest_originCommentId_idx" ON "DirectMessageRequest"("originCommentId");
CREATE INDEX "DirectMessageRequest_threadId_idx" ON "DirectMessageRequest"("threadId");

CREATE INDEX "DirectMessageThread_lastMessageAt_idx" ON "DirectMessageThread"("lastMessageAt");
CREATE INDEX "DirectMessageThread_collaborationStatus_updatedAt_idx" ON "DirectMessageThread"("collaborationStatus", "updatedAt");
CREATE INDEX "DirectMessageThread_sourcePostId_idx" ON "DirectMessageThread"("sourcePostId");
CREATE INDEX "DirectMessageThread_sourceCommentId_idx" ON "DirectMessageThread"("sourceCommentId");

CREATE INDEX "DirectMessageParticipant_userId_isArchived_updatedAt_idx" ON "DirectMessageParticipant"("userId", "isArchived", "updatedAt");
CREATE INDEX "DirectMessageParticipant_threadId_lastReadAt_idx" ON "DirectMessageParticipant"("threadId", "lastReadAt");
CREATE INDEX "DirectMessageParticipant_lastReadMessageId_idx" ON "DirectMessageParticipant"("lastReadMessageId");

CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");
CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "DirectMessage"("senderId", "createdAt");
CREATE INDEX "DirectMessage_deletedAt_idx" ON "DirectMessage"("deletedAt");

CREATE INDEX "DirectMessageAttachment_messageId_createdAt_idx" ON "DirectMessageAttachment"("messageId", "createdAt");
CREATE INDEX "DirectMessageBlock_blockedUserId_createdAt_idx" ON "DirectMessageBlock"("blockedUserId", "createdAt");

CREATE INDEX "DirectMessageReport_reporterId_createdAt_idx" ON "DirectMessageReport"("reporterId", "createdAt");
CREATE INDEX "DirectMessageReport_reportedUserId_createdAt_idx" ON "DirectMessageReport"("reportedUserId", "createdAt");
CREATE INDEX "DirectMessageReport_status_createdAt_idx" ON "DirectMessageReport"("status", "createdAt");
CREATE INDEX "DirectMessageReport_threadId_idx" ON "DirectMessageReport"("threadId");
CREATE INDEX "DirectMessageReport_messageId_idx" ON "DirectMessageReport"("messageId");

CREATE INDEX "Win_status_publishedAt_idx" ON "Win"("status", "publishedAt");
CREATE INDEX "Win_authorId_createdAt_idx" ON "Win"("authorId", "createdAt");
CREATE INDEX "Win_category_publishedAt_idx" ON "Win"("category", "publishedAt");
CREATE INDEX "Win_featured_publishedAt_idx" ON "Win"("featured", "publishedAt");
CREATE INDEX "Win_sourceThreadId_idx" ON "Win"("sourceThreadId");

CREATE INDEX "WinParticipant_userId_status_createdAt_idx" ON "WinParticipant"("userId", "status", "createdAt");
CREATE INDEX "WinAttachment_winId_createdAt_idx" ON "WinAttachment"("winId", "createdAt");
CREATE INDEX "ModerationAuditLog_adminUserId_createdAt_idx" ON "ModerationAuditLog"("adminUserId", "createdAt");
CREATE INDEX "ModerationAuditLog_entityType_createdAt_idx" ON "ModerationAuditLog"("entityType", "createdAt");
CREATE INDEX "ModerationAuditLog_entityId_createdAt_idx" ON "ModerationAuditLog"("entityId", "createdAt");

ALTER TABLE "DirectMessageRequest"
ADD CONSTRAINT "DirectMessageRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageRequest_originPostId_fkey" FOREIGN KEY ("originPostId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageRequest_originCommentId_fkey" FOREIGN KEY ("originCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageRequest_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectMessageThread"
ADD CONSTRAINT "DirectMessageThread_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageThread_sourceCommentId_fkey" FOREIGN KEY ("sourceCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectMessageParticipant"
ADD CONSTRAINT "DirectMessageParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageParticipant_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectMessageAttachment"
ADD CONSTRAINT "DirectMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectMessageBlock"
ADD CONSTRAINT "DirectMessageBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectMessageReport"
ADD CONSTRAINT "DirectMessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectMessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "DirectMessageReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Win"
ADD CONSTRAINT "Win_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Win_sourceThreadId_fkey" FOREIGN KEY ("sourceThreadId") REFERENCES "DirectMessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WinParticipant"
ADD CONSTRAINT "WinParticipant_winId_fkey" FOREIGN KEY ("winId") REFERENCES "Win"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "WinParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WinAttachment"
ADD CONSTRAINT "WinAttachment_winId_fkey" FOREIGN KEY ("winId") REFERENCES "Win"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAuditLog"
ADD CONSTRAINT "ModerationAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
