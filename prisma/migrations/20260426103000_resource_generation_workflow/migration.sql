-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceApprovalStatus') THEN
    CREATE TYPE "ResourceApprovalStatus" AS ENUM (
      'MANUAL',
      'GENERATED',
      'PENDING_APPROVAL',
      'APPROVED',
      'SCHEDULED',
      'PUBLISHED',
      'REJECTED',
      'REGENERATE_REQUESTED'
    );
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceGenerationSource') THEN
    CREATE TYPE "ResourceGenerationSource" AS ENUM (
      'MANUAL',
      'DAILY_AI',
      'ADMIN_AI',
      'IMPORTED'
    );
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResourceImageStatus') THEN
    CREATE TYPE "ResourceImageStatus" AS ENUM (
      'MANUAL',
      'PROMPT_READY',
      'QUEUED',
      'GENERATING',
      'GENERATED',
      'FAILED',
      'SKIPPED',
      'NEEDS_REVIEW'
    );
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyResourceBatchStatus') THEN
    CREATE TYPE "DailyResourceBatchStatus" AS ENUM (
      'DRAFT',
      'GENERATED',
      'PENDING_APPROVAL',
      'PARTIALLY_APPROVED',
      'APPROVED',
      'SCHEDULED',
      'PARTIALLY_PUBLISHED',
      'PUBLISHED',
      'REJECTED'
    );
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyResourceBatch" (
  "id" TEXT NOT NULL,
  "generationDate" DATE NOT NULL,
  "status" "DailyResourceBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyResourceBatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Resource"
ADD COLUMN IF NOT EXISTS "approvalStatus" "ResourceApprovalStatus" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS "generationSource" "ResourceGenerationSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS "generationBatchId" TEXT,
ADD COLUMN IF NOT EXISTS "generationDate" DATE,
ADD COLUMN IF NOT EXISTS "imageDirection" TEXT,
ADD COLUMN IF NOT EXISTS "imagePrompt" TEXT,
ADD COLUMN IF NOT EXISTS "imageStatus" "ResourceImageStatus" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS "generatedImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "generationMetadata" JSONB,
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejectedById" TEXT,
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lockedById" TEXT;

-- Backfill existing manually managed resources.
UPDATE "Resource"
SET
  "approvalStatus" = CASE
    WHEN "status" = 'PUBLISHED' THEN 'PUBLISHED'::"ResourceApprovalStatus"
    WHEN "status" = 'SCHEDULED' THEN 'SCHEDULED'::"ResourceApprovalStatus"
    ELSE COALESCE("approvalStatus", 'MANUAL'::"ResourceApprovalStatus")
  END,
  "imageStatus" = CASE
    WHEN COALESCE("coverImage", '') <> '' THEN 'MANUAL'::"ResourceImageStatus"
    WHEN "mediaType" = 'IMAGE' AND COALESCE("mediaUrl", '') <> '' THEN 'MANUAL'::"ResourceImageStatus"
    ELSE COALESCE("imageStatus", 'MANUAL'::"ResourceImageStatus")
  END
WHERE "generationBatchId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyResourceBatch_generationDate_key" ON "DailyResourceBatch"("generationDate");
CREATE INDEX IF NOT EXISTS "DailyResourceBatch_status_idx" ON "DailyResourceBatch"("status");
CREATE INDEX IF NOT EXISTS "DailyResourceBatch_generatedAt_idx" ON "DailyResourceBatch"("generatedAt");
CREATE INDEX IF NOT EXISTS "DailyResourceBatch_generatedById_idx" ON "DailyResourceBatch"("generatedById");
CREATE INDEX IF NOT EXISTS "DailyResourceBatch_approvedById_idx" ON "DailyResourceBatch"("approvedById");
CREATE INDEX IF NOT EXISTS "Resource_approvalStatus_idx" ON "Resource"("approvalStatus");
CREATE INDEX IF NOT EXISTS "Resource_imageStatus_idx" ON "Resource"("imageStatus");
CREATE INDEX IF NOT EXISTS "Resource_generationBatchId_idx" ON "Resource"("generationBatchId");
CREATE INDEX IF NOT EXISTS "Resource_generationDate_idx" ON "Resource"("generationDate");
CREATE INDEX IF NOT EXISTS "Resource_generationSource_idx" ON "Resource"("generationSource");
CREATE INDEX IF NOT EXISTS "Resource_approvedById_idx" ON "Resource"("approvedById");
CREATE INDEX IF NOT EXISTS "Resource_rejectedById_idx" ON "Resource"("rejectedById");
CREATE INDEX IF NOT EXISTS "Resource_lockedById_idx" ON "Resource"("lockedById");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyResourceBatch_generatedById_fkey'
  ) THEN
    ALTER TABLE "DailyResourceBatch"
    ADD CONSTRAINT "DailyResourceBatch_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyResourceBatch_approvedById_fkey'
  ) THEN
    ALTER TABLE "DailyResourceBatch"
    ADD CONSTRAINT "DailyResourceBatch_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_generationBatchId_fkey'
  ) THEN
    ALTER TABLE "Resource"
    ADD CONSTRAINT "Resource_generationBatchId_fkey"
    FOREIGN KEY ("generationBatchId") REFERENCES "DailyResourceBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_approvedById_fkey'
  ) THEN
    ALTER TABLE "Resource"
    ADD CONSTRAINT "Resource_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_rejectedById_fkey'
  ) THEN
    ALTER TABLE "Resource"
    ADD CONSTRAINT "Resource_rejectedById_fkey"
    FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_lockedById_fkey'
  ) THEN
    ALTER TABLE "Resource"
    ADD CONSTRAINT "Resource_lockedById_fkey"
    FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
