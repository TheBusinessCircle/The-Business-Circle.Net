CREATE TABLE "CircleCardCustomBuildOrder" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "cardId" TEXT NOT NULL REFERENCES "CircleCard"("id") ON DELETE RESTRICT,
  "customerId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL DEFAULT 4999 CHECK ("amountPence"=4999),
  "currency" TEXT NOT NULL DEFAULT 'gbp' CHECK ("currency"='gbp'),
  "checkoutSessionId" TEXT UNIQUE,
  "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
  "paymentIntentId" TEXT UNIQUE,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("paymentStatus" IN ('PENDING','PROCESSING','PAID','EXPIRED','FAILED','REFUNDED','DISPUTED')),
  "buildStatus" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT'
    CHECK ("buildStatus" IN ('AWAITING_PAYMENT','QUEUED','IN_PROGRESS','COMPLETE')),
  "brief" TEXT NOT NULL CHECK (char_length("brief") BETWEEN 20 AND 3000),
  "termsVersion" TEXT NOT NULL,
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleCardCustomBuildOrder_userId_cardId_key" UNIQUE ("userId","cardId")
);
CREATE INDEX "CircleCardCustomBuildOrder_queue_idx"
  ON "CircleCardCustomBuildOrder" ("paymentStatus","buildStatus","createdAt");
