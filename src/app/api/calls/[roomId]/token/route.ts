import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { issueCallRoomToken } from "@/server/calling";
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

    const result = await issueCallRoomToken({
      roomId: parsed.data.roomId,
      actor: toCallingUser(authResult.user)
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      const status =
        error.message === "room-not-found"
          ? 404
          : error.message === "room-not-live" ||
              error.message === "room-full" ||
              error.message === "room-join-forbidden"
            ? 403
            : 500;

      if (status !== 500) {
        return NextResponse.json(
          {
            error:
              error.message === "room-full"
                ? "This room has reached its participant limit."
                : error.message === "room-not-live"
                  ? "This room is not open for members yet."
                  : "You are not allowed to join this room."
          },
          { status }
        );
      }
    }

    logServerError("calling-room-token-issue-failed", error);
    return NextResponse.json({ error: "Unable to issue a room token." }, { status: 500 });
  }
}
