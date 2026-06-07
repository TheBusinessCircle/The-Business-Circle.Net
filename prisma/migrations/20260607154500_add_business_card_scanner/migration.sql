CREATE TYPE "CircleWalletContactSource" AS ENUM ('MANUAL', 'CIRCLE_CARD', 'BUSINESS_CARD_SCAN', 'LINK_IMPORT');

ALTER TYPE "CircleCardEventType" ADD VALUE 'BUSINESS_CARD_SCANNED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'BUSINESS_CARD_MATCH_FOUND';
ALTER TYPE "CircleCardEventType" ADD VALUE 'BUSINESS_CARD_CONTACT_CREATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CLAIM_LINK_GENERATED';

ALTER TABLE "CircleWalletContact"
  ADD COLUMN "source" "CircleWalletContactSource" NOT NULL DEFAULT 'CIRCLE_CARD',
  ALTER COLUMN "cardId" DROP NOT NULL,
  ADD COLUMN "fullName" VARCHAR(120),
  ADD COLUMN "businessName" VARCHAR(140),
  ADD COLUMN "role" VARCHAR(120),
  ADD COLUMN "phone" VARCHAR(48),
  ADD COLUMN "mobilePhone" VARCHAR(48),
  ADD COLUMN "email" VARCHAR(320),
  ADD COLUMN "websiteUrl" VARCHAR(2048),
  ADD COLUMN "websiteDomain" VARCHAR(255),
  ADD COLUMN "address" TEXT,
  ADD COLUMN "socialLinks" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "originalCardImageUrl" VARCHAR(2048),
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "claimTokenGeneratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CircleWalletContact_claimToken_key" ON "CircleWalletContact"("claimToken");
CREATE INDEX "CircleWalletContact_userId_source_idx" ON "CircleWalletContact"("userId", "source");
CREATE INDEX "CircleWalletContact_userId_email_idx" ON "CircleWalletContact"("userId", "email");
CREATE INDEX "CircleWalletContact_userId_websiteDomain_idx" ON "CircleWalletContact"("userId", "websiteDomain");
