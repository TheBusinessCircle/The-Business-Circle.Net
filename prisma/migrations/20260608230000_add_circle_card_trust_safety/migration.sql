-- CreateEnum
CREATE TYPE "CircleCardReportReason" AS ENUM ('INAPPROPRIATE_CONTENT', 'NUDE_OR_SEXUAL_CONTENT', 'SCAM_OR_FRAUD', 'FAKE_BUSINESS', 'SPAM', 'HARASSMENT', 'IMPERSONATION', 'MALICIOUS_FILE', 'SUSPICIOUS_FILE', 'UNSAFE_FILE', 'OTHER');

-- CreateEnum
CREATE TYPE "CircleCardReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "ModerationEntityType" ADD VALUE 'CIRCLE_CARD_REPORT';

-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE 'SUBMIT_REPORT';
ALTER TYPE "ModerationActionType" ADD VALUE 'REVIEW_REPORT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "communityStandardsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "minimumAgeConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PendingRegistration" ADD COLUMN "communityStandardsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "minimumAgeConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CircleCardReport" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "reportedUserId" TEXT,
    "reporterUserId" TEXT,
    "reason" "CircleCardReportReason" NOT NULL,
    "details" TEXT,
    "status" "CircleCardReportStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "CircleCardReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CircleCardReport_cardId_idx" ON "CircleCardReport"("cardId");

-- CreateIndex
CREATE INDEX "CircleCardReport_reportedUserId_idx" ON "CircleCardReport"("reportedUserId");

-- CreateIndex
CREATE INDEX "CircleCardReport_reporterUserId_idx" ON "CircleCardReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "CircleCardReport_status_idx" ON "CircleCardReport"("status");

-- CreateIndex
CREATE INDEX "CircleCardReport_createdAt_idx" ON "CircleCardReport"("createdAt");

-- AddForeignKey
ALTER TABLE "CircleCardReport" ADD CONSTRAINT "CircleCardReport_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleCardReport" ADD CONSTRAINT "CircleCardReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleCardReport" ADD CONSTRAINT "CircleCardReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleCardReport" ADD CONSTRAINT "CircleCardReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
