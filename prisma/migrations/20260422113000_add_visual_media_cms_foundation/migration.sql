-- CreateEnum
CREATE TYPE "VisualMediaPage" AS ENUM ('HOME', 'MEMBERSHIP', 'JOIN', 'ABOUT', 'COMMUNITY', 'FOUNDER', 'RESOURCES', 'INSIGHTS', 'GLOBAL');

-- CreateEnum
CREATE TYPE "VisualMediaVariant" AS ENUM ('HERO', 'SECTION', 'BACKGROUND', 'INLINE', 'CARD');

-- CreateEnum
CREATE TYPE "VisualMediaOverlayStyle" AS ENUM ('NONE', 'SOFT_DARK', 'DARK', 'CINEMATIC');

-- CreateEnum
CREATE TYPE "VisualMediaStorageProvider" AS ENUM ('LOCAL', 'CLOUDINARY');

-- CreateTable
CREATE TABLE "VisualMediaPlacement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "page" "VisualMediaPage" NOT NULL,
    "section" TEXT,
    "variant" "VisualMediaVariant" NOT NULL,
    "imageUrl" TEXT,
    "mobileImageUrl" TEXT,
    "desktopStorageKey" TEXT,
    "mobileStorageKey" TEXT,
    "storageProvider" "VisualMediaStorageProvider",
    "altText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "overlayStyle" "VisualMediaOverlayStyle",
    "objectPosition" TEXT,
    "focalPointX" INTEGER,
    "focalPointY" INTEGER,
    "adminHelperText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualMediaPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisualMediaPlacement_key_key" ON "VisualMediaPlacement"("key");

-- CreateIndex
CREATE INDEX "VisualMediaPlacement_page_sortOrder_idx" ON "VisualMediaPlacement"("page", "sortOrder");

-- CreateIndex
CREATE INDEX "VisualMediaPlacement_page_section_sortOrder_idx" ON "VisualMediaPlacement"("page", "section", "sortOrder");

-- CreateIndex
CREATE INDEX "VisualMediaPlacement_isActive_page_idx" ON "VisualMediaPlacement"("isActive", "page");
