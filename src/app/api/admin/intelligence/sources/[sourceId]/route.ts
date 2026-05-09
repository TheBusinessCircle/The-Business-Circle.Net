import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api";
import { setBcnIntelligenceSourceEnabled } from "@/server/community/bcn-intelligence-admin.service";

const updateSourceSchema = z.object({
  enabled: z.boolean()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sourceId: string }> }
) {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source update." }, { status: 400 });
  }

  const { sourceId } = await context.params;
  await setBcnIntelligenceSourceEnabled({
    sourceId,
    enabled: parsed.data.enabled
  });

  return NextResponse.json(
    {
      ok: true
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

