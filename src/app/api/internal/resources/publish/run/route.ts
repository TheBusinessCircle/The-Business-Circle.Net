import { NextResponse } from "next/server";
import { publishDueResources } from "@/server/resources";

function isAuthorized(request: Request): boolean {
  const secret = process.env.RESOURCE_AUTOMATION_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization")?.trim();
  const headerSecret = request.headers.get("x-resource-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  return (
    authorization === `Bearer ${secret}` ||
    headerSecret === secret ||
    querySecret === secret
  );
}

async function runPublishingSweep(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await publishDueResources();

  return NextResponse.json({
    ok: true,
    publishedCount: result.publishedCount,
    publishedIds: result.publishedIds
  });
}

export async function GET(request: Request) {
  return runPublishingSweep(request);
}

export async function POST(request: Request) {
  return runPublishingSweep(request);
}
