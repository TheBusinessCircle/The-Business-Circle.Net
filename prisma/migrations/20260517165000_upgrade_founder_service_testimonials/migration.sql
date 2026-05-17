ALTER TYPE "FounderServiceStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "FounderServiceStatus" ADD VALUE IF NOT EXISTS 'TESTIMONIAL_REQUESTED';
ALTER TYPE "FounderServiceStatus" ADD VALUE IF NOT EXISTS 'TESTIMONIAL_RECEIVED';
ALTER TYPE "FounderServiceStatus" ADD VALUE IF NOT EXISTS 'TESTIMONIAL_APPROVED';
ALTER TYPE "FounderServiceStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "FounderServiceRequest"
ADD COLUMN IF NOT EXISTS "cleanCheckoutPath" TEXT,
ADD COLUMN IF NOT EXISTS "testimonialId" TEXT,
ADD COLUMN IF NOT EXISTS "testimonialRequestSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "testimonialSubmittedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "testimonialApprovedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "FounderServiceRequest_testimonialId_key" ON "FounderServiceRequest"("testimonialId");
CREATE INDEX IF NOT EXISTS "FounderServiceRequest_testimonialRequestSentAt_idx" ON "FounderServiceRequest"("testimonialRequestSentAt");
CREATE INDEX IF NOT EXISTS "FounderServiceRequest_testimonialSubmittedAt_idx" ON "FounderServiceRequest"("testimonialSubmittedAt");

ALTER TABLE "FounderServiceRequest"
ADD CONSTRAINT "FounderServiceRequest_testimonialId_fkey"
FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
