-- Persist server-controlled Circle Card grandfathered access.
CREATE TYPE "CircleCardAccessGrantSource" AS ENUM ('GRANDFATHERED');

CREATE TABLE "CircleCardAccessGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "CircleCardSubscriptionPlan" NOT NULL DEFAULT 'PRO',
    "source" "CircleCardAccessGrantSource" NOT NULL DEFAULT 'GRANDFATHERED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "note" VARCHAR(240),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircleCardAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleCardAccessGrant_userId_key" ON "CircleCardAccessGrant"("userId");
CREATE INDEX "CircleCardAccessGrant_source_active_idx" ON "CircleCardAccessGrant"("source", "active");
CREATE INDEX "CircleCardAccessGrant_plan_active_idx" ON "CircleCardAccessGrant"("plan", "active");
CREATE INDEX "CircleCardAccessGrant_endsAt_idx" ON "CircleCardAccessGrant"("endsAt");

ALTER TABLE "CircleCardAccessGrant" ADD CONSTRAINT "CircleCardAccessGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
