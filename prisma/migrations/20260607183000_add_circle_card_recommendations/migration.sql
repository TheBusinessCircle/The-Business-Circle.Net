CREATE TYPE "CircleCardRecommendationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

CREATE TYPE "CircleCardRecommendationStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'REMOVED');

ALTER TYPE "CircleCardEventType" ADD VALUE 'RECOMMENDATION_CREATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'RECOMMENDATION_UPDATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'RECOMMENDATION_REMOVED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'PUBLIC_RECOMMENDATION_VIEWED';

CREATE TABLE "CircleCardRecommendation" (
  "id" TEXT NOT NULL,
  "recommenderUserId" TEXT NOT NULL,
  "recommenderCardId" TEXT NOT NULL,
  "recommendedCardId" TEXT,
  "recommendedUserId" TEXT,
  "walletContactId" TEXT,
  "category" VARCHAR(80) NOT NULL,
  "reason" VARCHAR(360),
  "visibility" "CircleCardRecommendationVisibility" NOT NULL DEFAULT 'PRIVATE',
  "status" "CircleCardRecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CircleCardRecommendation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CircleCardRecommendation"
  ADD CONSTRAINT "CircleCardRecommendation_recommenderUserId_fkey"
  FOREIGN KEY ("recommenderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardRecommendation"
  ADD CONSTRAINT "CircleCardRecommendation_recommendedUserId_fkey"
  FOREIGN KEY ("recommendedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CircleCardRecommendation"
  ADD CONSTRAINT "CircleCardRecommendation_recommenderCardId_fkey"
  FOREIGN KEY ("recommenderCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardRecommendation"
  ADD CONSTRAINT "CircleCardRecommendation_recommendedCardId_fkey"
  FOREIGN KEY ("recommendedCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardRecommendation"
  ADD CONSTRAINT "CircleCardRecommendation_walletContactId_fkey"
  FOREIGN KEY ("walletContactId") REFERENCES "CircleWalletContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CircleCardRecommendation_recommenderUserId_idx" ON "CircleCardRecommendation"("recommenderUserId");
CREATE INDEX "CircleCardRecommendation_recommenderCardId_idx" ON "CircleCardRecommendation"("recommenderCardId");
CREATE INDEX "CircleCardRecommendation_recommendedCardId_idx" ON "CircleCardRecommendation"("recommendedCardId");
CREATE INDEX "CircleCardRecommendation_category_idx" ON "CircleCardRecommendation"("category");
CREATE INDEX "CircleCardRecommendation_visibility_idx" ON "CircleCardRecommendation"("visibility");
CREATE INDEX "CircleCardRecommendation_status_idx" ON "CircleCardRecommendation"("status");
CREATE INDEX "CircleCardRecommendation_createdAt_idx" ON "CircleCardRecommendation"("createdAt");
CREATE INDEX "CircleCardRecommendation_walletContactId_idx" ON "CircleCardRecommendation"("walletContactId");
CREATE INDEX "CircleCardRecommendation_recommendedCardId_visibility_status_createdAt_idx" ON "CircleCardRecommendation"("recommendedCardId", "visibility", "status", "createdAt");
CREATE INDEX "CircleCardRecommendation_recommenderCardId_recommendedCardId_category_visibility_status_idx" ON "CircleCardRecommendation"("recommenderCardId", "recommendedCardId", "category", "visibility", "status");
