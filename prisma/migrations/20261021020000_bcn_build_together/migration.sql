-- CreateTable
CREATE TABLE "BcnIdeaRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "stage" VARCHAR(24) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "idea" VARCHAR(2000) NOT NULL,
    "helpNeeded" VARCHAR(2000) NOT NULL,
    "nextMilestone" VARCHAR(500) NOT NULL,
    "location" VARCHAR(160) NOT NULL,
    "supportTypes" TEXT[],
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "publicConsentAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcnIdeaRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnIdeaOffer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "scope" VARCHAR(2000) NOT NULL,
    "timing" VARCHAR(300) NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "usualPricePence" INTEGER,
    "priceTerms" VARCHAR(500) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcnIdeaOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnIdeaReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "offerId" TEXT,
    "detail" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BcnIdeaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcnIdeaAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "offerId" TEXT,
    "action" VARCHAR(40) NOT NULL,
    "note" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BcnIdeaAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BcnIdeaRequest_status_expiresAt_createdAt_idx" ON "BcnIdeaRequest"("status", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "BcnIdeaRequest_ownerId_status_idx" ON "BcnIdeaRequest"("ownerId", "status");

-- CreateIndex
CREATE INDEX "BcnIdeaOffer_status_createdAt_idx" ON "BcnIdeaOffer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BcnIdeaOffer_helperId_status_idx" ON "BcnIdeaOffer"("helperId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BcnIdeaOffer_requestId_helperId_key" ON "BcnIdeaOffer"("requestId", "helperId");

-- CreateIndex
CREATE INDEX "BcnIdeaReport_status_createdAt_idx" ON "BcnIdeaReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BcnIdeaAudit_requestId_createdAt_idx" ON "BcnIdeaAudit"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "BcnIdeaOffer" ADD CONSTRAINT "BcnIdeaOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BcnIdeaRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnIdeaReport" ADD CONSTRAINT "BcnIdeaReport_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BcnIdeaRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnIdeaReport" ADD CONSTRAINT "BcnIdeaReport_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "BcnIdeaOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnIdeaAudit" ADD CONSTRAINT "BcnIdeaAudit_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BcnIdeaRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcnIdeaAudit" ADD CONSTRAINT "BcnIdeaAudit_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "BcnIdeaOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Guard the public help workflow even when a future writer does not use the API schema.
ALTER TABLE "BcnIdeaRequest" ADD CONSTRAINT "BcnIdeaRequest_status_check"
CHECK ("status" IN ('PENDING','APPROVED','MATCHED','COMPLETED','CLOSED','REJECTED'));
ALTER TABLE "BcnIdeaRequest" ADD CONSTRAINT "BcnIdeaRequest_stage_check"
CHECK ("stage" IN ('IDEA','VALIDATING','LAUNCHING','RUNNING','GROWING'));
ALTER TABLE "BcnIdeaRequest" ADD CONSTRAINT "BcnIdeaRequest_support_check"
CHECK ("supportTypes" IS NOT NULL AND cardinality("supportTypes") BETWEEN 1 AND 4 AND "supportTypes" <@ ARRAY['FREE','DISCOUNTED','PAID','SKILL_SWAP']::TEXT[]);
ALTER TABLE "BcnIdeaOffer" ADD CONSTRAINT "BcnIdeaOffer_status_check"
CHECK ("status" IN ('PENDING','APPROVED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED'));
ALTER TABLE "BcnIdeaOffer" ADD CONSTRAINT "BcnIdeaOffer_price_check"
CHECK (
  "pricePence" BETWEEN 0 AND 10000000 AND
  (("kind" IN ('FREE','SKILL_SWAP') AND "pricePence" = 0 AND "usualPricePence" IS NULL)
   OR ("kind" = 'PAID' AND "pricePence" > 0 AND "usualPricePence" IS NULL)
   OR ("kind" = 'DISCOUNTED' AND "pricePence" > 0 AND "usualPricePence" IS NOT NULL AND "usualPricePence" > "pricePence" AND "usualPricePence" <= 10000000))
);
ALTER TABLE "BcnIdeaReport" ADD CONSTRAINT "BcnIdeaReport_status_check"
CHECK ("status" IN ('OPEN','RESOLVED'));
