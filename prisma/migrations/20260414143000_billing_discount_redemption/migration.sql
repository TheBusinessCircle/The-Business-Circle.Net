ALTER TABLE "BillingDiscount"
ADD COLUMN "redeemedAt" TIMESTAMP(3),
ADD COLUMN "redeemedById" TEXT,
ADD COLUMN "redeemedCheckoutSessionId" TEXT,
ADD COLUMN "redeemedSubscriptionId" TEXT,
ADD COLUMN "redeemedCustomerId" TEXT;

ALTER TABLE "BillingDiscount"
ALTER COLUMN "usageLimit" SET DEFAULT 1;

UPDATE "BillingDiscount"
SET "usageLimit" = 1
WHERE "usageLimit" IS NULL;

ALTER TABLE "BillingDiscount"
ALTER COLUMN "usageLimit" SET NOT NULL;

CREATE INDEX "BillingDiscount_redeemedById_idx"
ON "BillingDiscount"("redeemedById");

CREATE INDEX "BillingDiscount_redeemedCheckoutSessionId_idx"
ON "BillingDiscount"("redeemedCheckoutSessionId");

CREATE INDEX "BillingDiscount_redeemedSubscriptionId_idx"
ON "BillingDiscount"("redeemedSubscriptionId");

CREATE INDEX "BillingDiscount_redeemedCustomerId_idx"
ON "BillingDiscount"("redeemedCustomerId");

ALTER TABLE "BillingDiscount"
ADD CONSTRAINT "BillingDiscount_redeemedById_fkey"
FOREIGN KEY ("redeemedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
