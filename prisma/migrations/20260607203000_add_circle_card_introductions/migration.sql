CREATE TYPE "CircleCardIntroductionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CircleCardIntroduction" (
  "id" TEXT NOT NULL,
  "introducerUserId" TEXT NOT NULL,
  "introducerCardId" TEXT NOT NULL,
  "personAUserId" TEXT NOT NULL,
  "personACardId" TEXT NOT NULL,
  "personBUserId" TEXT NOT NULL,
  "personBCardId" TEXT NOT NULL,
  "reason" VARCHAR(600) NOT NULL,
  "status" "CircleCardIntroductionStatus" NOT NULL DEFAULT 'PENDING',
  "personAAcceptedAt" TIMESTAMP(3),
  "personBAcceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "CircleCardIntroduction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_introducerUserId_fkey" FOREIGN KEY ("introducerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_introducerCardId_fkey" FOREIGN KEY ("introducerCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_personAUserId_fkey" FOREIGN KEY ("personAUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_personACardId_fkey" FOREIGN KEY ("personACardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_personBUserId_fkey" FOREIGN KEY ("personBUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleCardIntroduction" ADD CONSTRAINT "CircleCardIntroduction_personBCardId_fkey" FOREIGN KEY ("personBCardId") REFERENCES "CircleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CircleCardIntroduction_introducerUserId_idx" ON "CircleCardIntroduction"("introducerUserId");
CREATE INDEX "CircleCardIntroduction_introducerCardId_idx" ON "CircleCardIntroduction"("introducerCardId");
CREATE INDEX "CircleCardIntroduction_personAUserId_idx" ON "CircleCardIntroduction"("personAUserId");
CREATE INDEX "CircleCardIntroduction_personACardId_idx" ON "CircleCardIntroduction"("personACardId");
CREATE INDEX "CircleCardIntroduction_personBUserId_idx" ON "CircleCardIntroduction"("personBUserId");
CREATE INDEX "CircleCardIntroduction_personBCardId_idx" ON "CircleCardIntroduction"("personBCardId");
CREATE INDEX "CircleCardIntroduction_status_idx" ON "CircleCardIntroduction"("status");
CREATE INDEX "CircleCardIntroduction_createdAt_idx" ON "CircleCardIntroduction"("createdAt");
CREATE INDEX "CircleCardIntroduction_introducerUserId_status_createdAt_idx" ON "CircleCardIntroduction"("introducerUserId", "status", "createdAt");
CREATE INDEX "CircleCardIntroduction_personAUserId_status_createdAt_idx" ON "CircleCardIntroduction"("personAUserId", "status", "createdAt");
CREATE INDEX "CircleCardIntroduction_personBUserId_status_createdAt_idx" ON "CircleCardIntroduction"("personBUserId", "status", "createdAt");
CREATE INDEX "CircleCardIntroduction_introducerCardId_personACardId_personBCardId_status_idx" ON "CircleCardIntroduction"("introducerCardId", "personACardId", "personBCardId", "status");

ALTER TYPE "CircleCardEventType" ADD VALUE 'INTRODUCTION_CREATED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'INTRODUCTION_ACCEPTED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'INTRODUCTION_DECLINED';
ALTER TYPE "CircleCardEventType" ADD VALUE 'INTRODUCTION_COMPLETED';
