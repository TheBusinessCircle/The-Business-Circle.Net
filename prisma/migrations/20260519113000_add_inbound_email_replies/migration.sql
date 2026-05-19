ALTER TABLE "InboundEmail"
ADD COLUMN "lastReplyTo" TEXT,
ADD COLUMN "lastReplySubject" TEXT,
ADD COLUMN "lastReplyBody" TEXT,
ADD COLUMN "lastRepliedAt" TIMESTAMP(3),
ADD COLUMN "lastReplyError" TEXT;

CREATE INDEX "InboundEmail_lastRepliedAt_idx" ON "InboundEmail"("lastRepliedAt");
