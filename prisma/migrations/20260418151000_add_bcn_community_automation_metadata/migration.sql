ALTER TABLE "CommunityPost"
ADD COLUMN IF NOT EXISTS "automationSource" TEXT,
ADD COLUMN IF NOT EXISTS "automationExternalId" TEXT,
ADD COLUMN IF NOT EXISTS "automationChecksum" TEXT,
ADD COLUMN IF NOT EXISTS "automatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPost_automationChecksum_key"
ON "CommunityPost"("automationChecksum");

CREATE INDEX IF NOT EXISTS "CommunityPost_automationSource_automationExternalId_idx"
ON "CommunityPost"("automationSource", "automationExternalId");
