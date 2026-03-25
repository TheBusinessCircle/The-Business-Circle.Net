CREATE TABLE "CommunityCommentLike" (
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunityCommentLike_pkey" PRIMARY KEY ("commentId", "userId")
);

CREATE INDEX "CommunityCommentLike_userId_createdAt_idx" ON "CommunityCommentLike"("userId", "createdAt");

ALTER TABLE "CommunityCommentLike"
  ADD CONSTRAINT "CommunityCommentLike_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityCommentLike"
  ADD CONSTRAINT "CommunityCommentLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
