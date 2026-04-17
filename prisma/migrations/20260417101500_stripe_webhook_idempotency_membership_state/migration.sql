CREATE TYPE "SubscriptionBillingVariant" AS ENUM ('STANDARD', 'FOUNDING');

CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

ALTER TABLE "Subscription"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "billingInterval" "BillingInterval",
ADD COLUMN "billingVariant" "SubscriptionBillingVariant",
ADD COLUMN "lastInvoicePaidAt" TIMESTAMP(3),
ADD COLUMN "lastInvoiceFailedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_stripeCheckoutSessionId_key"
ON "Subscription"("stripeCheckoutSessionId");

CREATE INDEX "Subscription_billingInterval_billingVariant_idx"
ON "Subscription"("billingInterval", "billingVariant");

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
  "processingStartedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeWebhookEvent_status_updatedAt_idx"
ON "StripeWebhookEvent"("status", "updatedAt");

CREATE INDEX "StripeWebhookEvent_type_createdAt_idx"
ON "StripeWebhookEvent"("type", "createdAt");
