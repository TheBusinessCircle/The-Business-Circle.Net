import { NextResponse } from "next/server";
import { authorizeCircleCardSchedulerRequest } from "@/lib/circle-card/scheduler-auth";
import { logServerError } from "@/lib/security/logging";
import { sendDueCircleCardActivationReminders } from "@/server/circle-card";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = authorizeCircleCardSchedulerRequest(request);
  if (authorization === "invalid-runtime-brand") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (authorization === "not-configured") {
    return NextResponse.json(
      { ok: false, error: "Circle Card scheduler is not configured." },
      { status: 503 }
    );
  }
  if (authorization !== "authorized") {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sendDueCircleCardActivationReminders();
    if (result.failed > 0) {
      return NextResponse.json(
        { ok: false, status: "partial-failure", ...result },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch {
    logServerError(
      "circle-card-activation-reminder-job-failed",
      new Error("Circle Card activation reminder job failed.")
    );
    return NextResponse.json({ ok: false, error: "Job failed." }, { status: 500 });
  }
}
