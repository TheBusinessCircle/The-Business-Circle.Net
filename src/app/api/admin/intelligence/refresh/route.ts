import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { publishBcnCuratedPosts } from "@/server/community";

export async function POST() {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
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

