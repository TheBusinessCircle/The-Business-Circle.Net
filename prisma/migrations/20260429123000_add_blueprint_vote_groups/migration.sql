CREATE TYPE "BlueprintVoteGroup" AS ENUM ('BUILD_PRIORITY', 'DISCUSSION');

ALTER TABLE "BlueprintVote"
ADD COLUMN "voteGroup" "BlueprintVoteGroup";

UPDATE "BlueprintVote"
SET "voteGroup" = CASE
  WHEN "voteType" = 'NEEDS_DISCUSSION' THEN 'DISCUSSION'::"BlueprintVoteGroup"
  ELSE 'BUILD_PRIORITY'::"BlueprintVoteGroup"
END;

ALTER TABLE "BlueprintVote"
ALTER COLUMN "voteGroup" SET NOT NULL,
ALTER COLUMN "voteGroup" SET DEFAULT 'BUILD_PRIORITY';

ALTER TABLE "BlueprintVote"
DROP CONSTRAINT "BlueprintVote_pkey";

ALTER TABLE "BlueprintVote"
ADD CONSTRAINT "BlueprintVote_pkey" PRIMARY KEY ("cardId", "userId", "voteGroup");

DROP INDEX "BlueprintVote_cardId_voteType_idx";

CREATE INDEX "BlueprintVote_cardId_voteGroup_voteType_idx"
ON "BlueprintVote"("cardId", "voteGroup", "voteType");
