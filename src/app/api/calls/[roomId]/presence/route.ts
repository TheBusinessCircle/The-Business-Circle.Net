import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { markCallParticipantLeft, recordCallParticipantPresence } from "@/server/calling";
import { participantPresenceSchema, roomIdSchema } from "@/server/calling/schemas";
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

    const params = roomIdSchema.safeParse(await context.params);
    const body = participantPresenceSchema.safeParse(await request.json());

    if (!params.success || !body.success) {
      return NextResponse.json({ error: "Invalid presence payload." }, { status: 400 });
    }

    const actor = toCallingUser(authResult.user);

    if (body.data.state === "LEFT") {
      await markCallParticipantLeft({
        roomId: params.data.roomId,
        actor
      });
    } else {
      await recordCallParticipantPresence({
        roomId: params.data.roomId,
        userId: actor.id,
        state: "JOINED"
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("calling-room-presence-update-failed", error);
    return NextResponse.json({ error: "Unable to update call presence." }, { status: 500 });
  }
}
