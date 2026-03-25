-- CreateEnum
CREATE TYPE "FounderServiceBillingType" AS ENUM ('ONE_TIME', 'MONTHLY_RETAINER');

-- CreateEnum
CREATE TYPE "FounderServicePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FounderServiceStatus" AS ENUM ('NEW', 'REVIEWED', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FounderRevenueRange" AS ENUM ('PRE_REVENUE', 'UNDER_2000', 'BETWEEN_2000_10000', 'BETWEEN_10000_50000', 'OVER_50000');

-- CreateTable
CREATE TABLE "FounderService" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaLabel" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "billingType" "FounderServiceBillingType" NOT NULL DEFAULT 'ONE_TIME',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderServiceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "serviceId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "yearsInBusiness" TEXT NOT NULL,
    "employeeCount" TEXT NOT NULL,
    "revenueRange" "FounderRevenueRange" NOT NULL,
    "instagram" TEXT,
    "tiktok" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "otherSocial" TEXT,
    "businessDescription" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "productsOrServices" TEXT NOT NULL,
    "offers" TEXT NOT NULL,
    "differentiator" TEXT NOT NULL,
    "mainGoal" TEXT NOT NULL,
    "biggestChallenge" TEXT NOT NULL,
    "blockers" TEXT NOT NULL,
    "pastAttempts" TEXT NOT NULL,
    "successDefinition" TEXT NOT NULL,
    "marketingChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyTrev" TEXT NOT NULL,
    "paymentStatus" "FounderServicePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "serviceStatus" "FounderServiceStatus" NOT NULL DEFAULT 'NEW',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeInvoiceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderServiceUpload" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderServiceUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FounderService_slug_key" ON "FounderService"("slug");

-- CreateIndex
CREATE INDEX "FounderService_active_position_idx" ON "FounderService"("active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "FounderServiceRequest_stripeCheckoutSessionId_key" ON "FounderServiceRequest"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FounderServiceRequest_stripePaymentIntentId_key" ON "FounderServiceRequest"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "FounderServiceRequest_stripeSubscriptionId_key" ON "FounderServiceRequest"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_createdAt_idx" ON "FounderServiceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_serviceId_createdAt_idx" ON "FounderServiceRequest"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_userId_createdAt_idx" ON "FounderServiceRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_paymentStatus_createdAt_idx" ON "FounderServiceRequest"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_serviceStatus_createdAt_idx" ON "FounderServiceRequest"("serviceStatus", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceRequest_email_idx" ON "FounderServiceRequest"("email");

-- CreateIndex
CREATE INDEX "FounderServiceUpload_requestId_createdAt_idx" ON "FounderServiceUpload"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "FounderServiceRequest" ADD CONSTRAINT "FounderServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "FounderService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderServiceRequest" ADD CONSTRAINT "FounderServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderServiceUpload" ADD CONSTRAINT "FounderServiceUpload_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FounderServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
