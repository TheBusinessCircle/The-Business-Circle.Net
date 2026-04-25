ALTER TABLE "User"
ADD COLUMN "acceptedTermsAt" TIMESTAMP(3),
ADD COLUMN "acceptedRulesAt" TIMESTAMP(3),
ADD COLUMN "acceptedTermsVersion" TEXT,
ADD COLUMN "acceptedRulesVersion" TEXT;

ALTER TABLE "PendingRegistration"
ADD COLUMN "acceptedTermsAt" TIMESTAMP(3),
ADD COLUMN "acceptedRulesAt" TIMESTAMP(3),
ADD COLUMN "acceptedTermsVersion" TEXT,
ADD COLUMN "acceptedRulesVersion" TEXT;
