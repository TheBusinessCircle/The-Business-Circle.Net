CREATE TYPE "CircleCardEventType" AS ENUM (
    'CARD_VIEW',
    'QR_VIEW',
    'VCARD_DOWNLOAD',
    'SHARE',
    'WEBSITE_CLICK',
    'EMAIL_CLICK',
    'PHONE_CLICK',
    'WALLET_SAVE',
    'WALLET_REMOVE'
);

CREATE TABLE "CircleCardEvent" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "eventType" "CircleCardEventType" NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleCardEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleCardEvent_cardId_eventType_createdAt_idx" ON "CircleCardEvent"("cardId", "eventType", "createdAt");
CREATE INDEX "CircleCardEvent_cardId_createdAt_idx" ON "CircleCardEvent"("cardId", "createdAt");
CREATE INDEX "CircleCardEvent_eventType_createdAt_idx" ON "CircleCardEvent"("eventType", "createdAt");
CREATE INDEX "CircleCardEvent_visitorId_createdAt_idx" ON "CircleCardEvent"("visitorId", "createdAt");
CREATE INDEX "CircleCardEvent_userId_createdAt_idx" ON "CircleCardEvent"("userId", "createdAt");

ALTER TABLE "CircleCardEvent" ADD CONSTRAINT "CircleCardEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardEvent" ADD CONSTRAINT "CircleCardEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
