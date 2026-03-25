import { NextResponse } from "next/server";
import { passwordResetRequestSchema } from "@/lib/auth/schemas";
import { normalizeEmail } from "@/lib/auth/utils";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";

export const runtime = "nodejs";

const PASSWORD_RESET_REQUEST_LIMIT = {
  limit: 8,
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
    key: `api:auth:forgot-password:ip:${clientIp}`,
    ...PASSWORD_RESET_REQUEST_LIMIT
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
  const parsed = passwordResetRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid password reset request."
      },
      { status: 400, headers }
    );
  }

  const email = normalizeEmail(parsed.data.email);

  try {
    const result = await requestPasswordReset({
      email,
      requestedIp: clientIp
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    logServerError("forgot-password-request-failed", error);
    return NextResponse.json(
      {
        ok: true,
        message:
          "If an account exists with that email, a password reset link has been sent."
      },
      { headers }
    );
  }
}
