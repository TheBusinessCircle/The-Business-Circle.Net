-- CreateEnum
CREATE TYPE "CircleCardSubscriptionPlan" AS ENUM ('PRO', 'TEAMS');

-- CreateTable
CREATE TABLE "CircleCardSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "CircleCardSubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "billingInterval" "BillingInterval" NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "lastInvoicePaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircleCardSubscription_userId_key" ON "CircleCardSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleCardSubscription_stripeSubscriptionId_key" ON "CircleCardSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_plan_status_idx" ON "CircleCardSubscription"("plan", "status");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_billingInterval_status_idx" ON "CircleCardSubscription"("billingInterval", "status");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_stripeCustomerId_idx" ON "CircleCardSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_stripePriceId_idx" ON "CircleCardSubscription"("stripePriceId");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_currentPeriodEnd_idx" ON "CircleCardSubscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_cancelAtPeriodEnd_currentPeriodEnd_idx" ON "CircleCardSubscription"("cancelAtPeriodEnd", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_lastInvoicePaidAt_idx" ON "CircleCardSubscription"("lastInvoicePaidAt");

-- CreateIndex
CREATE INDEX "CircleCardSubscription_updatedAt_idx" ON "CircleCardSubscription"("updatedAt");

-- AddForeignKey
ALTER TABLE "CircleCardSubscription" ADD CONSTRAINT "CircleCardSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
