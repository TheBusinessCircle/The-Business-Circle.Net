-- CreateEnum
CREATE TYPE "BlueprintSectionType" AS ENUM ('INTRO', 'ROADMAP');

-- CreateEnum
CREATE TYPE "BlueprintVoteType" AS ENUM ('SUPPORT', 'HIGH_PRIORITY', 'NEEDS_DISCUSSION');

-- CreateEnum
CREATE TYPE "BlueprintDiscussionMode" AS ENUM ('AUTO', 'LOCKED', 'UNLOCKED');

-- CreateTable
CREATE TABLE "BlueprintStatus" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "copy" TEXT NOT NULL DEFAULT '',
    "sectionType" "BlueprintSectionType" NOT NULL DEFAULT 'ROADMAP',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintCard" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "statusId" TEXT,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "detail" TEXT,
    "tierRelevance" "MembershipTier",
    "isCurrentFocus" BOOLEAN NOT NULL DEFAULT false,
    "isMemberShaped" BOOLEAN NOT NULL DEFAULT false,
    "discussionMode" "BlueprintDiscussionMode" NOT NULL DEFAULT 'AUTO',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintVote" (
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" "BlueprintVoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintVote_pkey" PRIMARY KEY ("cardId","userId")
);

-- CreateTable
CREATE TABLE "BlueprintDiscussionComment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintDiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintDiscussionLike" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintDiscussionLike_pkey" PRIMARY KEY ("commentId","userId")
);

-- CreateIndex
CREATE INDEX "BlueprintStatus_isHidden_position_idx" ON "BlueprintStatus"("isHidden", "position");

-- CreateIndex
CREATE INDEX "BlueprintStatus_position_idx" ON "BlueprintStatus"("position");

-- CreateIndex
CREATE INDEX "BlueprintSection_sectionType_isHidden_position_idx" ON "BlueprintSection"("sectionType", "isHidden", "position");

-- CreateIndex
CREATE INDEX "BlueprintSection_position_idx" ON "BlueprintSection"("position");

-- CreateIndex
CREATE INDEX "BlueprintCard_sectionId_isHidden_position_idx" ON "BlueprintCard"("sectionId", "isHidden", "position");

-- CreateIndex
CREATE INDEX "BlueprintCard_statusId_idx" ON "BlueprintCard"("statusId");

-- CreateIndex
CREATE INDEX "BlueprintCard_position_idx" ON "BlueprintCard"("position");

-- CreateIndex
CREATE INDEX "BlueprintVote_userId_createdAt_idx" ON "BlueprintVote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BlueprintVote_cardId_voteType_idx" ON "BlueprintVote"("cardId", "voteType");

-- CreateIndex
CREATE INDEX "BlueprintDiscussionComment_cardId_deletedAt_createdAt_idx" ON "BlueprintDiscussionComment"("cardId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "BlueprintDiscussionComment_userId_createdAt_idx" ON "BlueprintDiscussionComment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BlueprintDiscussionComment_parentCommentId_idx" ON "BlueprintDiscussionComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "BlueprintDiscussionComment_deletedAt_idx" ON "BlueprintDiscussionComment"("deletedAt");

-- CreateIndex
CREATE INDEX "BlueprintDiscussionLike_userId_createdAt_idx" ON "BlueprintDiscussionLike"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BlueprintCard" ADD CONSTRAINT "BlueprintCard_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BlueprintSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintCard" ADD CONSTRAINT "BlueprintCard_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "BlueprintStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintVote" ADD CONSTRAINT "BlueprintVote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BlueprintCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintVote" ADD CONSTRAINT "BlueprintVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDiscussionComment" ADD CONSTRAINT "BlueprintDiscussionComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BlueprintCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDiscussionComment" ADD CONSTRAINT "BlueprintDiscussionComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "BlueprintDiscussionComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDiscussionComment" ADD CONSTRAINT "BlueprintDiscussionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDiscussionLike" ADD CONSTRAINT "BlueprintDiscussionLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "BlueprintDiscussionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDiscussionLike" ADD CONSTRAINT "BlueprintDiscussionLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
