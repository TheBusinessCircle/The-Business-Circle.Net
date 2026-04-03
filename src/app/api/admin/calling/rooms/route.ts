import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { logServerError } from "@/lib/security/logging";
import { listAdminCallRooms } from "@/server/calling";

export async function GET() {
  try {
    const authResult = await requireApiUser({ adminOnly: true });
    if ("response" in authResult) {
      return authResult.response;
    }

    const rooms = await listAdminCallRooms();
    return NextResponse.json({ rooms });
  } catch (error) {
    logServerError("admin-calling-room-list-failed", error);
    return NextResponse.json({ error: "Unable to load active rooms." }, { status: 500 });
  }
}
