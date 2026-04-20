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
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        error: "Unauthorized.",
        message:
          "Provide COMMUNITY_AUTOMATION_SECRET or CRON_SECRET via Bearer token, supported header, or ?secret= query parameter."
      },
      { status: 401 }
    );
  }

  const result = await publishBcnCuratedPosts();
  const configErrorStatuses = new Set(["missing-source", "missing-author", "missing-channel"]);
  const upstreamErrorStatuses = new Set(["source-unavailable", "source-invalid"]);
  const ok = !configErrorStatuses.has(result.status) && !upstreamErrorStatuses.has(result.status);
  const statusCode = configErrorStatuses.has(result.status)
    ? 422
    : upstreamErrorStatuses.has(result.status)
      ? 502
      : 200;

  return NextResponse.json({
    ok,
    status: result.status,
    sourceCount: result.sourceCount,
    sourceConfigured: result.sourceConfigured,
    authorResolved: result.authorResolved,
    fetchedCount: result.fetchedCount,
    candidateCount: result.candidateCount,
    publishedCount: result.publishedCount,
    duplicateCount: result.duplicateCount,
    skippedCount: result.skippedCount,
    rejectedNonEnglishCount: result.rejectedNonEnglishCount,
    rejectedNotRelevantCount: result.rejectedNotRelevantCount,
    rejectedStaleCount: result.rejectedStaleCount,
    lookbackHours: result.lookbackHours,
    maxPostsPerRun: result.maxPostsPerRun,
    throttleMs: result.throttleMs,
    publishedPostIds: result.publishedPostIds,
    errors: result.errors,
    message: result.message,
    sourceName: process.env.BCN_COMMUNITY_SOURCE_NAME?.trim() || "BCN Source",
    sourceMode: process.env.BCN_COMMUNITY_SOURCE_URLS?.trim()
      ? "multi-source"
      : process.env.BCN_COMMUNITY_SOURCE_URL?.trim()
        ? "single-source"
        : "unconfigured"
  }, { status: statusCode });
}

export async function GET(request: Request) {
  return runBcnCuration(request);
}

export async function POST(request: Request) {
  return runBcnCuration(request);
}
