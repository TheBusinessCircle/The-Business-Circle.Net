import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { logServerError } from "@/lib/security/logging";
import { validateCallRoomAccess } from "@/server/calling";
import { roomIdSchema } from "@/server/calling/schemas";
import { toCallingUser } from "@/server/calling/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
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

    const result = await validateCallRoomAccess({
      roomId: parsed.data.roomId,
      actor: toCallingUser(authResult.user)
    });

    return NextResponse.json(result, { status: result.allowed ? 200 : result.code === "room-not-found" ? 404 : 403 });
  } catch (error) {
    logServerError("calling-room-access-validate-failed", error);
    return NextResponse.json({ error: "Unable to validate room access." }, { status: 500 });
  }
}
