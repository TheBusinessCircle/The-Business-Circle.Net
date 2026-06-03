-- Add optional business logo support for Circle Card public identities.
ALTER TABLE "CircleCard" ADD COLUMN "businessLogoUrl" TEXT;
