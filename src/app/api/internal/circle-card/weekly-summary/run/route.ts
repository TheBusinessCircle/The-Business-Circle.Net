import { NextResponse } from "next/server";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { sendDueCircleCardWeeklySummaries } from "@/server/circle-card/activation.service";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const circleCardSecret = process.env.CIRCLE_CARD_ACTIVATION_SECRET?.trim();

  if (!cronSecret && !circleCardSecret) {
    return false;
  }

  return isAuthorizedInternalAutomationRequest(request, {
    bearerSecrets: [cronSecret ?? "", circleCardSecret ?? ""],
    headerSecrets: circleCardSecret
      ? [
          {
            headerName: "x-circle-card-secret",
            secret: circleCardSecret
          }
        ]
      : [],
    allowQuerySecret: true
  });
}

async function runWeeklySummaries(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        authorized: false,
        status: "unauthorized",
        error: "Unauthorized.",
        message: "Provide CRON_SECRET via Bearer token, supported header, or ?secret= query parameter."
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;
  const result = await sendDueCircleCardWeeklySummaries({ limit });

  return NextResponse.json({
    ok: true,
    authorized: true,
    status: "completed",
    ...result
  });
}

export async function GET(request: Request) {
  return runWeeklySummaries(request);
}

export async function POST(request: Request) {
  return runWeeklySummaries(request);
}
