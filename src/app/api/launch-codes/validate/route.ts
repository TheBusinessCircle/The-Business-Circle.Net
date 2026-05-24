import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isTrustedOrigin } from "@/lib/security/origin";
import { validateLaunchCode } from "@/server/admin/launch-codes.service";

export const runtime = "nodejs";

const payloadSchema = z.object({
  code: z.string().trim().max(64),
  email: z.string().trim().email().optional(),
  selectedTier: z.enum(["FOUNDATION", "INNER_CIRCLE", "CORE"]).optional()
});

function messageForReason(reason: string) {
  if (reason === "full") {
    return "This Founder Access code has now reached its limit. You can still join on the standard membership price.";
  }
  if (reason === "paused" || reason === "expired" || reason === "archived" || reason === "not-started") {
    return "This Founder Access code is no longer active. You can still join on the standard membership price.";
  }
  if (reason === "already-used") {
    return "This Founder Access code has already been used for this account.";
  }
  return "That Founder Access code is not valid. Please check it and try again.";
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, message: "That Founder Access code is not valid. Please check it and try again." },
      { status: 400 }
    );
  }

  const session = await auth().catch(() => null);
  const result = await validateLaunchCode({
    code: parsed.data.code,
    email: parsed.data.email ?? session?.user?.email ?? null,
    userId: session?.user?.id ?? null
  });

  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      reason: result.reason,
      message: messageForReason(result.reason)
    });
  }

  return NextResponse.json({
    valid: true,
    message:
      "Founder Access applied. Your first 3 months are included, then your selected membership continues as normal.",
    launchCode: result.launchCode
  });
}
