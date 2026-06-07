ALTER TYPE "CircleCardEventType" ADD VALUE 'CONTACT_NOTE_UPDATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CONTACT_FOLLOWUP_SET';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CONTACT_CATEGORY_SET';

ALTER TABLE "CircleWalletContact"
  ADD COLUMN "metAt" VARCHAR(140),
  ADD COLUMN "followUpDate" DATE,
  ADD COLUMN "lastInteractionDate" DATE,
  ADD COLUMN "category" VARCHAR(80),
  ADD COLUMN "relationshipContext" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "CircleWalletContact_userId_favourite_idx" ON "CircleWalletContact"("userId", "favourite");
CREATE INDEX "CircleWalletContact_userId_category_idx" ON "CircleWalletContact"("userId", "category");
CREATE INDEX "CircleWalletContact_userId_followUpDate_idx" ON "CircleWalletContact"("userId", "followUpDate");
CREATE INDEX "CircleWalletContact_userId_savedAt_idx" ON "CircleWalletContact"("userId", "savedAt");
