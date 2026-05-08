-- CreateEnum
CREATE TYPE "TestimonialSourceType" AS ENUM ('MEMBER_PROFILE', 'EXTERNAL_REQUEST', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "TestimonialProofType" AS ENUM ('BCN_MEMBER', 'GROWTH_ARCHITECT', 'GENERAL');

-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "sourceType" "TestimonialSourceType" NOT NULL,
    "proofType" "TestimonialProofType" NOT NULL,
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "memberId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "businessName" TEXT,
    "businessWebsite" TEXT,
    "quote" TEXT NOT NULL,
    "outcome" TEXT,
    "rating" INTEGER,
    "permissionToDisplay" BOOLEAN NOT NULL,
    "displayPublicName" BOOLEAN NOT NULL DEFAULT true,
    "displayBusinessName" BOOLEAN NOT NULL DEFAULT true,
    "displayProfileImage" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "adminNotes" TEXT,
    "submittedEmail" TEXT,
    "requestToken" TEXT,
    "requestedByAdminId" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Testimonial_rating_range" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_requestToken_key" ON "Testimonial"("requestToken");

-- CreateIndex
CREATE INDEX "Testimonial_proofType_status_createdAt_idx" ON "Testimonial"("proofType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_status_createdAt_idx" ON "Testimonial"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_sourceType_createdAt_idx" ON "Testimonial"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_memberId_createdAt_idx" ON "Testimonial"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_approvedByAdminId_approvedAt_idx" ON "Testimonial"("approvedByAdminId", "approvedAt");

-- CreateIndex
CREATE INDEX "Testimonial_requestedByAdminId_createdAt_idx" ON "Testimonial"("requestedByAdminId", "createdAt");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_requestedByAdminId_fkey" FOREIGN KEY ("requestedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
