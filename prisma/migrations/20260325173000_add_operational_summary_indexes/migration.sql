CREATE INDEX IF NOT EXISTS "User_suspended_createdAt_idx" ON "User"("suspended", "createdAt");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_createdAt_idx" ON "PasswordResetToken"("createdAt");

CREATE INDEX IF NOT EXISTS "Profile_updatedAt_idx" ON "Profile"("updatedAt");

CREATE INDEX IF NOT EXISTS "Resource_status_publishedAt_idx" ON "Resource"("status", "publishedAt");

CREATE INDEX IF NOT EXISTS "Channel_isArchived_accessTier_position_idx"
  ON "Channel"("isArchived", "accessTier", "position");

CREATE INDEX IF NOT EXISTS "Event_isCancelled_startAt_idx" ON "Event"("isCancelled", "startAt");

CREATE INDEX IF NOT EXISTS "Subscription_status_tier_idx" ON "Subscription"("status", "tier");
CREATE INDEX IF NOT EXISTS "Subscription_updatedAt_idx" ON "Subscription"("updatedAt");

CREATE INDEX IF NOT EXISTS "CommunityPost_channelId_deletedAt_createdAt_idx"
  ON "CommunityPost"("channelId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_deletedAt_createdAt_idx"
  ON "CommunityPost"("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "CommunityComment_postId_deletedAt_createdAt_idx"
  ON "CommunityComment"("postId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityComment_deletedAt_createdAt_idx"
  ON "CommunityComment"("deletedAt", "createdAt");
