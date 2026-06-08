CREATE TYPE "CircleCardNotificationType" AS ENUM (
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'RECOMMENDATION_RECEIVED',
  'INTRODUCTION_RECEIVED',
  'INTRODUCTION_ACCEPTED',
  'INTRODUCTION_DECLINED',
  'REFERRAL_RECEIVED',
  'REFERRAL_ACCEPTED',
  'REFERRAL_WON',
  'REFERRAL_LOST',
  'OPPORTUNITY_FOLLOWUP_DUE',
  'OPPORTUNITY_UPDATED',
  'BUSINESS_CARD_CLAIMED',
  'SYSTEM'
);

ALTER TYPE "CircleCardEventType" ADD VALUE 'NOTIFICATION_READ';
ALTER TYPE "CircleCardEventType" ADD VALUE 'NOTIFICATION_MARK_ALL_READ';

CREATE TABLE "CircleCardNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "circleCardId" TEXT,
  "type" "CircleCardNotificationType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(360) NOT NULL,
  "entityType" VARCHAR(80),
  "entityId" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CircleCardNotification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CircleCardNotification"
  ADD CONSTRAINT "CircleCardNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardNotification"
  ADD CONSTRAINT "CircleCardNotification_circleCardId_fkey"
  FOREIGN KEY ("circleCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CircleCardNotification_userId_idx" ON "CircleCardNotification"("userId");
CREATE INDEX "CircleCardNotification_isRead_idx" ON "CircleCardNotification"("isRead");
CREATE INDEX "CircleCardNotification_type_idx" ON "CircleCardNotification"("type");
CREATE INDEX "CircleCardNotification_createdAt_idx" ON "CircleCardNotification"("createdAt");
CREATE INDEX "CircleCardNotification_circleCardId_idx" ON "CircleCardNotification"("circleCardId");
CREATE INDEX "CircleCardNotification_entityType_entityId_idx" ON "CircleCardNotification"("entityType", "entityId");
