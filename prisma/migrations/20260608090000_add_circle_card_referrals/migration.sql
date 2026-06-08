CREATE TYPE "CircleCardReferralStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WON', 'LOST', 'CANCELLED');

CREATE TYPE "CircleCardReferralVisibility" AS ENUM ('PRIVATE', 'PUBLIC_SUCCESS');

ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_CREATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_ACCEPTED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_DECLINED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_WON';
ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_LOST';
ALTER TYPE "CircleCardEventType" ADD VALUE 'REFERRAL_CANCELLED';

CREATE TABLE "CircleCardReferral" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referrerCardId" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "recipientCardId" TEXT,
  "referredContactName" VARCHAR(140) NOT NULL,
  "referredContactBusiness" VARCHAR(140),
  "referredContactEmail" VARCHAR(320),
  "referredContactPhone" VARCHAR(48),
  "referredContactWebsite" VARCHAR(2048),
  "reason" VARCHAR(800) NOT NULL,
  "status" "CircleCardReferralStatus" NOT NULL DEFAULT 'SENT',
  "estimatedValue" DECIMAL(12,2),
  "actualValue" DECIMAL(12,2),
  "visibility" "CircleCardReferralVisibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "CircleCardReferral_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CircleCardReferral"
  ADD CONSTRAINT "CircleCardReferral_referrerUserId_fkey"
  FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardReferral"
  ADD CONSTRAINT "CircleCardReferral_referrerCardId_fkey"
  FOREIGN KEY ("referrerCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardReferral"
  ADD CONSTRAINT "CircleCardReferral_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CircleCardReferral"
  ADD CONSTRAINT "CircleCardReferral_recipientCardId_fkey"
  FOREIGN KEY ("recipientCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CircleCardReferral_referrerUserId_idx" ON "CircleCardReferral"("referrerUserId");
CREATE INDEX "CircleCardReferral_recipientUserId_idx" ON "CircleCardReferral"("recipientUserId");
CREATE INDEX "CircleCardReferral_recipientCardId_idx" ON "CircleCardReferral"("recipientCardId");
CREATE INDEX "CircleCardReferral_status_idx" ON "CircleCardReferral"("status");
CREATE INDEX "CircleCardReferral_createdAt_idx" ON "CircleCardReferral"("createdAt");
CREATE INDEX "CircleCardReferral_recipientCardId_visibility_status_createdAt_idx" ON "CircleCardReferral"("recipientCardId", "visibility", "status", "createdAt");
