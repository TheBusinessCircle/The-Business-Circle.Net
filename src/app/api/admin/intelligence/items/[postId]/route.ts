import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import {
  reEnrichBcnIntelligenceItem,
  updateBcnIntelligenceItem
} from "@/server/community/bcn-intelligence-admin.service";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      postId: string;
    }>;
  }
) {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const { postId } = await context.params;
  const payload = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    featured?: unknown;
    status?: unknown;
    primaryCategory?: unknown;
    recommendedRoom?: unknown;
  };

  try {
    if (payload.action === "reenrich") {
      const result = await reEnrichBcnIntelligenceItem({ postId });
      return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
    }

    const updated = await updateBcnIntelligenceItem({
      postId,
      featured: typeof payload.featured === "boolean" ? payload.featured : undefined,
      status: typeof payload.status === "string" ? payload.status : undefined,
      primaryCategory: typeof payload.primaryCategory === "string" ? payload.primaryCategory : undefined,
      recommendedRoom: typeof payload.recommendedRoom === "string" ? payload.recommendedRoom : undefined
    });

    return NextResponse.json({ ok: true, itemId: updated.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Intelligence item update failed."
      },
      { status: 422 }
    );
  }
}
