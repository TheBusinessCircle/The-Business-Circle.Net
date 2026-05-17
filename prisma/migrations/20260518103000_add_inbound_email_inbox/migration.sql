CREATE TYPE "InboundEmailStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "resendEmailId" TEXT NOT NULL,
    "messageId" TEXT,
    "from" TEXT NOT NULL,
    "to" JSONB NOT NULL,
    "cc" JSONB,
    "bcc" JSONB,
    "subject" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "snippet" TEXT,
    "attachments" JSONB,
    "status" "InboundEmailStatus" NOT NULL DEFAULT 'UNREAD',
    "forwardedTo" TEXT,
    "forwardedAt" TIMESTAMP(3),
    "forwardError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundEmail_resendEmailId_key" ON "InboundEmail"("resendEmailId");
CREATE INDEX "InboundEmail_status_receivedAt_idx" ON "InboundEmail"("status", "receivedAt");
CREATE INDEX "InboundEmail_receivedAt_idx" ON "InboundEmail"("receivedAt");
CREATE INDEX "InboundEmail_from_idx" ON "InboundEmail"("from");
