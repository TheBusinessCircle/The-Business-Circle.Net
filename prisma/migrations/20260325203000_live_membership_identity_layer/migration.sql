CREATE TYPE "MemberRoleTag" AS ENUM ('FOUNDER', 'OPERATOR', 'ADVISOR');

ALTER TABLE "User"
ADD COLUMN "memberRoleTag" "MemberRoleTag" NOT NULL DEFAULT 'FOUNDER';

ALTER TYPE "CommunityPostKind" ADD VALUE 'WIN';

DROP INDEX IF EXISTS "Resource_status_accessTier_earlyAccess_idx";

ALTER TABLE "Resource"
DROP COLUMN IF EXISTS "earlyAccess";

CREATE INDEX "User_memberRoleTag_idx" ON "User"("memberRoleTag");
