import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { endCallRoom } from "@/server/calling";
import { roomIdSchema } from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const parsed = roomIdSchema.safeParse(await context.params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid room identifier." }, { status: 400 });
    }

    const room = await endCallRoom({
      roomId: parsed.data.roomId,
      actor: toCallingUser(authResult.user)
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Error && error.message === "room-end-forbidden") {
      return NextResponse.json(
        { error: "Only the room host or an admin can end this call." },
        { status: 403 }
      );
    }

    logServerError("calling-room-end-failed", error);
    return NextResponse.json({ error: "Unable to end the room." }, { status: 500 });
  }
}
