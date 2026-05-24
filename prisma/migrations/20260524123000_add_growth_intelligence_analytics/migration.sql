-- First-party operational analytics for the private Growth Intelligence admin dashboard.
-- This intentionally stores anonymous visitor/session identifiers and avoids raw IP addresses.

CREATE TABLE "SiteVisitor" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "entryPath" TEXT NOT NULL,
    "exitPath" TEXT,
    "referrer" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitePageView" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrer" TEXT,
    "searchParams" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitePageView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "eventName" TEXT NOT NULL,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FounderAuditSubmission" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "score" INTEGER NOT NULL,
    "resultType" TEXT NOT NULL,
    "recommendedTier" TEXT,
    "answers" JSONB NOT NULL,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "sourcePath" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderAuditSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteVisitor_anonymousId_key" ON "SiteVisitor"("anonymousId");
CREATE INDEX "SiteVisitor_userId_idx" ON "SiteVisitor"("userId");
CREATE INDEX "SiteVisitor_createdAt_idx" ON "SiteVisitor"("createdAt");
CREATE INDEX "SiteVisitor_lastSeenAt_idx" ON "SiteVisitor"("lastSeenAt");

CREATE INDEX "SiteSession_visitorId_idx" ON "SiteSession"("visitorId");
CREATE INDEX "SiteSession_startedAt_idx" ON "SiteSession"("startedAt");
CREATE INDEX "SiteSession_endedAt_idx" ON "SiteSession"("endedAt");
CREATE INDEX "SiteSession_source_idx" ON "SiteSession"("source");
CREATE INDEX "SiteSession_isBot_idx" ON "SiteSession"("isBot");
CREATE INDEX "SiteSession_createdAt_idx" ON "SiteSession"("createdAt");

CREATE INDEX "SitePageView_visitorId_idx" ON "SitePageView"("visitorId");
CREATE INDEX "SitePageView_sessionId_idx" ON "SitePageView"("sessionId");
CREATE INDEX "SitePageView_userId_idx" ON "SitePageView"("userId");
CREATE INDEX "SitePageView_path_idx" ON "SitePageView"("path");
CREATE INDEX "SitePageView_createdAt_idx" ON "SitePageView"("createdAt");

CREATE INDEX "SiteEvent_visitorId_idx" ON "SiteEvent"("visitorId");
CREATE INDEX "SiteEvent_sessionId_idx" ON "SiteEvent"("sessionId");
CREATE INDEX "SiteEvent_userId_idx" ON "SiteEvent"("userId");
CREATE INDEX "SiteEvent_eventName_idx" ON "SiteEvent"("eventName");
CREATE INDEX "SiteEvent_path_idx" ON "SiteEvent"("path");
CREATE INDEX "SiteEvent_createdAt_idx" ON "SiteEvent"("createdAt");

CREATE INDEX "FounderAuditSubmission_visitorId_idx" ON "FounderAuditSubmission"("visitorId");
CREATE INDEX "FounderAuditSubmission_userId_idx" ON "FounderAuditSubmission"("userId");
CREATE INDEX "FounderAuditSubmission_sessionId_idx" ON "FounderAuditSubmission"("sessionId");
CREATE INDEX "FounderAuditSubmission_resultType_idx" ON "FounderAuditSubmission"("resultType");
CREATE INDEX "FounderAuditSubmission_recommendedTier_idx" ON "FounderAuditSubmission"("recommendedTier");
CREATE INDEX "FounderAuditSubmission_createdAt_idx" ON "FounderAuditSubmission"("createdAt");

ALTER TABLE "SiteVisitor" ADD CONSTRAINT "SiteVisitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteSession" ADD CONSTRAINT "SiteSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePageView" ADD CONSTRAINT "SitePageView_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePageView" ADD CONSTRAINT "SitePageView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SiteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitePageView" ADD CONSTRAINT "SitePageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteEvent" ADD CONSTRAINT "SiteEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteEvent" ADD CONSTRAINT "SiteEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SiteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteEvent" ADD CONSTRAINT "SiteEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FounderAuditSubmission" ADD CONSTRAINT "FounderAuditSubmission_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "SiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FounderAuditSubmission" ADD CONSTRAINT "FounderAuditSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FounderAuditSubmission" ADD CONSTRAINT "FounderAuditSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SiteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
