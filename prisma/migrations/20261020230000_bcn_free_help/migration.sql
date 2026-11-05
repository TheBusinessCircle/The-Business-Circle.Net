-- CreateTable
CREATE TABLE "BcnHelpRequest" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "business" VARCHAR(160) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "summary" VARCHAR(4000) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
    "processingConsentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentVersion" TEXT NOT NULL DEFAULT 'bcn-help-2026-10-20',
    "providerId" TEXT,
    "consentTokenHash" TEXT,
    "consentExpiresAt" TIMESTAMP(3),
    "sharingConsentAt" TIMESTAMP(3),
    "introducedAt" TIMESTAMP(3),
    "outcome" VARCHAR(1000),
    "agreedFeePence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcnHelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnProvider" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "location" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1500) NOT NULL,
    "website" VARCHAR(500) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "publicListingConsent" BOOLEAN NOT NULL DEFAULT false,
    "agreementReference" VARCHAR(200),
    "relatedBusinessDisclosure" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnHelpAudit" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "actorId" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnHelpAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnBusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "business" VARCHAR(160) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "location" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1500) NOT NULL,
    "website" VARCHAR(500) NOT NULL,
    "publicConsentAt" TIMESTAMP(3),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcnBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnAffiliateOffer" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "destination" VARCHAR(1500) NOT NULL,
    "allowedHost" VARCHAR(200) NOT NULL,
    "approvalReference" VARCHAR(200) NOT NULL,
    "disclosure" VARCHAR(500) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BcnAffiliateOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnAffiliateClick" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnAffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnRevenueEntry" (
    "id" TEXT NOT NULL,
    "stream" VARCHAR(40) NOT NULL,
    "externalReference" VARCHAR(200) NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
    "evidenceReference" VARCHAR(300) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnRevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BcnHelpRequest_consentTokenHash_key" ON "BcnHelpRequest"("consentTokenHash");

-- CreateIndex
CREATE INDEX "BcnHelpRequest_status_createdAt_idx" ON "BcnHelpRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BcnProvider_approved_publicListingConsent_category_idx" ON "BcnProvider"("approved", "publicListingConsent", "category");

-- CreateIndex
CREATE INDEX "BcnHelpAudit_requestId_createdAt_idx" ON "BcnHelpAudit"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BcnBusinessProfile_userId_key" ON "BcnBusinessProfile"("userId");

-- CreateIndex
CREATE INDEX "BcnBusinessProfile_approved_publicConsentAt_idx" ON "BcnBusinessProfile"("approved", "publicConsentAt");

-- CreateIndex
CREATE UNIQUE INDEX "BcnAffiliateOffer_slug_key" ON "BcnAffiliateOffer"("slug");

-- CreateIndex
CREATE INDEX "BcnAffiliateClick_offerId_createdAt_idx" ON "BcnAffiliateClick"("offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BcnRevenueEntry_externalReference_key" ON "BcnRevenueEntry"("externalReference");

-- CreateIndex
CREATE INDEX "BcnRevenueEntry_stream_receivedAt_idx" ON "BcnRevenueEntry"("stream", "receivedAt");

-- AddForeignKey
ALTER TABLE "BcnHelpRequest" ADD CONSTRAINT "BcnHelpRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "BcnProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnHelpAudit" ADD CONSTRAINT "BcnHelpAudit_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BcnHelpRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnAffiliateClick" ADD CONSTRAINT "BcnAffiliateClick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "BcnAffiliateOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "BcnHelpRequest" ADD CONSTRAINT "BcnHelpRequest_status_check" CHECK ("status" IN ('RECEIVED','REVIEWED','AWAITING_CONSENT','CONSENTED','INTRODUCED','CLOSED','REJECTED'));
ALTER TABLE "BcnHelpRequest" ADD CONSTRAINT "BcnHelpRequest_fee_check" CHECK ("agreedFeePence" IS NULL OR "agreedFeePence" >= 0);
ALTER TABLE "BcnHelpRequest" ADD CONSTRAINT "BcnHelpRequest_sharing_check" CHECK ("status" NOT IN ('CONSENTED','INTRODUCED') OR ("sharingConsentAt" IS NOT NULL AND "providerId" IS NOT NULL));
ALTER TABLE "BcnRevenueEntry" ADD CONSTRAINT "BcnRevenueEntry_amount_check" CHECK (("stream" = 'reversal' AND "amountPence" < 0) OR ("stream" IN ('introduction','affiliate','download','sponsorship') AND "amountPence" > 0));
