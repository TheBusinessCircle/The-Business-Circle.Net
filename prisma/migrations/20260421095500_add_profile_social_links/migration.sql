ALTER TABLE "Profile"
ADD COLUMN "facebook" TEXT,
ADD COLUMN "youtube" TEXT,
ADD COLUMN "customLinks" TEXT[] DEFAULT ARRAY[]::TEXT[];
