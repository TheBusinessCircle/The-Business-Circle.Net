ALTER TYPE "TestimonialSourceType" ADD VALUE IF NOT EXISTS 'MEMBER';
ALTER TYPE "TestimonialSourceType" ADD VALUE IF NOT EXISTS 'NON_MEMBER';
ALTER TYPE "TestimonialSourceType" ADD VALUE IF NOT EXISTS 'AUDIT_CLIENT';

ALTER TABLE "Testimonial"
  ADD COLUMN "recipientEmail" TEXT,
  ADD COLUMN "recipientName" TEXT,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "roleTitle" TEXT,
  ADD COLUMN "requestContext" TEXT,
  ADD COLUMN "auditBusinessName" TEXT,
  ADD COLUMN "isExternalRequest" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowDisplayName" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowDisplayCompany" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowDisplayRole" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowDisplayTestimonial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowMarketingUse" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "requestExpiresAt" TIMESTAMP(3);

UPDATE "Testimonial"
SET
  "recipientEmail" = COALESCE("submittedEmail", "submittedByEmail"),
  "recipientName" = COALESCE("submittedByName", "authorName"),
  "companyName" = COALESCE("submittedByCompany", "businessName"),
  "roleTitle" = COALESCE("submittedByRole", "authorRole"),
  "requestContext" = "adminNotes",
  "isExternalRequest" = CASE WHEN "sourceType" = 'EXTERNAL_REQUEST' THEN true ELSE false END,
  "allowDisplayName" = "permissionToUseName",
  "allowDisplayCompany" = "permissionToUseCompany",
  "allowDisplayRole" = "permissionToUseName",
  "allowDisplayTestimonial" = "permissionToFeaturePublicly",
  "allowMarketingUse" = "permissionToUseInMarketing",
  "submittedAt" = CASE WHEN length(trim("quote")) > 0 THEN "updatedAt" ELSE NULL END,
  "completedAt" = CASE WHEN length(trim("quote")) > 0 THEN "updatedAt" ELSE NULL END;

CREATE INDEX "Testimonial_isExternalRequest_createdAt_idx" ON "Testimonial"("isExternalRequest", "createdAt");
CREATE INDEX "Testimonial_requestExpiresAt_idx" ON "Testimonial"("requestExpiresAt");
