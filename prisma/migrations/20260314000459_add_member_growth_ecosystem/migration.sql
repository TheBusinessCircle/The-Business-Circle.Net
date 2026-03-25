-- CreateEnum
CREATE TYPE "ReputationEventType" AS ENUM ('HELPFUL_POST', 'ANSWER_MARKED_HELPFUL', 'INVITE_MEMBER', 'INVITE_INNER_CIRCLE', 'ADMIN_GRANTED', 'ADMIN_RESET');

-- AlterTable
ALTER TABLE "FoundingOfferSettings" ALTER COLUMN "id" SET DEFAULT 'default';

-- CreateTable
CREATE TABLE "MemberInvite" (
    "id" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteReferral" (
    "id" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "subscriptionTier" "MembershipTier" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "ReputationEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedByAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_inviterUserId_key" ON "MemberInvite"("inviterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_inviteCode_key" ON "MemberInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "MemberInvite_inviteCode_idx" ON "MemberInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "MemberInvite_createdAt_idx" ON "MemberInvite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InviteReferral_referredUserId_key" ON "InviteReferral"("referredUserId");

-- CreateIndex
CREATE INDEX "InviteReferral_inviterUserId_joinedAt_idx" ON "InviteReferral"("inviterUserId", "joinedAt");

-- CreateIndex
CREATE INDEX "InviteReferral_subscriptionTier_joinedAt_idx" ON "InviteReferral"("subscriptionTier", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationScore_userId_key" ON "ReputationScore"("userId");

-- CreateIndex
CREATE INDEX "ReputationEvent_userId_createdAt_idx" ON "ReputationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReputationEvent_eventType_createdAt_idx" ON "ReputationEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE INDEX "Badge_priority_idx" ON "Badge"("priority");

-- CreateIndex
CREATE INDEX "UserBadge_userId_awardedAt_idx" ON "UserBadge"("userId", "awardedAt");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- AddForeignKey
ALTER TABLE "MemberInvite" ADD CONSTRAINT "MemberInvite_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteReferral" ADD CONSTRAINT "InviteReferral_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteReferral" ADD CONSTRAINT "InviteReferral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationScore" ADD CONSTRAINT "ReputationScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
