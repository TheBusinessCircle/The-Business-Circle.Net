import { NextResponse } from "next/server";
import { resolveEffectiveTier } from "@/lib/auth/permissions";
import { requireApiUser } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { toggleCommunityCommentLike } from "@/server/community";

export async function POST(
  request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const { commentId } = await context.params;
    const result = await toggleCommunityCommentLike({
      commentId,
      userId: authResult.user.id,
      userTier: resolveEffectiveTier(authResult.user.role, authResult.user.membershipTier)
    });
    const likeCount = await db.communityCommentLike.count({
      where: {
        commentId
      }
    });

    return NextResponse.json({ liked: result.liked, likeCount, postId: result.postId });
  } catch (error) {
    logServerError("community-comment-like-toggle-failed", error);
    return NextResponse.json({ error: "Unable to update comment like." }, { status: 500 });
  }
}
