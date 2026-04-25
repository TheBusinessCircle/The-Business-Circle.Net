import { NextResponse } from "next/server";
import { resolveEffectiveTier } from "@/lib/auth/permissions";
import { requireApiUser } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { toggleCommunityPostLike } from "@/server/community";

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    if (!(await hasAcceptedBcnRules(authResult.user.id))) {
      return bcnRulesRequiredResponse();
    }

    const { postId } = await context.params;
    const liked = await toggleCommunityPostLike({
      postId,
      userId: authResult.user.id,
      userTier: resolveEffectiveTier(authResult.user.role, authResult.user.membershipTier)
    });
    const likeCount = await db.communityPostLike.count({
      where: {
        postId
      }
    });

    return NextResponse.json({ liked, likeCount });
  } catch (error) {
    logServerError("community-post-like-toggle-failed", error);
    return NextResponse.json({ error: "Unable to update post like." }, { status: 500 });
  }
}
