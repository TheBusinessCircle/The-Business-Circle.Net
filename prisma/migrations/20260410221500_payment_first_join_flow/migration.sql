CREATE TYPE "PendingRegistrationStatus" AS ENUM (
  'PENDING',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED'
);

CREATE TYPE "PendingRegistrationBillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

ALTER TABLE "FoundingOfferReservation"
ADD COLUMN "pendingRegistrationId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

CREATE TABLE "PendingRegistration" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "selectedTier" "MembershipTier" NOT NULL,
  "billingInterval" "PendingRegistrationBillingInterval" NOT NULL,
  "businessName" TEXT,
  "businessStatus" "BusinessStatus",
  "businessStage" "BusinessStage",
  "companyNumber" TEXT,
  "coreAccessConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "inviteCode" TEXT,
  "status" "PendingRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "stripeCheckoutSessionId" TEXT,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "completedUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistration_stripeCheckoutSessionId_key"
ON "PendingRegistration"("stripeCheckoutSessionId");

CREATE UNIQUE INDEX "PendingRegistration_stripeSubscriptionId_key"
ON "PendingRegistration"("stripeSubscriptionId");

CREATE UNIQUE INDEX "PendingRegistration_completedUserId_key"
ON "PendingRegistration"("completedUserId");

CREATE INDEX "PendingRegistration_email_createdAt_idx"
ON "PendingRegistration"("email", "createdAt");

CREATE INDEX "PendingRegistration_status_expiresAt_idx"
ON "PendingRegistration"("status", "expiresAt");

CREATE INDEX "PendingRegistration_stripeCustomerId_idx"
ON "PendingRegistration"("stripeCustomerId");

CREATE INDEX "FoundingOfferReservation_pendingRegistrationId_status_expir_idx"
ON "FoundingOfferReservation"("pendingRegistrationId", "status", "expiresAt");

ALTER TABLE "PendingRegistration"
ADD CONSTRAINT "PendingRegistration_completedUserId_fkey"
FOREIGN KEY ("completedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FoundingOfferReservation"
ADD CONSTRAINT "FoundingOfferReservation_pendingRegistrationId_fkey"
FOREIGN KEY ("pendingRegistrationId") REFERENCES "PendingRegistration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
