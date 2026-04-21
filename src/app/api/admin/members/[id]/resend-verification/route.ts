import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/auth/email-verification";
import { requireApiUser } from "@/lib/auth/api";
import { logServerError } from "@/lib/security/logging";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireApiUser({ adminOnly: true, allowUnentitled: true });

  if ("response" in authResult) {
    return authResult.response;
  }

  const { id } = await context.params;

  try {
    const result = await resendVerificationEmail(id);

    if (result.skipped && result.reason === "User not found.") {
      return NextResponse.json(
        {
          ok: false,
          error: "Member not found."
        },
        { status: 404 }
      );
    }

    if (result.skipped && result.reason === "User already verified.") {
      return NextResponse.json({
        ok: true,
        message: "This member has already confirmed their email address."
      });
    }

    if (!result.sent) {
      return NextResponse.json(
        {
          ok: false,
          error: result.reason || "Unable to resend the confirmation email."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Confirmation email sent."
    });
  } catch (error) {
    logServerError("admin-resend-verification-failed", error, {
      targetUserId: id,
      adminUserId: authResult.user.id
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to resend the confirmation email right now."
      },
      { status: 500 }
    );
  }
}
