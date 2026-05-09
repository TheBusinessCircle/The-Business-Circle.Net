import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { manuallyAddBcnIntelligenceUrl } from "@/server/community/bcn-intelligence-admin.service";

export async function POST(request: Request) {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = (await request.json().catch(() => ({}))) as {
    url?: unknown;
  };

  if (typeof payload.url !== "string" || !payload.url.trim()) {
    return NextResponse.json({ ok: false, error: "A source URL is required." }, { status: 400 });
  }

  try {
    const result = await manuallyAddBcnIntelligenceUrl({
      url: payload.url
    });

    return NextResponse.json(
      {
        ok: true,
        ...result
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Manual intelligence intake failed."
      },
      { status: 422 }
    );
  }
}
