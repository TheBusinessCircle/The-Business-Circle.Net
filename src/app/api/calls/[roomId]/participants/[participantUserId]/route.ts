import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { removeParticipantFromCallRoom } from "@/server/calling";
import { participantUserIdSchema, roomIdSchema } from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ roomId: string; participantUserId: string }> }
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const params = await context.params;
    const roomParams = roomIdSchema.safeParse(params);
    const participantParams = participantUserIdSchema.safeParse(params);

    if (!roomParams.success || !participantParams.success) {
      return NextResponse.json({ error: "Invalid participant removal request." }, { status: 400 });
    }

    const room = await removeParticipantFromCallRoom({
      roomId: roomParams.data.roomId,
      actor: toCallingUser(authResult.user),
      participantUserId: participantParams.data.participantUserId
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "room-not-found" || error.message === "participant-not-found") {
        return NextResponse.json({ error: "That participant could not be found." }, { status: 404 });
      }

      if (error.message === "room-remove-forbidden") {
        return NextResponse.json(
          { error: "Only the room host or an admin can remove participants." },
          { status: 403 }
        );
      }

      if (error.message === "room-remove-host-forbidden") {
        return NextResponse.json(
          { error: "Only an admin can remove the room host." },
          { status: 403 }
        );
      }

      if (error.message === "room-remove-self-forbidden") {
        return NextResponse.json(
          { error: "Leave the room normally instead of removing your own account." },
          { status: 400 }
        );
      }
    }

    logServerError("calling-room-participant-remove-failed", error);
    return NextResponse.json({ error: "Unable to remove the participant." }, { status: 500 });
  }
}
