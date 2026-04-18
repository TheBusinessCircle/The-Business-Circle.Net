import { NextResponse } from "next/server";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { publishBcnCuratedPosts } from "@/server/community/community-curation.service";

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

async function runBcnCuration(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await publishBcnCuratedPosts();

  return NextResponse.json({
    ok: true,
    status: result.status,
    publishedCount: result.publishedCount,
    duplicateCount: result.duplicateCount,
    skippedCount: result.skippedCount,
    publishedPostIds: result.publishedPostIds
  });
}

export async function GET(request: Request) {
  return runBcnCuration(request);
}

export async function POST(request: Request) {
  return runBcnCuration(request);
}
