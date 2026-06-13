-- Circle Card profile layout system: presentation-only layout choice.
CREATE TYPE "CircleCardProfileLayout" AS ENUM ('CLASSIC', 'BUSINESS', 'CREATOR');

ALTER TABLE "CircleCard"
  ADD COLUMN "profileLayout" "CircleCardProfileLayout" NOT NULL DEFAULT 'BUSINESS';

CREATE INDEX "CircleCard_profileLayout_idx" ON "CircleCard"("profileLayout");
