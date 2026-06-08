CREATE TYPE "CircleCardActivityType" AS ENUM (
  'CARD_CREATED',
  'CARD_UPDATED',
  'CONTACT_SAVED',
  'CONTACT_UPDATED',
  'CONNECTION_REQUEST_SENT',
  'CONNECTION_ACCEPTED',
  'RECOMMENDATION_CREATED',
  'RECOMMENDATION_RECEIVED',
  'INTRODUCTION_CREATED',
  'INTRODUCTION_ACCEPTED',
  'INTRODUCTION_DECLINED',
  'INTRODUCTION_COMPLETED',
  'REFERRAL_CREATED',
  'REFERRAL_RECEIVED',
  'REFERRAL_ACCEPTED',
  'REFERRAL_WON',
  'REFERRAL_LOST',
  'OPPORTUNITY_CREATED',
  'OPPORTUNITY_UPDATED',
  'OPPORTUNITY_WON',
  'OPPORTUNITY_LOST',
  'BUSINESS_CARD_SCANNED',
  'BUSINESS_CARD_CONTACT_CREATED',
  'SMART_LINK_CLICKED',
  'PRIVATE_LINK_UNLOCKED'
);

CREATE TABLE "CircleCardActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "circleCardId" TEXT,
  "type" "CircleCardActivityType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(360) NOT NULL,
  "entityType" VARCHAR(80),
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CircleCardActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CircleCardActivity"
  ADD CONSTRAINT "CircleCardActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardActivity"
  ADD CONSTRAINT "CircleCardActivity_circleCardId_fkey"
  FOREIGN KEY ("circleCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CircleCardActivity_userId_idx" ON "CircleCardActivity"("userId");
CREATE INDEX "CircleCardActivity_circleCardId_idx" ON "CircleCardActivity"("circleCardId");
CREATE INDEX "CircleCardActivity_type_idx" ON "CircleCardActivity"("type");
CREATE INDEX "CircleCardActivity_createdAt_idx" ON "CircleCardActivity"("createdAt");
