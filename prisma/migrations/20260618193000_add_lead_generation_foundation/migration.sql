-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('CIRCLE_CARD_SIGNUP', 'BCN_JOIN', 'AUDIT_QUIZ', 'CONTACT_FORM', 'FOUNDER_AUDIT', 'EVENT_SIGNUP', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'NOT_READY', 'DO_NOT_CONTACT');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "contactSubmissionId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessName" TEXT,
    "website" TEXT,
    "source" "LeadSource" NOT NULL,
    "sourceLabel" TEXT,
    "consentSource" TEXT,
    "essentialConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingEmailOptIn" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "score" INTEGER,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "lastEmailedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_contactSubmissionId_key" ON "Lead"("contactSubmissionId");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_marketingEmailOptIn_idx" ON "Lead"("marketingEmailOptIn");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_lastEmailedAt_idx" ON "Lead"("lastEmailedAt");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactSubmissionId_fkey" FOREIGN KEY ("contactSubmissionId") REFERENCES "ContactSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
