-- Circle Card platform-growth referral foundation.
-- Keeps growth attribution separate from the existing business referral workflow.

ALTER TABLE "User" ADD COLUMN "circleCardReferralCode" VARCHAR(120);

CREATE TABLE "CircleCardGrowthReferral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referrerCardId" TEXT,
    "referredUserId" TEXT,
    "referralCode" VARCHAR(120) NOT NULL,
    "referralSource" VARCHAR(80),
    "visitorId" VARCHAR(120),
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedUpAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "activationStatus" VARCHAR(40) NOT NULL DEFAULT 'CLICKED',
    "proInterestAt" TIMESTAMP(3),
    "teamsInterestAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardGrowthReferral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_circleCardReferralCode_key" ON "User"("circleCardReferralCode");

CREATE UNIQUE INDEX "CircleCardGrowthReferral_referredUserId_key" ON "CircleCardGrowthReferral"("referredUserId");
CREATE INDEX "CircleCardGrowthReferral_referrerUserId_createdAt_idx" ON "CircleCardGrowthReferral"("referrerUserId", "createdAt");
CREATE INDEX "CircleCardGrowthReferral_referrerCardId_idx" ON "CircleCardGrowthReferral"("referrerCardId");
CREATE INDEX "CircleCardGrowthReferral_referralCode_createdAt_idx" ON "CircleCardGrowthReferral"("referralCode", "createdAt");
CREATE INDEX "CircleCardGrowthReferral_visitorId_createdAt_idx" ON "CircleCardGrowthReferral"("visitorId", "createdAt");
CREATE INDEX "CircleCardGrowthReferral_activationStatus_createdAt_idx" ON "CircleCardGrowthReferral"("activationStatus", "createdAt");
CREATE INDEX "CircleCardGrowthReferral_signedUpAt_idx" ON "CircleCardGrowthReferral"("signedUpAt");
CREATE INDEX "CircleCardGrowthReferral_activatedAt_idx" ON "CircleCardGrowthReferral"("activatedAt");
CREATE INDEX "CircleCardGrowthReferral_proInterestAt_idx" ON "CircleCardGrowthReferral"("proInterestAt");
CREATE INDEX "CircleCardGrowthReferral_teamsInterestAt_idx" ON "CircleCardGrowthReferral"("teamsInterestAt");

ALTER TABLE "CircleCardGrowthReferral"
  ADD CONSTRAINT "CircleCardGrowthReferral_referrerUserId_fkey"
  FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardGrowthReferral"
  ADD CONSTRAINT "CircleCardGrowthReferral_referrerCardId_fkey"
  FOREIGN KEY ("referrerCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CircleCardGrowthReferral"
  ADD CONSTRAINT "CircleCardGrowthReferral_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
