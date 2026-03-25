import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { getAdminLiveSnapshot } from "@/server/admin";

export async function GET() {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const snapshot = await getAdminLiveSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
