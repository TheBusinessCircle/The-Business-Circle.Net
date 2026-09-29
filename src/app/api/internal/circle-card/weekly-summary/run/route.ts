import { NextResponse } from "next/server";
import { authorizeCircleCardSchedulerRequest } from "@/lib/circle-card/scheduler-auth";
import { logServerError } from "@/lib/security/logging";
import { sendDueCircleCardWeeklySummaries } from "@/server/circle-card/activation.service";

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
    return NextResponse.json(
      {
        ok: false,
        authorized: false,
        status: "unauthorized",
        error: "Unauthorized."
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;
  try {
    const result = await sendDueCircleCardWeeklySummaries({ limit });
    if (result.failed > 0) {
      return NextResponse.json(
        { ok: false, authorized: true, status: "partial-failure", ...result },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      authorized: true,
      status: "completed",
      ...result
    });
  } catch {
    logServerError(
      "circle-card-weekly-summary-job-failed",
      new Error("Circle Card weekly summary job failed.")
    );
    return NextResponse.json({ ok: false, error: "Job failed." }, { status: 500 });
  }
}
