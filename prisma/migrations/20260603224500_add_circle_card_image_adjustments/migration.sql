-- Add optional image positioning controls for Circle Card portrait and logo rendering.
ALTER TABLE "CircleCard" ADD COLUMN "profileImagePositionX" DOUBLE PRECISION;
ALTER TABLE "CircleCard" ADD COLUMN "profileImagePositionY" DOUBLE PRECISION;
ALTER TABLE "CircleCard" ADD COLUMN "profileImageScale" DOUBLE PRECISION;
ALTER TABLE "CircleCard" ADD COLUMN "businessLogoPositionX" DOUBLE PRECISION;
ALTER TABLE "CircleCard" ADD COLUMN "businessLogoPositionY" DOUBLE PRECISION;
ALTER TABLE "CircleCard" ADD COLUMN "businessLogoScale" DOUBLE PRECISION;
