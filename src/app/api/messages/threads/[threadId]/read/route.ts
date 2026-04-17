import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { publishMessagesThreadRefresh } from "@/lib/messages/ably-publisher";
import { isTrustedOrigin } from "@/lib/security/origin";
import { markDirectMessageThreadRead } from "@/server/messages";

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

  try {
    const { threadId } = await params;
    await markDirectMessageThreadRead({
      threadId,
      userId: authResult.user.id
    });
    await publishMessagesThreadRefresh(threadId, { type: "thread.read" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to update read state." },
      { status: 500 }
    );
  }
}
