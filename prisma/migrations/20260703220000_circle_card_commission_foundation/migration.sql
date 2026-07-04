-- CreateEnum
CREATE TYPE "CircleCardAmbassadorType" AS ENUM ('STANDARD', 'FOUNDING_AMBASSADOR');

-- CreateEnum
CREATE TYPE "CircleCardCommissionTier" AS ENUM ('STANDARD', 'FOUNDING_FIRST_10', 'FOUNDING_NEXT_5', 'FOUNDING_ADDITIONAL');

-- CreateEnum
CREATE TYPE "CircleCardCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "CircleCardGrowthReferral" ADD COLUMN "convertedToProAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CircleCardAmbassadorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CircleCardAmbassadorType" NOT NULL DEFAULT 'STANDARD',
    "freeProGranted" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardAmbassadorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleCardCommissionLedger" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
    "tierApplied" "CircleCardCommissionTier" NOT NULL,
    "status" "CircleCardCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(160) NOT NULL,
    "source" VARCHAR(80) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "statusReason" VARCHAR(240),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardCommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircleCardAmbassadorProfile_userId_key" ON "CircleCardAmbassadorProfile"("userId");
CREATE INDEX "CircleCardAmbassadorProfile_type_active_idx" ON "CircleCardAmbassadorProfile"("type", "active");
CREATE INDEX "CircleCardAmbassadorProfile_freeProGranted_active_idx" ON "CircleCardAmbassadorProfile"("freeProGranted", "active");
CREATE UNIQUE INDEX "CircleCardCommissionLedger_referrerUserId_referredUserId_periodMonth_key" ON "CircleCardCommissionLedger"("referrerUserId", "referredUserId", "periodMonth");
CREATE INDEX "CircleCardCommissionLedger_periodMonth_status_idx" ON "CircleCardCommissionLedger"("periodMonth", "status");
CREATE INDEX "CircleCardCommissionLedger_referrerUserId_status_idx" ON "CircleCardCommissionLedger"("referrerUserId", "status");
CREATE INDEX "CircleCardCommissionLedger_referredUserId_idx" ON "CircleCardCommissionLedger"("referredUserId");
CREATE INDEX "CircleCardCommissionLedger_referralId_idx" ON "CircleCardCommissionLedger"("referralId");
CREATE INDEX "CircleCardCommissionLedger_reviewedById_idx" ON "CircleCardCommissionLedger"("reviewedById");
CREATE INDEX "CircleCardGrowthReferral_convertedToProAt_idx" ON "CircleCardGrowthReferral"("convertedToProAt");

-- AddForeignKey
ALTER TABLE "CircleCardAmbassadorProfile" ADD CONSTRAINT "CircleCardAmbassadorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardCommissionLedger" ADD CONSTRAINT "CircleCardCommissionLedger_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardCommissionLedger" ADD CONSTRAINT "CircleCardCommissionLedger_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardCommissionLedger" ADD CONSTRAINT "CircleCardCommissionLedger_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "CircleCardGrowthReferral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CircleCardCommissionLedger" ADD CONSTRAINT "CircleCardCommissionLedger_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
