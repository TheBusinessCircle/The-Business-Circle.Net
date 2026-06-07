CREATE TYPE "CircleCardConnectionRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

ALTER TYPE "CircleCardEventType" ADD VALUE 'CONNECTION_REQUEST_SENT';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CONNECTION_REQUEST_ACCEPTED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CONNECTION_REQUEST_DECLINED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'CONNECTION_REQUEST_CANCELLED';

CREATE TABLE "CircleCardConnectionRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requesterCardId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "recipientCardId" TEXT NOT NULL,
  "status" "CircleCardConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "CircleCardConnectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleCardConnectionRequest_requesterId_idx" ON "CircleCardConnectionRequest"("requesterId");
CREATE INDEX "CircleCardConnectionRequest_recipientId_idx" ON "CircleCardConnectionRequest"("recipientId");
CREATE INDEX "CircleCardConnectionRequest_requesterCardId_idx" ON "CircleCardConnectionRequest"("requesterCardId");
CREATE INDEX "CircleCardConnectionRequest_recipientCardId_idx" ON "CircleCardConnectionRequest"("recipientCardId");
CREATE INDEX "CircleCardConnectionRequest_status_idx" ON "CircleCardConnectionRequest"("status");
CREATE INDEX "CircleCardConnectionRequest_createdAt_idx" ON "CircleCardConnectionRequest"("createdAt");

CREATE UNIQUE INDEX "CircleCardConnectionRequest_pending_card_pair_key"
  ON "CircleCardConnectionRequest" (LEAST("requesterCardId", "recipientCardId"), GREATEST("requesterCardId", "recipientCardId"))
  WHERE "status" = 'PENDING';

ALTER TABLE "CircleCardConnectionRequest"
  ADD CONSTRAINT "CircleCardConnectionRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardConnectionRequest"
  ADD CONSTRAINT "CircleCardConnectionRequest_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardConnectionRequest"
  ADD CONSTRAINT "CircleCardConnectionRequest_requesterCardId_fkey"
  FOREIGN KEY ("requesterCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleCardConnectionRequest"
  ADD CONSTRAINT "CircleCardConnectionRequest_recipientCardId_fkey"
  FOREIGN KEY ("recipientCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
