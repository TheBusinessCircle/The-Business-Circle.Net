import { NextResponse } from "next/server";
import { publishBcnCuratedPosts } from "@/server/community/community-curation.service";

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
