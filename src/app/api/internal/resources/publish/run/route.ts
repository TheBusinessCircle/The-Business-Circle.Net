import { NextResponse } from "next/server";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { publishDueResources } from "@/server/resources";

function isAuthorized(request: Request): boolean {
  const secret = process.env.RESOURCE_AUTOMATION_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!secret && !cronSecret) {
    return false;
  }

  return isAuthorizedInternalAutomationRequest(request, {
    bearerSecrets: [secret ?? "", cronSecret ?? ""],
    headerSecrets: secret
      ? [
          {
            headerName: "x-resource-secret",
            secret
          }
        ]
      : [],
    allowQuerySecret: true
  });
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
