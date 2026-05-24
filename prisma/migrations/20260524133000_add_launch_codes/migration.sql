CREATE TYPE "LaunchCodeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FULL', 'EXPIRED', 'ARCHIVED');
CREATE TYPE "LaunchCodeRedemptionStatus" AS ENUM ('CODE_ENTERED', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED', 'SUBSCRIPTION_TRIALING', 'SUBSCRIPTION_ACTIVE', 'SUBSCRIPTION_CANCELLED', 'EXPIRED', 'FAILED');

CREATE TABLE "LaunchCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "LaunchCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxRedemptions" INTEGER NOT NULL DEFAULT 25,
    "trialDays" INTEGER NOT NULL DEFAULT 90,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaunchCodeRedemption" (
    "id" TEXT NOT NULL,
    "launchCodeId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "tierSelected" "MembershipTier",
    "status" "LaunchCodeRedemptionStatus" NOT NULL DEFAULT 'CODE_ENTERED',
    "sourcePlatform" TEXT,
    "sourcePath" TEXT,
    "referrer" TEXT,
    "visitorId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "reservationExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaunchCode_code_key" ON "LaunchCode"("code");
CREATE UNIQUE INDEX "LaunchCodeRedemption_stripeCheckoutSessionId_key" ON "LaunchCodeRedemption"("stripeCheckoutSessionId");

CREATE INDEX "LaunchCode_code_idx" ON "LaunchCode"("code");
CREATE INDEX "LaunchCode_status_idx" ON "LaunchCode"("status");
CREATE INDEX "LaunchCode_platform_idx" ON "LaunchCode"("platform");
CREATE INDEX "LaunchCode_createdAt_idx" ON "LaunchCode"("createdAt");
CREATE INDEX "LaunchCode_createdById_idx" ON "LaunchCode"("createdById");

CREATE INDEX "LaunchCodeRedemption_launchCodeId_idx" ON "LaunchCodeRedemption"("launchCodeId");
CREATE INDEX "LaunchCodeRedemption_email_idx" ON "LaunchCodeRedemption"("email");
CREATE INDEX "LaunchCodeRedemption_userId_idx" ON "LaunchCodeRedemption"("userId");
CREATE INDEX "LaunchCodeRedemption_createdAt_idx" ON "LaunchCodeRedemption"("createdAt");
CREATE INDEX "LaunchCodeRedemption_stripeCheckoutSessionId_idx" ON "LaunchCodeRedemption"("stripeCheckoutSessionId");
CREATE INDEX "LaunchCodeRedemption_stripeSubscriptionId_idx" ON "LaunchCodeRedemption"("stripeSubscriptionId");
CREATE INDEX "LaunchCodeRedemption_tierSelected_idx" ON "LaunchCodeRedemption"("tierSelected");
CREATE INDEX "LaunchCodeRedemption_status_idx" ON "LaunchCodeRedemption"("status");
CREATE INDEX "LaunchCodeRedemption_visitorId_idx" ON "LaunchCodeRedemption"("visitorId");

ALTER TABLE "LaunchCode" ADD CONSTRAINT "LaunchCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LaunchCodeRedemption" ADD CONSTRAINT "LaunchCodeRedemption_launchCodeId_fkey" FOREIGN KEY ("launchCodeId") REFERENCES "LaunchCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaunchCodeRedemption" ADD CONSTRAINT "LaunchCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LaunchCodeRedemption" ADD CONSTRAINT "LaunchCodeRedemption_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
