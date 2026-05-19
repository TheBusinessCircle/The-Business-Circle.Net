-- CreateEnum
CREATE TYPE "FounderServiceEmailLogStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "FounderServiceEmailLog" (
    "id" TEXT NOT NULL,
    "founderServiceRequestId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "discountCode" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "status" "FounderServiceEmailLogStatus" NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderServiceEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FounderServiceEmailLog_founderServiceRequestId_createdAt_idx" ON "FounderServiceEmailLog"("founderServiceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceEmailLog_status_createdAt_idx" ON "FounderServiceEmailLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FounderServiceEmailLog_stripeCheckoutSessionId_idx" ON "FounderServiceEmailLog"("stripeCheckoutSessionId");

-- AddForeignKey
ALTER TABLE "FounderServiceEmailLog" ADD CONSTRAINT "FounderServiceEmailLog_founderServiceRequestId_fkey" FOREIGN KEY ("founderServiceRequestId") REFERENCES "FounderServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
