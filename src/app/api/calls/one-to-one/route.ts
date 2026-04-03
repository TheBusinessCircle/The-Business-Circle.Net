import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { createOneToOneCallRoom } from "@/server/calling";
import { createDirectCallSchema } from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const parsed = createDirectCallSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid call request." }, { status: 400 });
    }

    const room = await createOneToOneCallRoom({
      actor: toCallingUser(authResult.user),
      targetUserId: parsed.data.targetUserId
    });

    if (!room) {
      return NextResponse.json({ error: "Unable to create room." }, { status: 500 });
    }

    return NextResponse.json({
      roomId: room.id,
      roomPath: `/calls/${room.id}`
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "target-not-found") {
        return NextResponse.json({ error: "That member could not be found." }, { status: 404 });
      }

      if (error.message === "direct-call-self") {
        return NextResponse.json({ error: "You cannot start a call with your own account." }, { status: 400 });
      }

      if (error.message === "target-not-eligible") {
        return NextResponse.json(
          { error: "That member is not currently eligible for 1 to 1 calling." },
          { status: 403 }
        );
      }
    }

    logServerError("calling-direct-room-create-failed", error);
    return NextResponse.json({ error: "Unable to create the call room." }, { status: 500 });
  }
}
