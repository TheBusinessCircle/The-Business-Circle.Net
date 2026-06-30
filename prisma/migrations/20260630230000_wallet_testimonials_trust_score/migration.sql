CREATE TYPE "CircleCardWalletTestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "CircleCardWalletTestimonialRelationship" AS ENUM (
  'WORKED_WITH',
  'BOUGHT_FROM',
  'MET_AT_EVENT',
  'COLLABORATED',
  'OTHER'
);

CREATE TABLE "CircleCardWalletTestimonial" (
  "id" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "reviewerCardId" TEXT,
  "reviewerName" VARCHAR(120) NOT NULL,
  "reviewerRoleOrCompany" VARCHAR(160),
  "targetCardId" TEXT NOT NULL,
  "targetOwnerId" TEXT NOT NULL,
  "walletContactId" TEXT,
  "testimonialText" TEXT NOT NULL,
  "rating" INTEGER,
  "relationship" "CircleCardWalletTestimonialRelationship",
  "status" "CircleCardWalletTestimonialStatus" NOT NULL DEFAULT 'PENDING',
  "walletVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleCardWalletTestimonial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CircleCardWalletTestimonial_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5)
);

ALTER TABLE "CircleCardWalletTestimonial"
  ADD CONSTRAINT "CircleCardWalletTestimonial_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CircleCardWalletTestimonial_reviewerCardId_fkey"
  FOREIGN KEY ("reviewerCardId") REFERENCES "CircleCard"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CircleCardWalletTestimonial_targetCardId_fkey"
  FOREIGN KEY ("targetCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CircleCardWalletTestimonial_targetOwnerId_fkey"
  FOREIGN KEY ("targetOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CircleCardWalletTestimonial_walletContactId_fkey"
  FOREIGN KEY ("walletContactId") REFERENCES "CircleWalletContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CircleCardWalletTestimonial_reviewerUserId_idx"
  ON "CircleCardWalletTestimonial"("reviewerUserId");
CREATE INDEX "CircleCardWalletTestimonial_reviewerCardId_idx"
  ON "CircleCardWalletTestimonial"("reviewerCardId");
CREATE INDEX "CircleCardWalletTestimonial_targetCardId_status_createdAt_idx"
  ON "CircleCardWalletTestimonial"("targetCardId", "status", "createdAt");
CREATE INDEX "CircleCardWalletTestimonial_targetOwnerId_status_createdAt_idx"
  ON "CircleCardWalletTestimonial"("targetOwnerId", "status", "createdAt");
CREATE INDEX "CircleCardWalletTestimonial_walletContactId_idx"
  ON "CircleCardWalletTestimonial"("walletContactId");
CREATE INDEX "CircleCardWalletTestimonial_status_idx"
  ON "CircleCardWalletTestimonial"("status");

CREATE UNIQUE INDEX "CircleCardWalletTestimonial_one_pending_per_reviewer_target"
  ON "CircleCardWalletTestimonial"("reviewerUserId", "targetCardId")
  WHERE "status" = 'PENDING';
