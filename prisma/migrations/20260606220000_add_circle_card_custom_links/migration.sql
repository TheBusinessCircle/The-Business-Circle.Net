ALTER TYPE "CircleCardEventType" ADD VALUE 'CUSTOM_LINK_CLICK';

CREATE TABLE "CircleCardLink" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleCardLink_cardId_idx" ON "CircleCardLink"("cardId");
CREATE INDEX "CircleCardLink_sortOrder_idx" ON "CircleCardLink"("sortOrder");
CREATE INDEX "CircleCardLink_isActive_idx" ON "CircleCardLink"("isActive");
CREATE INDEX "CircleCardLink_cardId_isActive_sortOrder_idx" ON "CircleCardLink"("cardId", "isActive", "sortOrder");

ALTER TABLE "CircleCardLink" ADD CONSTRAINT "CircleCardLink_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
