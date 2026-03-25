-- CreateEnum
CREATE TYPE "FoundingReservationStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FoundingReservationSource" AS ENUM ('CHECKOUT', 'UPGRADE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "foundingMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "foundingTier" "MembershipTier",
ADD COLUMN "foundingPrice" INTEGER,
ADD COLUMN "foundingClaimedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "earlyAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "replayUrl" TEXT;

-- CreateTable
CREATE TABLE "FoundingOfferSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "memberLimit" INTEGER NOT NULL DEFAULT 50,
    "innerCircleLimit" INTEGER NOT NULL DEFAULT 50,
    "memberClaimed" INTEGER NOT NULL DEFAULT 0,
    "innerCircleClaimed" INTEGER NOT NULL DEFAULT 0,
    "memberFoundingPrice" INTEGER NOT NULL DEFAULT 15,
    "innerCircleFoundingPrice" INTEGER NOT NULL DEFAULT 39,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoundingOfferSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoundingMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "foundingPrice" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionId" TEXT,

    CONSTRAINT "FoundingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoundingOfferReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "foundingPrice" INTEGER NOT NULL,
    "source" "FoundingReservationSource" NOT NULL DEFAULT 'CHECKOUT',
    "status" "FoundingReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkoutSessionId" TEXT,
    "subscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoundingOfferReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InnerCircleQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answeredById" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InnerCircleQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_foundingMember_idx" ON "User"("foundingMember");

-- CreateIndex
CREATE INDEX "User_foundingTier_idx" ON "User"("foundingTier");

-- CreateIndex
CREATE INDEX "Resource_status_accessTier_earlyAccess_idx" ON "Resource"("status", "accessTier", "earlyAccess");

-- CreateIndex
CREATE UNIQUE INDEX "FoundingMember_userId_key" ON "FoundingMember"("userId");

-- CreateIndex
CREATE INDEX "FoundingMember_tier_claimedAt_idx" ON "FoundingMember"("tier", "claimedAt");

-- CreateIndex
CREATE INDEX "FoundingMember_claimedAt_idx" ON "FoundingMember"("claimedAt");

-- CreateIndex
CREATE INDEX "FoundingMember_subscriptionId_idx" ON "FoundingMember"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "FoundingOfferReservation_checkoutSessionId_key" ON "FoundingOfferReservation"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "FoundingOfferReservation_tier_status_expiresAt_idx" ON "FoundingOfferReservation"("tier", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "FoundingOfferReservation_userId_status_expiresAt_idx" ON "FoundingOfferReservation"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "FoundingOfferReservation_checkoutSessionId_idx" ON "FoundingOfferReservation"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "FoundingOfferReservation_subscriptionId_idx" ON "FoundingOfferReservation"("subscriptionId");

-- CreateIndex
CREATE INDEX "InnerCircleQuestion_userId_createdAt_idx" ON "InnerCircleQuestion"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InnerCircleQuestion_isAnswered_createdAt_idx" ON "InnerCircleQuestion"("isAnswered", "createdAt");

-- CreateIndex
CREATE INDEX "InnerCircleQuestion_answeredAt_idx" ON "InnerCircleQuestion"("answeredAt");

-- AddForeignKey
ALTER TABLE "FoundingMember" ADD CONSTRAINT "FoundingMember_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundingMember" ADD CONSTRAINT "FoundingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundingOfferReservation" ADD CONSTRAINT "FoundingOfferReservation_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundingOfferReservation" ADD CONSTRAINT "FoundingOfferReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnerCircleQuestion" ADD CONSTRAINT "InnerCircleQuestion_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnerCircleQuestion" ADD CONSTRAINT "InnerCircleQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
