import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api";
import {
  adminEmailTestRequestSchema,
  sendAdminEmailTest
} from "@/server/admin/admin-email-tests.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireApiUser({
    adminOnly: true,
    allowUnentitled: true
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = adminEmailTestRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Enter a valid email address and select an email type."
      },
      { status: 400 }
    );
  }

  try {
    const result = await sendAdminEmailTest({
      adminUserId: authResult.user.id,
      emailType: parsed.data.emailType,
      recipientEmail: parsed.data.recipientEmail
    });

    return NextResponse.json({
      ok: true,
      message: `${result.definition.label} sent successfully.`,
      sentAt: result.sentAt,
      subject: result.subject,
      emailType: result.definition.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send the test email right now."
      },
      { status: 500 }
    );
  }
}
