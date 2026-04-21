ALTER TABLE "User"
ADD COLUMN "verificationEmailLastSentAt" TIMESTAMP(3),
ADD COLUMN "verificationEmailSendCount" INTEGER NOT NULL DEFAULT 0;
