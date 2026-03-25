-- CreateEnum
CREATE TYPE "ResourceStage" AS ENUM ('IDEA', 'STARTUP', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "ResourceMediaType" AS ENUM ('NONE', 'IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "mediaType" "ResourceMediaType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "stage" "ResourceStage" NOT NULL DEFAULT 'STARTUP';
