ALTER TABLE "CircleCard" ADD COLUMN "showInDiscover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CircleCard" ADD COLUMN "discoverOptedInAt" TIMESTAMP(3);

CREATE INDEX "CircleCard_showInDiscover_idx" ON "CircleCard"("showInDiscover");
CREATE INDEX "CircleCard_discoverOptedInAt_idx" ON "CircleCard"("discoverOptedInAt");
