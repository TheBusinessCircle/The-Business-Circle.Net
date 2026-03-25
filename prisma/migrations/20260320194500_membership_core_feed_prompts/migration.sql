DO $$
BEGIN
  CREATE TYPE "BusinessStatus" AS ENUM ('IDEA_STARTUP', 'REGISTERED_BUSINESS', 'ESTABLISHED_COMPANY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FounderServiceIntakeMode" AS ENUM ('CHECKOUT', 'APPLICATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommunityPostKind" AS ENUM ('MEMBER_POST', 'FOUNDER_POST', 'AUTO_PROMPT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommunityPromptEventStatus" AS ENUM ('PUBLISHED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommunityPromptTriggerSource" AS ENUM ('OPPORTUNISTIC', 'ADMIN_MANUAL', 'CRON');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'MembershipTier'
      AND e.enumlabel = 'STANDARD'
  ) THEN
    ALTER TYPE "MembershipTier" RENAME VALUE 'STANDARD' TO 'FOUNDATION';
  END IF;
END $$;

ALTER TYPE "MembershipTier" ADD VALUE IF NOT EXISTS 'CORE';

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "status" "BusinessStatus",
  ADD COLUMN IF NOT EXISTS "companyNumber" TEXT;

CREATE INDEX IF NOT EXISTS "Business_status_idx" ON "Business"("status");

ALTER TABLE "Channel"
  ADD COLUMN IF NOT EXISTS "allowAutomatedPrompts" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FounderService"
  ADD COLUMN IF NOT EXISTS "intakeMode" "FounderServiceIntakeMode" NOT NULL DEFAULT 'CHECKOUT';

ALTER TABLE "FoundingOfferSettings"
  ADD COLUMN IF NOT EXISTS "foundationLimit" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "coreLimit" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "foundationClaimed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "coreClaimed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "foundationFoundingPrice" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "coreFoundingPrice" INTEGER NOT NULL DEFAULT 80;

UPDATE "FoundingOfferSettings"
SET
  "foundationLimit" = COALESCE("memberLimit", "foundationLimit", 50),
  "foundationClaimed" = COALESCE("memberClaimed", "foundationClaimed", 0),
  "foundationFoundingPrice" = COALESCE("memberFoundingPrice", "foundationFoundingPrice", 15),
  "innerCircleFoundingPrice" = CASE
    WHEN "innerCircleFoundingPrice" = 39 THEN 40
    ELSE "innerCircleFoundingPrice"
  END
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'FoundingOfferSettings'
    AND column_name = 'memberLimit'
);

ALTER TABLE "FoundingOfferSettings"
  ALTER COLUMN "innerCircleFoundingPrice" SET DEFAULT 40;

ALTER TABLE "FoundingOfferSettings"
  DROP COLUMN IF EXISTS "memberLimit",
  DROP COLUMN IF EXISTS "memberClaimed",
  DROP COLUMN IF EXISTS "memberFoundingPrice";

CREATE TABLE "CommunityPost" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "kind" "CommunityPostKind" NOT NULL DEFAULT 'MEMBER_POST',
  "promptId" TEXT,
  "promptTier" "MembershipTier",
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityComment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentCommentId" TEXT,
  "content" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityPostLike" (
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("postId", "userId")
);

CREATE TABLE "CommunityPromptEvent" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "postId" TEXT,
  "actorUserId" TEXT,
  "promptId" TEXT NOT NULL,
  "promptTier" "MembershipTier" NOT NULL,
  "status" "CommunityPromptEventStatus" NOT NULL DEFAULT 'PUBLISHED',
  "triggerSource" "CommunityPromptTriggerSource" NOT NULL DEFAULT 'OPPORTUNISTIC',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunityPromptEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPost_channelId_createdAt_idx" ON "CommunityPost"("channelId", "createdAt");
CREATE INDEX "CommunityPost_userId_createdAt_idx" ON "CommunityPost"("userId", "createdAt");
CREATE INDEX "CommunityPost_kind_createdAt_idx" ON "CommunityPost"("kind", "createdAt");
CREATE INDEX "CommunityPost_deletedAt_idx" ON "CommunityPost"("deletedAt");

CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");
CREATE INDEX "CommunityComment_userId_createdAt_idx" ON "CommunityComment"("userId", "createdAt");
CREATE INDEX "CommunityComment_parentCommentId_idx" ON "CommunityComment"("parentCommentId");
CREATE INDEX "CommunityComment_deletedAt_idx" ON "CommunityComment"("deletedAt");

CREATE INDEX "CommunityPostLike_userId_createdAt_idx" ON "CommunityPostLike"("userId", "createdAt");

CREATE INDEX "CommunityPromptEvent_channelId_createdAt_idx" ON "CommunityPromptEvent"("channelId", "createdAt");
CREATE INDEX "CommunityPromptEvent_postId_idx" ON "CommunityPromptEvent"("postId");
CREATE INDEX "CommunityPromptEvent_promptId_createdAt_idx" ON "CommunityPromptEvent"("promptId", "createdAt");
CREATE INDEX "CommunityPromptEvent_status_createdAt_idx" ON "CommunityPromptEvent"("status", "createdAt");
CREATE INDEX "CommunityPromptEvent_createdAt_idx" ON "CommunityPromptEvent"("createdAt");

ALTER TABLE "CommunityPost"
  ADD CONSTRAINT "CommunityPost_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPost"
  ADD CONSTRAINT "CommunityPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment"
  ADD CONSTRAINT "CommunityComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment"
  ADD CONSTRAINT "CommunityComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment"
  ADD CONSTRAINT "CommunityComment_parentCommentId_fkey"
  FOREIGN KEY ("parentCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityPostLike"
  ADD CONSTRAINT "CommunityPostLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPostLike"
  ADD CONSTRAINT "CommunityPostLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPromptEvent"
  ADD CONSTRAINT "CommunityPromptEvent_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityPromptEvent"
  ADD CONSTRAINT "CommunityPromptEvent_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityPromptEvent"
  ADD CONSTRAINT "CommunityPromptEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
