CREATE TYPE "OpportunityStatus" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST');

CREATE TYPE "OpportunitySourceType" AS ENUM ('MANUAL', 'REFERRAL', 'INTRODUCTION', 'RECOMMENDATION', 'DISCOVERY', 'CONNECTION');

ALTER TYPE "CircleCardEventType" ADD VALUE 'OPPORTUNITY_CREATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'OPPORTUNITY_UPDATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'OPPORTUNITY_WON';
ALTER TYPE "CircleCardEventType" ADD VALUE 'OPPORTUNITY_LOST';
ALTER TYPE "CircleCardEventType" ADD VALUE 'OPPORTUNITY_FOLLOWUP_SET';

CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "circleCardId" TEXT NOT NULL,
  "walletContactId" TEXT,
  "title" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "status" "OpportunityStatus" NOT NULL DEFAULT 'LEAD',
  "potentialValue" DECIMAL(12,2),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "sourceType" "OpportunitySourceType" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3),
  "nextFollowUpAt" DATE,
  "notes" TEXT,

  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_circleCardId_fkey"
  FOREIGN KEY ("circleCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_walletContactId_fkey"
  FOREIGN KEY ("walletContactId") REFERENCES "CircleWalletContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Opportunity_userId_idx" ON "Opportunity"("userId");
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_nextFollowUpAt_idx" ON "Opportunity"("nextFollowUpAt");
CREATE INDEX "Opportunity_lastActivityAt_idx" ON "Opportunity"("lastActivityAt");
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");
CREATE INDEX "Opportunity_circleCardId_idx" ON "Opportunity"("circleCardId");
CREATE INDEX "Opportunity_walletContactId_idx" ON "Opportunity"("walletContactId");
