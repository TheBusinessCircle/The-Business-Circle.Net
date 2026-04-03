-- CreateEnum
CREATE TYPE "CallRoomType" AS ENUM ('ONE_TO_ONE', 'GROUP', 'FOUNDER_EVENT', 'APPROVED_HOST_EVENT');

-- CreateEnum
CREATE TYPE "CallRoomStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallAudienceScope" AS ENUM ('FOUNDATION', 'INNER_CIRCLE', 'CORE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CallParticipantRole" AS ENUM ('HOST', 'COHOST', 'MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CallParticipantPresenceState" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "GroupHostAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CallRoom" (
    "id" TEXT NOT NULL,
    "type" "CallRoomType" NOT NULL,
    "status" "CallRoomStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByUserId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "livekitRoomName" TEXT NOT NULL,
    "tierVisibility" "CallAudienceScope" NOT NULL DEFAULT 'FOUNDATION',
    "customTierVisibility" "MembershipTier"[] DEFAULT ARRAY[]::"MembershipTier"[],
    "maxParticipants" INTEGER NOT NULL,
    "hostLevelRequired" INTEGER,
    "startsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "isRecorded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CallParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "presenceState" "CallParticipantPresenceState" NOT NULL DEFAULT 'INVITED',
    "livekitIdentity" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallHostPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canHostGroupCalls" BOOLEAN NOT NULL DEFAULT false,
    "hostLevel" INTEGER NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrentRooms" INTEGER NOT NULL DEFAULT 0,
    "allowedTierVisibility" "MembershipTier"[] DEFAULT ARRAY[]::"MembershipTier"[],
    "grantedByUserId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallHostPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupHostAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GroupHostAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupHostAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSchedule" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hostUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "tierVisibility" "CallAudienceScope" NOT NULL DEFAULT 'FOUNDATION',
    "customTierVisibility" "MembershipTier"[] DEFAULT ARRAY[]::"MembershipTier"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "roomId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtimeSystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "globalCallingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "memberHostedGroupCallsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emergencyShutdownEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultHostParticipantCap" INTEGER NOT NULL DEFAULT 6,
    "founderRoomDefaultCap" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealtimeSystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallRoom_slug_key" ON "CallRoom"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CallRoom_livekitRoomName_key" ON "CallRoom"("livekitRoomName");

-- CreateIndex
CREATE INDEX "CallRoom_type_status_idx" ON "CallRoom"("type", "status");

-- CreateIndex
CREATE INDEX "CallRoom_hostUserId_status_idx" ON "CallRoom"("hostUserId", "status");

-- CreateIndex
CREATE INDEX "CallRoom_createdByUserId_createdAt_idx" ON "CallRoom"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CallRoom_status_startsAt_idx" ON "CallRoom"("status", "startsAt");

-- CreateIndex
CREATE INDEX "CallRoom_tierVisibility_status_idx" ON "CallRoom"("tierVisibility", "status");

-- CreateIndex
CREATE INDEX "CallParticipant_roomId_presenceState_idx" ON "CallParticipant"("roomId", "presenceState");

-- CreateIndex
CREATE INDEX "CallParticipant_userId_createdAt_idx" ON "CallParticipant"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CallParticipant_livekitIdentity_idx" ON "CallParticipant"("livekitIdentity");

-- CreateIndex
CREATE UNIQUE INDEX "CallParticipant_roomId_userId_key" ON "CallParticipant"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CallHostPermission_userId_key" ON "CallHostPermission"("userId");

-- CreateIndex
CREATE INDEX "CallHostPermission_canHostGroupCalls_isActive_expiresAt_idx" ON "CallHostPermission"("canHostGroupCalls", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "CallHostPermission_hostLevel_isActive_idx" ON "CallHostPermission"("hostLevel", "isActive");

-- CreateIndex
CREATE INDEX "CallHostPermission_grantedByUserId_idx" ON "CallHostPermission"("grantedByUserId");

-- CreateIndex
CREATE INDEX "GroupHostAccessRequest_userId_status_requestedAt_idx" ON "GroupHostAccessRequest"("userId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "GroupHostAccessRequest_status_requestedAt_idx" ON "GroupHostAccessRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "GroupHostAccessRequest_reviewedByUserId_reviewedAt_idx" ON "GroupHostAccessRequest"("reviewedByUserId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallSchedule_roomId_key" ON "CallSchedule"("roomId");

-- CreateIndex
CREATE INDEX "CallSchedule_hostUserId_startsAt_idx" ON "CallSchedule"("hostUserId", "startsAt");

-- CreateIndex
CREATE INDEX "CallSchedule_startsAt_idx" ON "CallSchedule"("startsAt");

-- CreateIndex
CREATE INDEX "CallSchedule_tierVisibility_startsAt_idx" ON "CallSchedule"("tierVisibility", "startsAt");

-- CreateIndex
CREATE INDEX "CallAuditLog_actorUserId_createdAt_idx" ON "CallAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CallAuditLog_targetUserId_createdAt_idx" ON "CallAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CallAuditLog_roomId_createdAt_idx" ON "CallAuditLog"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "CallAuditLog_action_createdAt_idx" ON "CallAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "CallRoom" ADD CONSTRAINT "CallRoom_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRoom" ADD CONSTRAINT "CallRoom_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CallRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallHostPermission" ADD CONSTRAINT "CallHostPermission_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallHostPermission" ADD CONSTRAINT "CallHostPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHostAccessRequest" ADD CONSTRAINT "GroupHostAccessRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHostAccessRequest" ADD CONSTRAINT "GroupHostAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSchedule" ADD CONSTRAINT "CallSchedule_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSchedule" ADD CONSTRAINT "CallSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CallRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAuditLog" ADD CONSTRAINT "CallAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAuditLog" ADD CONSTRAINT "CallAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAuditLog" ADD CONSTRAINT "CallAuditLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CallRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

