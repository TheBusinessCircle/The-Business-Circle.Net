ALTER TABLE "CommunityPost"
ADD COLUMN IF NOT EXISTS "intelligenceSourceId" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceSourceName" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceCanonicalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceDedupeKey" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceAuthor" TEXT,
ADD COLUMN IF NOT EXISTS "intelligencePublishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "intelligencePrimaryCategory" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceSecondaryCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intelligenceLabel" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceShortSummary" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceKeyDetail" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceWhyThisMatters" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceBusinessOwnerImpact" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceFounderTakeaway" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceWhatToWatchNext" TEXT,
ADD COLUMN IF NOT EXISTS "intelligencePossibleRisks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intelligencePossibleOpportunities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intelligenceAffectedBusinessAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intelligenceSuggestedDiscussionPrompt" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceRecommendedRoom" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceUrgencyScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceRelevanceScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceCommercialImpactScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceConfidenceScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceSourceCredibilityScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceBusinessOwnerScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "intelligenceRegion" TEXT,
ADD COLUMN IF NOT EXISTS "intelligenceSectorsAffected" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intelligenceFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "intelligenceStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN IF NOT EXISTS "intelligenceEnrichedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPost_intelligenceDedupeKey_key"
ON "CommunityPost"("intelligenceDedupeKey");

CREATE INDEX IF NOT EXISTS "CommunityPost_intelligenceSourceId_intelligencePublishedAt_idx"
ON "CommunityPost"("intelligenceSourceId", "intelligencePublishedAt");

CREATE INDEX IF NOT EXISTS "CommunityPost_intelligencePrimaryCategory_intelligenceBusinessOwnerScore_idx"
ON "CommunityPost"("intelligencePrimaryCategory", "intelligenceBusinessOwnerScore");

CREATE INDEX IF NOT EXISTS "CommunityPost_intelligenceStatus_intelligenceBusinessOwnerScore_idx"
ON "CommunityPost"("intelligenceStatus", "intelligenceBusinessOwnerScore");

CREATE INDEX IF NOT EXISTS "CommunityPost_intelligenceFeatured_intelligenceBusinessOwnerScore_idx"
ON "CommunityPost"("intelligenceFeatured", "intelligenceBusinessOwnerScore");

CREATE INDEX IF NOT EXISTS "CommunityPost_intelligenceCanonicalUrl_idx"
ON "CommunityPost"("intelligenceCanonicalUrl");

CREATE TABLE IF NOT EXISTS "IntelligenceSourceState" (
  "id" TEXT NOT NULL,
  "enabledOverride" BOOLEAN,
  "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
  "lastFetchAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "lastError" TEXT,
  "fetchedCount" INTEGER NOT NULL DEFAULT 0,
  "candidateCount" INTEGER NOT NULL DEFAULT 0,
  "publishedCount" INTEGER NOT NULL DEFAULT 0,
  "disabledReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntelligenceSourceState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IntelligenceSourceState_healthStatus_idx"
ON "IntelligenceSourceState"("healthStatus");

CREATE INDEX IF NOT EXISTS "IntelligenceSourceState_lastFetchAt_idx"
ON "IntelligenceSourceState"("lastFetchAt");
