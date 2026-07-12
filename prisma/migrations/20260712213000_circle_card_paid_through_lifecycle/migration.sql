-- Add nullable lifecycle evidence only. Historical paid-through truth is not inferred
-- or backfilled, and the existing application can safely ignore these columns until
-- the corresponding application release starts.
ALTER TABLE "CircleCardSubscription"
    ADD COLUMN "accessEndsAt" TIMESTAMP(3),
    ADD COLUMN "lastPaidPeriodStart" TIMESTAMP(3),
    ADD COLUMN "lastPaidPeriodEnd" TIMESTAMP(3),
    ADD COLUMN "lastPaidInvoiceId" TEXT,
    ADD COLUMN "paymentFailedAt" TIMESTAMP(3),
    ADD COLUMN "recoveryGraceEndsAt" TIMESTAMP(3),
    ADD COLUMN "paymentFailureInvoiceId" TEXT,
    ADD COLUMN "paymentFailurePeriodStart" TIMESTAMP(3),
    ADD COLUMN "paymentFailurePeriodEnd" TIMESTAMP(3),
    ADD COLUMN "lastStripeEventCreatedAt" TIMESTAMP(3),
    ADD COLUMN "lastStripeEventId" TEXT,
    ADD COLUMN "lastPaymentEventCreatedAt" TIMESTAMP(3),
    ADD COLUMN "lastPaymentEventId" TEXT,
    ADD COLUMN "latestCheckoutSessionId" TEXT,
    ADD COLUMN "checkoutSessionExpiresAt" TIMESTAMP(3),
    ADD COLUMN "checkoutStartedAt" TIMESTAMP(3),
    ADD COLUMN "checkoutAttemptId" TEXT,
    ADD COLUMN "cancellationEffectiveAt" TIMESTAMP(3),
    ADD COLUMN "recoveredAt" TIMESTAMP(3),
    ADD COLUMN "reconciliationRequiredAt" TIMESTAMP(3),
    ADD COLUMN "reconciliationReason" VARCHAR(240);

ALTER TABLE "CircleCard"
    ADD COLUMN "studioDraftMetadata" JSONB,
    ADD COLUMN "studioDraftUpdatedAt" TIMESTAMP(3),
    ADD COLUMN "studioPreviousActiveMetadata" JSONB,
    ADD COLUMN "studioPreviousActiveAt" TIMESTAMP(3);

-- PostgreSQL unique indexes permit multiple NULL values, preserving existing rows
-- while preventing duplicate persisted payment/session evidence once populated.
CREATE UNIQUE INDEX "CircleCardSubscription_lastPaidInvoiceId_key"
    ON "CircleCardSubscription"("lastPaidInvoiceId");

CREATE UNIQUE INDEX "CircleCardSubscription_latestCheckoutSessionId_key"
    ON "CircleCardSubscription"("latestCheckoutSessionId");

CREATE INDEX "CircleCardSubscription_accessEndsAt_idx"
    ON "CircleCardSubscription"("accessEndsAt");

CREATE INDEX "CircleCardSubscription_recoveryGraceEndsAt_idx"
    ON "CircleCardSubscription"("recoveryGraceEndsAt");

CREATE INDEX "CircleCardSubscription_checkoutSessionExpiresAt_idx"
    ON "CircleCardSubscription"("checkoutSessionExpiresAt");

CREATE INDEX "CircleCardSubscription_lastStripeEventCreatedAt_idx"
    ON "CircleCardSubscription"("lastStripeEventCreatedAt");

CREATE INDEX "CircleCardSubscription_lastPaymentEventCreatedAt_idx"
    ON "CircleCardSubscription"("lastPaymentEventCreatedAt");

CREATE INDEX "CircleCardSubscription_reconciliationRequiredAt_idx"
    ON "CircleCardSubscription"("reconciliationRequiredAt");

CREATE INDEX "CircleCardSubscription_status_accessEndsAt_idx"
    ON "CircleCardSubscription"("status", "accessEndsAt");

CREATE INDEX "CircleCard_studioDraftUpdatedAt_idx"
    ON "CircleCard"("studioDraftUpdatedAt");

-- Rollback consideration: all additions are nullable and contain lifecycle evidence.
-- A rollback should leave the columns in place until the application no longer reads
-- them; dropping them immediately could discard newly recorded payment history.
