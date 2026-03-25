import { NextResponse } from "next/server";
import { passwordResetConfirmSchema } from "@/lib/auth/schemas";
import { confirmPasswordReset } from "@/lib/auth/password-reset";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";

const PASSWORD_RESET_CONFIRM_LIMIT = {
  limit: 12,
  windowMs: 10 * 60 * 1000
} as const;

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Untrusted request origin."
      },
      { status: 403 }
    );
  }

  const clientIp = clientIpFromHeaders(request.headers);
  const rateLimit = await consumeRateLimit({
    key: `api:auth:reset-password:ip:${clientIp}`,
    ...PASSWORD_RESET_CONFIRM_LIMIT
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many reset attempts. Please try again later."
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = passwordResetConfirmSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid password reset payload.",
        fieldErrors: parsed.error.flatten().fieldErrors
      },
      { status: 400, headers }
    );
  }

  try {
    const result = await confirmPasswordReset({
      email: parsed.data.email,
      token: parsed.data.token,
      password: parsed.data.password
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error
        },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Password updated. You can now sign in."
      },
      { headers }
    );
  } catch (error) {
    logServerError("reset-password-confirmation-failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to reset password right now. Please request a new reset link."
      },
      { status: 500, headers }
    );
  }
}
