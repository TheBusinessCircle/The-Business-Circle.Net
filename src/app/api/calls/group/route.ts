import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import {
  createApprovedHostCallRoom,
  createFounderCallRoom
} from "@/server/calling";
import { createGroupCallSchema, parseIsoDate } from "@/server/calling/schemas";
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

    const parsed = createGroupCallSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid group call request." }, { status: 400 });
    }

    const actor = toCallingUser(authResult.user);
    const roomInput = {
      actor,
      title: parsed.data.title,
      description: parsed.data.description || null,
      audienceScope: parsed.data.audienceScope,
      customTierVisibility: parsed.data.customTierVisibility,
      maxParticipants: parsed.data.maxParticipants,
      startsAt: parseIsoDate(parsed.data.startsAt),
      endsAt: parseIsoDate(parsed.data.endsAt),
      isRecorded: parsed.data.isRecorded
    };

    const room =
      actor.role === "ADMIN"
        ? await createFounderCallRoom(roomInput)
        : await createApprovedHostCallRoom(roomInput);

    if (!room) {
      return NextResponse.json({ error: "Unable to create room." }, { status: 500 });
    }

    return NextResponse.json({
      roomId: room.id,
      roomPath: `/calls/${room.id}`,
      status: room.status
    });
  } catch (error) {
    if (error instanceof Error) {
      const status =
        error.message === "group-call-not-allowed" ||
        error.message === "host-audience-not-allowed" ||
        error.message === "host-room-limit-reached"
          ? 403
          : error.message === "founder-room-admin-only"
            ? 403
            : 500;

      if (status !== 500) {
        return NextResponse.json(
          {
            error:
              error.message === "host-room-limit-reached"
                ? "Your account has reached its current hosted-room limit."
                : "You cannot create that type of group room right now."
          },
          { status }
        );
      }
    }

    logServerError("calling-group-room-create-failed", error);
    return NextResponse.json({ error: "Unable to create the group room." }, { status: 500 });
  }
}
