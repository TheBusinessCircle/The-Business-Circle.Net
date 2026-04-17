import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import { directMessageResponseSchema } from "@/lib/messages/validators";
import { respondToDirectMessageRequest } from "@/server/messages";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ requestId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const authResult = await requireApiUser({ requiredTier: MembershipTier.FOUNDATION });
  if ("response" in authResult) {
    return authResult.response;
  }

  const parsed = directMessageResponseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request response." }, { status: 400 });
  }

  try {
    const { requestId } = await params;
    const result = await respondToDirectMessageRequest({
      requestId,
      recipientId: authResult.user.id,
      action: parsed.data.action
    });

    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "request-response-failed";
    return NextResponse.json(
      {
        error:
          code === "request-not-found"
            ? "That private chat request is no longer available."
            : "Unable to update the private chat request."
      },
      { status: code === "request-not-found" ? 404 : 500 }
    );
  }
}
