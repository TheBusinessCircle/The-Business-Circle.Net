ALTER TABLE "FoundingOfferSettings"
ADD COLUMN "foundationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "innerCircleEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "coreEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FoundingOfferSettings"
ALTER COLUMN "innerCircleFoundingPrice" SET DEFAULT 39,
ALTER COLUMN "coreFoundingPrice" SET DEFAULT 74;

UPDATE "FoundingOfferSettings"
SET "innerCircleFoundingPrice" = 39
WHERE "innerCircleFoundingPrice" = 40;

UPDATE "FoundingOfferSettings"
SET "coreFoundingPrice" = 74
WHERE "coreFoundingPrice" = 80;
