import { NextResponse } from "next/server";
import { CommunityPromptTriggerSource } from "@prisma/client";
import { maybePublishQuietCommunityPrompt } from "@/server/community";

function isAuthorized(request: Request): boolean {
  const secret = process.env.COMMUNITY_AUTOMATION_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization")?.trim();
  const headerSecret = request.headers.get("x-community-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  return (
    authorization === `Bearer ${secret}` ||
    headerSecret === secret ||
    querySecret === secret
  );
}

async function runPromptCheck(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const post = await maybePublishQuietCommunityPrompt({
    triggerSource: CommunityPromptTriggerSource.CRON
  });

  return NextResponse.json({
    ok: true,
    published: Boolean(post),
    postId: post?.id ?? null
  });
}

export async function GET(request: Request) {
  return runPromptCheck(request);
}

export async function POST(request: Request) {
  return runPromptCheck(request);
}
