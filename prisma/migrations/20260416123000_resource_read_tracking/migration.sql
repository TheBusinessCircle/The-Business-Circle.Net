CREATE TABLE "ResourceRead" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResourceRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceRead_userId_resourceId_key" ON "ResourceRead"("userId", "resourceId");
CREATE INDEX "ResourceRead_userId_readAt_idx" ON "ResourceRead"("userId", "readAt");
CREATE INDEX "ResourceRead_resourceId_readAt_idx" ON "ResourceRead"("resourceId", "readAt");

ALTER TABLE "ResourceRead"
ADD CONSTRAINT "ResourceRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceRead"
ADD CONSTRAINT "ResourceRead_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
