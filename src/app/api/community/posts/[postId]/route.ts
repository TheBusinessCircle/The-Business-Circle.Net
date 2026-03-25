import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { resolveEffectiveTier } from "@/lib/auth/permissions";
import { logServerError } from "@/lib/security/logging";
import { getCommunityPostDetail } from "@/server/community";

export async function GET(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const { postId } = await context.params;
    const effectiveTier = resolveEffectiveTier(
      authResult.user.role,
      authResult.user.membershipTier
    );

    const post = await getCommunityPostDetail({
      postId,
      viewerUserId: authResult.user.id,
      viewerTier: effectiveTier
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    logServerError("community-post-detail-fetch-failed", error);
    return NextResponse.json({ error: "Failed to load post." }, { status: 500 });
  }
}
