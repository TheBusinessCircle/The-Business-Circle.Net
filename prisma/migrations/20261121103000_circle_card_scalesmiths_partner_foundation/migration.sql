-- Additive, isolated Circle Card x ScaleSmiths partner foundation.
-- Deliberately creates no live API handlers, integrations or sponsor grants.
-- Deploy only after an approved migration rehearsal and rollback/backup review.

CREATE TYPE "CircleCardScaleSmithsPartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED');
CREATE TYPE "CircleCardScaleSmithsPortfolioStatus" AS ENUM ('INTERNAL', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');

ALTER TABLE "CircleCard"
  ADD COLUMN "showOnPublicProfile" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE "CircleCardScaleSmithsPartner" (
  "id" TEXT NOT NULL,
  "externalPartnerId" VARCHAR(128) NOT NULL,
  "userId" TEXT NOT NULL,
  "partnerCardId" TEXT,
  "displayName" VARCHAR(180) NOT NULL,
  "status" "CircleCardScaleSmithsPartnerStatus" NOT NULL DEFAULT 'PENDING',
  "sponsoredProStartsAt" TIMESTAMP(3),
  "sponsoredProEndsAt" TIMESTAMP(3),
  "linkedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "lastSourceEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleCardScaleSmithsPartner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleCardScaleSmithsPartner_externalPartnerId_key"
  ON "CircleCardScaleSmithsPartner"("externalPartnerId");
CREATE UNIQUE INDEX "CircleCardScaleSmithsPartner_userId_key"
  ON "CircleCardScaleSmithsPartner"("userId");
CREATE UNIQUE INDEX "CircleCardScaleSmithsPartner_partnerCardId_key"
  ON "CircleCardScaleSmithsPartner"("partnerCardId");
CREATE INDEX "CircleCardScaleSmithsPartner_status_idx"
  ON "CircleCardScaleSmithsPartner"("status");
CREATE INDEX "CircleCardScaleSmithsPartner_updatedAt_idx"
  ON "CircleCardScaleSmithsPartner"("updatedAt");
ALTER TABLE "CircleCardScaleSmithsPartner"
  ADD CONSTRAINT "CircleCardScaleSmithsPartner_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardScaleSmithsPartner"
  ADD CONSTRAINT "CircleCardScaleSmithsPartner_partnerCardId_fkey"
  FOREIGN KEY ("partnerCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CircleCardScaleSmithsPortfolio" (
  "id" TEXT NOT NULL,
  "externalPartnerId" VARCHAR(128) NOT NULL,
  "externalClientId" VARCHAR(128) NOT NULL,
  "businessName" VARCHAR(180) NOT NULL,
  "summary" VARCHAR(1000),
  "logoUrl" VARCHAR(2048),
  "websiteUrl" VARCHAR(2048),
  "caseStudyUrl" VARCHAR(2048),
  "publicationStatus" "CircleCardScaleSmithsPortfolioStatus" NOT NULL DEFAULT 'INTERNAL',
  "clientConsentAt" TIMESTAMP(3),
  "founderApprovedAt" TIMESTAMP(3),
  "projectDeliveredAt" TIMESTAMP(3),
  "consentWithdrawnAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "lastSourceEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleCardScaleSmithsPortfolio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleCardScaleSmithsPortfolio_externalPartnerId_externalClientId_key"
  ON "CircleCardScaleSmithsPortfolio"("externalPartnerId", "externalClientId");
CREATE INDEX "CircleCardScaleSmithsPortfolio_externalPartnerId_publicationStatus_idx"
  ON "CircleCardScaleSmithsPortfolio"("externalPartnerId", "publicationStatus");
CREATE INDEX "CircleCardScaleSmithsPortfolio_lastSourceEventAt_idx"
  ON "CircleCardScaleSmithsPortfolio"("lastSourceEventAt");
ALTER TABLE "CircleCardScaleSmithsPortfolio"
  ADD CONSTRAINT "CircleCardScaleSmithsPortfolio_externalPartnerId_fkey"
  FOREIGN KEY ("externalPartnerId") REFERENCES "CircleCardScaleSmithsPartner"("externalPartnerId")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CircleCardScaleSmithsEventReceipt" (
  "eventId" VARCHAR(64) NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "partnerId" VARCHAR(128) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadHash" VARCHAR(64) NOT NULL,
  CONSTRAINT "CircleCardScaleSmithsEventReceipt_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "CircleCardScaleSmithsEventReceipt_partnerId_occurredAt_idx"
  ON "CircleCardScaleSmithsEventReceipt"("partnerId", "occurredAt");
CREATE INDEX "CircleCardScaleSmithsEventReceipt_eventType_idx"
  ON "CircleCardScaleSmithsEventReceipt"("eventType");

CREATE TABLE "CircleCardScaleSmithsLinkChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "externalPartnerId" VARCHAR(128) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleCardScaleSmithsLinkChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleCardScaleSmithsLinkChallenge_tokenHash_key"
  ON "CircleCardScaleSmithsLinkChallenge"("tokenHash");
CREATE INDEX "CircleCardScaleSmithsLinkChallenge_userId_expiresAt_idx"
  ON "CircleCardScaleSmithsLinkChallenge"("userId", "expiresAt");
CREATE INDEX "CircleCardScaleSmithsLinkChallenge_externalPartnerId_idx"
  ON "CircleCardScaleSmithsLinkChallenge"("externalPartnerId");
CREATE INDEX "CircleCardScaleSmithsLinkChallenge_expiresAt_idx"
  ON "CircleCardScaleSmithsLinkChallenge"("expiresAt");
ALTER TABLE "CircleCardScaleSmithsLinkChallenge"
  ADD CONSTRAINT "CircleCardScaleSmithsLinkChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
