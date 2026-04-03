import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { logServerError } from "@/lib/security/logging";
import { listUpcomingCallSchedulesForUser } from "@/server/calling";
import { toCallingUser } from "@/server/calling/session";

export async function GET() {
  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const rooms = await listUpcomingCallSchedulesForUser(toCallingUser(authResult.user));
    return NextResponse.json({ rooms });
  } catch (error) {
    logServerError("calling-scheduled-list-failed", error);
    return NextResponse.json({ error: "Unable to load scheduled rooms." }, { status: 500 });
  }
}
