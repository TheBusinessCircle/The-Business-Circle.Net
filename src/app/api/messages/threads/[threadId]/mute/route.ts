import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { directMessageMuteSchema } from "@/lib/messages/validators";
import { setDirectMessageMuteState } from "@/server/messages";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const authResult = await requireApiUser({ requiredTier: MembershipTier.FOUNDATION });
  if ("response" in authResult) {
    return authResult.response;
  }

  const parsed = directMessageMuteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mute state." }, { status: 400 });
  }

  try {
    const { threadId } = await params;
    await setDirectMessageMuteState({
      threadId,
      userId: authResult.user.id,
      muted: parsed.data.muted
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to update mute state." }, { status: 500 });
  }
}
