CREATE TYPE "TestimonialCategory" AS ENUM (
  'BCN_EXPERIENCE',
  'GROWTH_ARCHITECT',
  'FOUNDER_AUDIT',
  'STRATEGY_CALL',
  'COLLABORATION',
  'COMMUNITY',
  'OTHER'
);

CREATE TYPE "TestimonialDisplayLocation" AS ENUM (
  'BCN_HOME',
  'FOUNDER_PAGE',
  'AUDIT_PAGE',
  'MEMBERSHIP_PAGE',
  'ANYWHERE'
);

CREATE TYPE "TestimonialSource" AS ENUM (
  'MEMBER_PROFILE',
  'MEMBER_DASHBOARD',
  'PUBLIC_FORM',
  'ADMIN_CREATED',
  'EMAIL_REQUEST'
);

ALTER TABLE "Testimonial"
  ADD COLUMN "category" "TestimonialCategory" NOT NULL DEFAULT 'BCN_EXPERIENCE',
  ADD COLUMN "displayLocation" "TestimonialDisplayLocation" NOT NULL DEFAULT 'ANYWHERE',
  ADD COLUMN "submittedByUserId" TEXT,
  ADD COLUMN "submittedByEmail" TEXT,
  ADD COLUMN "submittedByName" TEXT,
  ADD COLUMN "submittedByCompany" TEXT,
  ADD COLUMN "submittedByRole" TEXT,
  ADD COLUMN "submittedByWebsite" TEXT,
  ADD COLUMN "submittedByLinkedIn" TEXT,
  ADD COLUMN "profileImageUrl" TEXT,
  ADD COLUMN "testimonialText" TEXT,
  ADD COLUMN "permissionToFeaturePublicly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "permissionToUseName" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "permissionToUseCompany" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "permissionToUseImage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "permissionToUseInMarketing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approvedByUserId" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "source" "TestimonialSource" NOT NULL DEFAULT 'MEMBER_PROFILE',
  ADD COLUMN "copiedToGoogleAt" TIMESTAMP(3),
  ADD COLUMN "googleReviewIntentClickedAt" TIMESTAMP(3),
  ADD COLUMN "googleReviewCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "googleReviewConfirmedAt" TIMESTAMP(3);

UPDATE "Testimonial"
SET
  "category" = CASE
    WHEN "proofType" = 'GROWTH_ARCHITECT' THEN 'GROWTH_ARCHITECT'::"TestimonialCategory"
    WHEN "proofType" = 'BCN_MEMBER' THEN 'BCN_EXPERIENCE'::"TestimonialCategory"
    ELSE 'OTHER'::"TestimonialCategory"
  END,
  "displayLocation" = CASE
    WHEN "proofType" = 'GROWTH_ARCHITECT' THEN 'FOUNDER_PAGE'::"TestimonialDisplayLocation"
    WHEN "proofType" = 'BCN_MEMBER' THEN 'BCN_HOME'::"TestimonialDisplayLocation"
    ELSE 'ANYWHERE'::"TestimonialDisplayLocation"
  END,
  "submittedByUserId" = "memberId",
  "submittedByEmail" = COALESCE("submittedEmail", "submittedByEmail"),
  "submittedByName" = "authorName",
  "submittedByCompany" = "businessName",
  "submittedByRole" = "authorRole",
  "submittedByWebsite" = "businessWebsite",
  "profileImageUrl" = "imageUrl",
  "testimonialText" = "quote",
  "permissionToFeaturePublicly" = "permissionToDisplay",
  "permissionToUseName" = "displayPublicName",
  "permissionToUseCompany" = "displayBusinessName",
  "permissionToUseImage" = "displayProfileImage",
  "approvedByUserId" = "approvedByAdminId",
  "rejectedAt" = CASE WHEN "status" = 'REJECTED' THEN "updatedAt" ELSE NULL END,
  "source" = CASE
    WHEN "sourceType" = 'EXTERNAL_REQUEST' THEN 'EMAIL_REQUEST'::"TestimonialSource"
    WHEN "sourceType" = 'ADMIN_CREATED' THEN 'ADMIN_CREATED'::"TestimonialSource"
    ELSE 'MEMBER_PROFILE'::"TestimonialSource"
  END;

CREATE TABLE "SiteReviewSettings" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "googleReviewUrl" TEXT,
  "googleReviewEnabled" BOOLEAN NOT NULL DEFAULT false,
  "showGoogleReviewButton" BOOLEAN NOT NULL DEFAULT false,
  "googleReviewButtonLabel" TEXT NOT NULL DEFAULT 'Leave a Google review',
  "googleReviewPendingMessage" TEXT NOT NULL DEFAULT 'Google review link coming soon',
  "internalTestimonialsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "publicTestimonialFormEnabled" BOOLEAN NOT NULL DEFAULT true,
  "requireAdminApproval" BOOLEAN NOT NULL DEFAULT true,
  "homepageTestimonialsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "founderPageTestimonialsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "auditPageTestimonialsEnabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SiteReviewSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Testimonial_category_status_createdAt_idx" ON "Testimonial"("category", "status", "createdAt");
CREATE INDEX "Testimonial_displayLocation_status_createdAt_idx" ON "Testimonial"("displayLocation", "status", "createdAt");
CREATE INDEX "Testimonial_source_createdAt_idx" ON "Testimonial"("source", "createdAt");
CREATE INDEX "Testimonial_submittedByUserId_createdAt_idx" ON "Testimonial"("submittedByUserId", "createdAt");
CREATE INDEX "Testimonial_approvedByUserId_approvedAt_idx" ON "Testimonial"("approvedByUserId", "approvedAt");
CREATE INDEX "Testimonial_isHighlighted_status_createdAt_idx" ON "Testimonial"("isHighlighted", "status", "createdAt");

ALTER TABLE "Testimonial"
  ADD CONSTRAINT "Testimonial_submittedByUserId_fkey"
  FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Testimonial"
  ADD CONSTRAINT "Testimonial_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
