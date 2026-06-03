CREATE TABLE "CircleCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "role" TEXT,
    "tagline" TEXT,
    "about" TEXT,
    "profileImageUrl" TEXT,
    "websiteUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CircleWalletContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "favourite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleWalletContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleCard_slug_key" ON "CircleCard"("slug");
CREATE INDEX "CircleCard_userId_idx" ON "CircleCard"("userId");
CREATE INDEX "CircleCard_isPublished_idx" ON "CircleCard"("isPublished");

CREATE UNIQUE INDEX "CircleWalletContact_userId_cardId_key" ON "CircleWalletContact"("userId", "cardId");
CREATE INDEX "CircleWalletContact_userId_idx" ON "CircleWalletContact"("userId");
CREATE INDEX "CircleWalletContact_cardId_idx" ON "CircleWalletContact"("cardId");
CREATE INDEX "CircleWalletContact_savedAt_idx" ON "CircleWalletContact"("savedAt");

ALTER TABLE "CircleCard" ADD CONSTRAINT "CircleCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleWalletContact" ADD CONSTRAINT "CircleWalletContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleWalletContact" ADD CONSTRAINT "CircleWalletContact_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
