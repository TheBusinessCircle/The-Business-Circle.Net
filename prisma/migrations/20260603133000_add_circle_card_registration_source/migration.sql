ALTER TABLE "User" ADD COLUMN "registrationSource" TEXT;

CREATE INDEX "User_registrationSource_idx" ON "User"("registrationSource");
