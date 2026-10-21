import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { isTrustedOrigin } from "@/lib/security/origin";
import { logServerError } from "@/lib/security/logging";
import { markCallParticipantLeft, recordCallParticipantPresence, validateCallRoomAccess } from "@/server/calling";
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
    const authResult = await requireApiUser(isBcnV2Enabled() ? { allowUnentitled: true, requireVerifiedEmail: true } : { requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    if (!(await hasAcceptedBcnRules(authResult.user.id))) {
      return bcnRulesRequiredResponse();
    }

    const params = roomIdSchema.safeParse(await context.params);
    const body = participantPresenceSchema.safeParse(await request.json());

    if (!params.success || !body.success) {
      return NextResponse.json({ error: "Invalid presence payload." }, { status: 400 });
    }

    const actor = toCallingUser(authResult.user);
    // A presence ping is not an invitation. Never let it create access for an outsider.
    if (isBcnV2Enabled()) {
      const access = await validateCallRoomAccess({ roomId: params.data.roomId, actor });
      if (!access.allowed) return NextResponse.json({ error: "This call is private or unavailable." }, { status: 403 });
    }

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
