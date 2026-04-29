import { BlueprintVoteType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { castBlueprintVote } from "@/server/blueprint";

const voteSchema = z.object({
  voteType: z.nativeEnum(BlueprintVoteType)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
    }

    const authResult = await requireApiUser({ requiredTier: "INNER_CIRCLE" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const parsed = voteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Blueprint vote." }, { status: 400 });
    }

    const { cardId } = await context.params;
    const state = await castBlueprintVote({
      cardId,
      userId: authResult.user.id,
      userRole: authResult.user.role,
      userTier: authResult.user.membershipTier,
      voteType: parsed.data.voteType
    });

    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "blueprint-vote-forbidden") {
      return NextResponse.json({ error: "Blueprint voting is locked for this tier." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "blueprint-card-not-found") {
      return NextResponse.json({ error: "Blueprint card not found." }, { status: 404 });
    }

    logServerError("blueprint-vote-update-failed", error);
    return NextResponse.json({ error: "Unable to update Blueprint vote." }, { status: 500 });
  }
}
