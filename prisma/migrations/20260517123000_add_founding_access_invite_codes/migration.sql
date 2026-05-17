CREATE TYPE "InviteCodeStatus" AS ENUM ('ACTIVE', 'PAUSED');

CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "status" "InviteCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxRedemptions" INTEGER,
    "successfulUses" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "eligibleTiers" "MembershipTier"[],
    "discountPercent" INTEGER,
    "discountDuration" TEXT,
    "stripeCouponId" TEXT,
    "stripePromotionCodeId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteCodeRedemption" (
    "id" TEXT NOT NULL,
    "inviteCodeId" TEXT NOT NULL,
    "userId" TEXT,
    "pendingRegistrationId" TEXT,
    "email" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InviteCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX "InviteCode_stripeCouponId_key" ON "InviteCode"("stripeCouponId");
CREATE UNIQUE INDEX "InviteCode_stripePromotionCodeId_key" ON "InviteCode"("stripePromotionCodeId");
CREATE INDEX "InviteCode_status_expiresAt_idx" ON "InviteCode"("status", "expiresAt");
CREATE INDEX "InviteCode_createdAt_idx" ON "InviteCode"("createdAt");

CREATE UNIQUE INDEX "InviteCodeRedemption_stripeSessionId_key" ON "InviteCodeRedemption"("stripeSessionId");
CREATE INDEX "InviteCodeRedemption_inviteCodeId_status_createdAt_idx" ON "InviteCodeRedemption"("inviteCodeId", "status", "createdAt");
CREATE INDEX "InviteCodeRedemption_pendingRegistrationId_idx" ON "InviteCodeRedemption"("pendingRegistrationId");
CREATE INDEX "InviteCodeRedemption_userId_idx" ON "InviteCodeRedemption"("userId");
CREATE INDEX "InviteCodeRedemption_email_idx" ON "InviteCodeRedemption"("email");
CREATE INDEX "InviteCodeRedemption_stripeSubscriptionId_idx" ON "InviteCodeRedemption"("stripeSubscriptionId");

ALTER TABLE "InviteCodeRedemption" ADD CONSTRAINT "InviteCodeRedemption_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteCodeRedemption" ADD CONSTRAINT "InviteCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
