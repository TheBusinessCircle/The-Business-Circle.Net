import { NextResponse } from "next/server";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { publishBcnCuratedPosts } from "@/server/community";

function isAuthorized(request: Request) {
  const intelligenceSecret = process.env.INTELLIGENCE_CRON_SECRET?.trim();
  const fallbackSecret = process.env.CRON_SECRET?.trim();

  if (!intelligenceSecret && !fallbackSecret) {
    return false;
  }

  return isAuthorizedInternalAutomationRequest(request, {
    bearerSecrets: [intelligenceSecret ?? "", fallbackSecret ?? ""],
    headerSecrets: intelligenceSecret
      ? [
          {
            headerName: "x-intelligence-cron-secret",
            secret: intelligenceSecret
          }
        ]
      : [],
    allowQuerySecret: false
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        status: "unauthorized",
        error: "Unauthorized."
      },
      { status: 401 }
    );
  }

  const result = await publishBcnCuratedPosts();
  const ok = !["missing-source", "missing-author", "missing-channel", "source-unavailable", "source-invalid"].includes(
    result.status
  );

  return NextResponse.json(
    {
      ok,
      ...result
    },
    {
      status: ok ? 200 : 422,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

