ALTER TABLE "FounderServiceRequest"
ADD COLUMN "serviceOwner" TEXT NOT NULL DEFAULT 'Trev',
ADD COLUMN "sourcePage" TEXT,
ADD COLUMN "sourceSection" TEXT,
ADD COLUMN "baseAmount" INTEGER,
ADD COLUMN "membershipDiscountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "membershipTierApplied" "MembershipTier",
ADD COLUMN "discountLabel" TEXT;

UPDATE "FounderServiceRequest"
SET "baseAmount" = "amount"
WHERE "baseAmount" IS NULL;

ALTER TABLE "FounderServiceRequest"
ALTER COLUMN "baseAmount" SET NOT NULL;
