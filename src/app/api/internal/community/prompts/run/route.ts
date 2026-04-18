import { NextResponse } from "next/server";
import { CommunityPromptTriggerSource } from "@prisma/client";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { maybePublishQuietCommunityPrompt } from "@/server/community";

function isAuthorized(request: Request): boolean {
  const secret = process.env.COMMUNITY_AUTOMATION_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!secret && !cronSecret) {
    return false;
  }

  return isAuthorizedInternalAutomationRequest(request, {
    bearerSecrets: [secret ?? "", cronSecret ?? ""],
    headerSecrets: secret
      ? [
          {
            headerName: "x-community-secret",
            secret
          }
        ]
      : [],
    allowQuerySecret: true
  });
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
