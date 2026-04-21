import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/auth/email-verification";
import { requireApiUser } from "@/lib/auth/api";
import { db } from "@/lib/db";
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
  const targetUser = await db.user.findUnique({
    where: {
      id
    },
    select: {
      id: true,
      email: true
    }
  });

  console.info("[admin-resend-verification] requested", {
    targetUserId: id,
    targetEmail: targetUser?.email ?? null,
    adminUserId: authResult.user.id
  });

  try {
    console.info("[admin-resend-verification] sending", {
      targetUserId: id,
      targetEmail: targetUser?.email ?? null,
      adminUserId: authResult.user.id
    });

    const result = await resendVerificationEmail(id);

    if (result.skipped && result.reason === "User not found.") {
      console.warn("[admin-resend-verification] failed", {
        targetUserId: id,
        targetEmail: targetUser?.email ?? null,
        adminUserId: authResult.user.id,
        reason: "user-not-found"
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Member not found."
        },
        { status: 404 }
      );
    }

    if (result.skipped && result.reason === "User already verified.") {
      console.info("[admin-resend-verification] success", {
        targetUserId: id,
        targetEmail: targetUser?.email ?? null,
        adminUserId: authResult.user.id,
        outcome: "already-verified"
      });
      return NextResponse.json({
        ok: true,
        message: "This member has already confirmed their email address."
      });
    }

    if (!result.sent) {
      console.error("[admin-resend-verification] failed", {
        targetUserId: id,
        targetEmail: targetUser?.email ?? null,
        adminUserId: authResult.user.id,
        reason: result.reason ?? "unknown-send-failure"
      });
      return NextResponse.json(
        {
          ok: false,
          error: result.reason || "Unable to resend the confirmation email."
        },
        { status: 500 }
      );
    }

    console.info("[admin-resend-verification] success", {
      targetUserId: id,
      targetEmail: targetUser?.email ?? null,
      adminUserId: authResult.user.id,
      messageId: result.messageId ?? null
    });
    return NextResponse.json({
      ok: true,
      message: "Confirmation email sent."
    });
  } catch (error) {
    console.error("[admin-resend-verification] failed", {
      targetUserId: id,
      targetEmail: targetUser?.email ?? null,
      adminUserId: authResult.user.id,
      error: error instanceof Error ? error.message : "Unknown resend error."
    });
    logServerError("admin-resend-verification-failed", error, {
      targetUserId: id,
      targetEmail: targetUser?.email ?? null,
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
