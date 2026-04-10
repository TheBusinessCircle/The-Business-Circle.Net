CREATE TYPE "FounderClientStage" AS ENUM (
  'NEW_APPLICATION',
  'APPROVED',
  'AUDIT_SCHEDULED',
  'AUDIT_IN_PROGRESS',
  'CALL_SCHEDULED',
  'COMPLETED',
  'ONGOING_CLIENT'
);

CREATE TYPE "FounderServiceDiscountType" AS ENUM ('PERCENT', 'FIXED');

CREATE TYPE "FounderServiceDiscountTag" AS ENUM (
  'LOCAL_OUTREACH',
  'MEMBER_DISCOUNT',
  'MANUAL'
);

ALTER TABLE "FounderService"
ADD COLUMN "stripeProductId" TEXT,
ADD COLUMN "stripePriceId" TEXT;

ALTER TABLE "FounderServiceRequest"
ADD COLUMN "adminDiscountCodeId" TEXT,
ADD COLUMN "auditDueAt" TIMESTAMP(3),
ADD COLUMN "auditStartAt" TIMESTAMP(3),
ADD COLUMN "businessStage" "BusinessStage",
ADD COLUMN "callScheduledAt" TIMESTAMP(3),
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "checkoutLinkSentAt" TIMESTAMP(3),
ADD COLUMN "helpSummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pipelineStage" "FounderClientStage" NOT NULL DEFAULT 'NEW_APPLICATION',
ADD COLUMN "taskAuditChecklistComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "taskCallCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "taskFollowUpSent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FounderServiceDiscountCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "type" "FounderServiceDiscountType" NOT NULL,
  "percentOff" INTEGER,
  "amountOff" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "expiresAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "timesRedeemed" INTEGER NOT NULL DEFAULT 0,
  "tag" "FounderServiceDiscountTag" NOT NULL DEFAULT 'MANUAL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "stripeCouponId" TEXT,
  "stripePromotionCodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FounderServiceDiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FounderService_stripeProductId_key" ON "FounderService"("stripeProductId");
CREATE UNIQUE INDEX "FounderService_stripePriceId_key" ON "FounderService"("stripePriceId");
CREATE UNIQUE INDEX "FounderServiceDiscountCode_code_key" ON "FounderServiceDiscountCode"("code");
CREATE UNIQUE INDEX "FounderServiceDiscountCode_stripeCouponId_key" ON "FounderServiceDiscountCode"("stripeCouponId");
CREATE UNIQUE INDEX "FounderServiceDiscountCode_stripePromotionCodeId_key" ON "FounderServiceDiscountCode"("stripePromotionCodeId");

CREATE INDEX "FounderServiceRequest_pipelineStage_createdAt_idx" ON "FounderServiceRequest"("pipelineStage", "createdAt");
CREATE INDEX "FounderServiceRequest_auditStartAt_idx" ON "FounderServiceRequest"("auditStartAt");
CREATE INDEX "FounderServiceRequest_auditDueAt_idx" ON "FounderServiceRequest"("auditDueAt");
CREATE INDEX "FounderServiceRequest_callScheduledAt_idx" ON "FounderServiceRequest"("callScheduledAt");
CREATE INDEX "FounderServiceRequest_adminDiscountCodeId_idx" ON "FounderServiceRequest"("adminDiscountCodeId");
CREATE INDEX "FounderServiceDiscountCode_active_tag_createdAt_idx" ON "FounderServiceDiscountCode"("active", "tag", "createdAt");
CREATE INDEX "FounderServiceDiscountCode_expiresAt_idx" ON "FounderServiceDiscountCode"("expiresAt");

ALTER TABLE "FounderServiceRequest"
ADD CONSTRAINT "FounderServiceRequest_adminDiscountCodeId_fkey"
FOREIGN KEY ("adminDiscountCodeId") REFERENCES "FounderServiceDiscountCode"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
