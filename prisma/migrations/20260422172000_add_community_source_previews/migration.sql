ALTER TABLE "CommunityPost"
ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
ADD COLUMN IF NOT EXISTS "sourceDomain" TEXT,
ADD COLUMN IF NOT EXISTS "previewImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "previewImageKind" TEXT,
ADD COLUMN IF NOT EXISTS "previewGeneratedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CommunityPost_sourceDomain_createdAt_idx"
ON "CommunityPost"("sourceDomain", "createdAt");
