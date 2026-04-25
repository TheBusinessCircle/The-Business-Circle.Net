import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { CallRoomTokenIssueError, issueCallRoomToken } from "@/server/calling";
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

  let roomId: string | null = null;

  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    if (!(await hasAcceptedBcnRules(authResult.user.id))) {
      return bcnRulesRequiredResponse();
    }

    const parsed = roomIdSchema.safeParse(await context.params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid room identifier." }, { status: 400 });
    }

    roomId = parsed.data.roomId;

    const result = await issueCallRoomToken({
      roomId,
      actor: toCallingUser(authResult.user)
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CallRoomTokenIssueError) {
      logServerError("calling-room-token-issue-failed", error, {
        roomId: roomId ?? undefined,
        tokenIssueStage: error.stage,
        ...error.details
      });

      return NextResponse.json({ error: error.safeMessage }, { status: error.status });
    }

    if (error instanceof Error) {
      const status =
        error.message === "room-not-found"
          ? 404
          : error.message === "room-not-live" ||
              error.message === "room-removed" ||
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
                  : error.message === "room-removed"
                    ? "The host has removed you from this room."
                  : "You are not allowed to join this room."
          },
          { status }
        );
      }
    }

    logServerError("calling-room-token-issue-failed", error, {
      roomId: roomId ?? undefined
    });
    return NextResponse.json({ error: "Unable to issue a room token." }, { status: 500 });
  }
}
