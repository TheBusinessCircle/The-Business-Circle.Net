import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { directMessageCollaborationSchema } from "@/lib/messages/validators";
import { bcnRulesRequiredResponse, hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { updateDirectMessageCollaboration } from "@/server/messages";

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

  if (!(await hasAcceptedBcnRules(authResult.user.id))) {
    return bcnRulesRequiredResponse();
  }

  const parsed = directMessageCollaborationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid collaboration payload." }, { status: 400 });
  }

  try {
    const { threadId } = await params;
    await updateDirectMessageCollaboration({
      threadId,
      userId: authResult.user.id,
      collaborationStatus: parsed.data.collaborationStatus,
      collaborationNotes: parsed.data.collaborationNotes || null
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to update collaboration state." },
      { status: 500 }
    );
  }
}
