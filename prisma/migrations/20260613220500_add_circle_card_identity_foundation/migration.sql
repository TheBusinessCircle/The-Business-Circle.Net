-- Circle Card identity foundation: nullable for existing accounts.
CREATE TYPE "CircleCardAccountType" AS ENUM ('INDIVIDUAL', 'FOUNDER', 'TEAM');

ALTER TABLE "CircleCard"
  ADD COLUMN "accountType" "CircleCardAccountType",
  ADD COLUMN "identityTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CircleCard_accountType_idx" ON "CircleCard"("accountType");

