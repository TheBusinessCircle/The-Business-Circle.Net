CREATE TABLE "GrowthIntelligenceReport" (
    "id" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "nextRefreshAt" TIMESTAMP(3) NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "healthScore" INTEGER,
    "momentumLabel" TEXT,
    "keyFindings" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "priorityAction" TEXT,
    "metricsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthIntelligenceReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthIntelligenceReport_generatedAt_idx" ON "GrowthIntelligenceReport"("generatedAt");
CREATE INDEX "GrowthIntelligenceReport_nextRefreshAt_idx" ON "GrowthIntelligenceReport"("nextRefreshAt");
CREATE INDEX "GrowthIntelligenceReport_range_idx" ON "GrowthIntelligenceReport"("range");
