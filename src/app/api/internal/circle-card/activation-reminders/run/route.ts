import { NextResponse } from "next/server";
import { isAuthorizedInternalAutomationRequest } from "@/lib/internal-route-auth";
import { sendDueCircleCardActivationReminders } from "@/server/circle-card";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return false;
  }

  return isAuthorizedInternalAutomationRequest(request, {
    bearerSecrets: [cronSecret],
    headerSecrets: [
      {
        headerName: "x-cron-secret",
        secret: cronSecret
      }
    ],
    allowQuerySecret: true
  });
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendDueCircleCardActivationReminders();

  return NextResponse.json({
    ok: true,
    ...result
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
