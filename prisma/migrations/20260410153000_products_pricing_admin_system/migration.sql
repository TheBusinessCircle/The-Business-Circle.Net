CREATE TYPE "BillingProductCategory" AS ENUM ('MEMBERSHIP', 'SERVICE');

CREATE TYPE "BillingPriceBillingType" AS ENUM ('ONE_TIME', 'RECURRING');

CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

CREATE TYPE "BillingDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

CREATE TYPE "BillingDiscountAppliesTo" AS ENUM (
  'ALL_PRODUCTS',
  'MEMBERSHIPS',
  'SERVICES',
  'SPECIFIC_PRODUCT'
);

CREATE TYPE "BillingDiscountTag" AS ENUM (
  'LOCAL_OUTREACH',
  'MEMBER_DISCOUNT',
  'MANUAL'
);

CREATE TYPE "BillingSyncStatus" AS ENUM ('SYNCED', 'MISSING', 'ERROR');

CREATE TABLE "BillingProduct" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "BillingProductCategory" NOT NULL,
  "membershipTier" "MembershipTier",
  "founderServiceId" TEXT,
  "description" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "stripeProductId" TEXT,
  "syncStatus" "BillingSyncStatus" NOT NULL DEFAULT 'MISSING',
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPrice" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "billingType" "BillingPriceBillingType" NOT NULL,
  "interval" "BillingInterval",
  "isFounderPrice" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "stripePriceId" TEXT,
  "syncStatus" "BillingSyncStatus" NOT NULL DEFAULT 'MISSING',
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingDiscount" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "type" "BillingDiscountType" NOT NULL,
  "value" INTEGER NOT NULL,
  "appliesTo" "BillingDiscountAppliesTo" NOT NULL,
  "specificProductId" TEXT,
  "usageLimit" INTEGER,
  "timesUsed" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tag" "BillingDiscountTag" NOT NULL DEFAULT 'MANUAL',
  "stripeCouponId" TEXT,
  "stripePromotionCodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingDiscount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FounderSettings" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "founderLimit" INTEGER NOT NULL DEFAULT 50,
  "currentCount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FounderSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingProduct_slug_key" ON "BillingProduct"("slug");
CREATE UNIQUE INDEX "BillingProduct_membershipTier_key" ON "BillingProduct"("membershipTier");
CREATE UNIQUE INDEX "BillingProduct_founderServiceId_key" ON "BillingProduct"("founderServiceId");
CREATE UNIQUE INDEX "BillingProduct_stripeProductId_key" ON "BillingProduct"("stripeProductId");
CREATE UNIQUE INDEX "BillingPrice_stripePriceId_key" ON "BillingPrice"("stripePriceId");
CREATE UNIQUE INDEX "BillingDiscount_code_key" ON "BillingDiscount"("code");
CREATE UNIQUE INDEX "BillingDiscount_stripeCouponId_key" ON "BillingDiscount"("stripeCouponId");
CREATE UNIQUE INDEX "BillingDiscount_stripePromotionCodeId_key" ON "BillingDiscount"("stripePromotionCodeId");
CREATE UNIQUE INDEX "FounderSettings_productId_key" ON "FounderSettings"("productId");

CREATE INDEX "BillingProduct_category_active_createdAt_idx" ON "BillingProduct"("category", "active", "createdAt");
CREATE INDEX "BillingProduct_active_createdAt_idx" ON "BillingProduct"("active", "createdAt");
CREATE INDEX "BillingPrice_productId_active_createdAt_idx" ON "BillingPrice"("productId", "active", "createdAt");
CREATE INDEX "BillingPrice_productId_name_createdAt_idx" ON "BillingPrice"("productId", "name", "createdAt");
CREATE INDEX "BillingPrice_productId_interval_isFounderPrice_active_idx" ON "BillingPrice"("productId", "interval", "isFounderPrice", "active");
CREATE INDEX "BillingDiscount_active_appliesTo_createdAt_idx" ON "BillingDiscount"("active", "appliesTo", "createdAt");
CREATE INDEX "BillingDiscount_expiresAt_idx" ON "BillingDiscount"("expiresAt");

ALTER TABLE "BillingProduct"
ADD CONSTRAINT "BillingProduct_founderServiceId_fkey"
FOREIGN KEY ("founderServiceId") REFERENCES "FounderService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingPrice"
ADD CONSTRAINT "BillingPrice_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "BillingProduct"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingDiscount"
ADD CONSTRAINT "BillingDiscount_specificProductId_fkey"
FOREIGN KEY ("specificProductId") REFERENCES "BillingProduct"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FounderSettings"
ADD CONSTRAINT "FounderSettings_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "BillingProduct"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
