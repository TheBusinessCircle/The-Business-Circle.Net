import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { directMessageRequestSchema } from "@/lib/messages/validators";
import { publishMessagesUserRefresh } from "@/lib/messages/ably-publisher";
import { logServerWarning } from "@/lib/security/logging";
import { createDirectMessageRequest, listDirectMessageRequests } from "@/server/messages";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireApiUser({ requiredTier: MembershipTier.FOUNDATION });
  if ("response" in authResult) {
    return authResult.response;
  }

  const requests = await listDirectMessageRequests({
    userId: authResult.user.id,
    direction: "all"
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const authResult = await requireApiUser({ requiredTier: MembershipTier.FOUNDATION });
  if ("response" in authResult) {
    return authResult.response;
  }

  const rateLimit = await consumeRateLimit({
    key: `api:messages:requests:${authResult.user.id}:${clientIpFromHeaders(request.headers)}`,
    limit: 12,
    windowMs: 10 * 60 * 1000
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many private chat requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const parsed = directMessageRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid private chat request." },
      { status: 400, headers }
    );
  }

  try {
    const result = await createDirectMessageRequest({
      requesterId: authResult.user.id,
      recipientId: parsed.data.recipientId,
      originPostId: parsed.data.originPostId || null,
      originCommentId: parsed.data.originCommentId || null,
      introMessage: parsed.data.introMessage || null
    });

    if (result.status === "created" || result.status === "pending-existing") {
      await publishMessagesUserRefresh(result.recipientId, { type: "request.updated" });
      await publishMessagesUserRefresh(result.requesterId, { type: "request.updated" });
    }

    return NextResponse.json(result, { headers });
  } catch (error) {
    const typedError =
      error instanceof Error
        ? (error as Error & { code?: string; blockReason?: string })
        : null;
    const code = typedError?.code ?? typedError?.message ?? "request-failed";
    const blockReason = typedError?.blockReason ?? null;

    if (
      process.env.NODE_ENV !== "production" &&
      (code === "recipient-not-verified" ||
        code === "member-unavailable" ||
        code === "direct-message-blocked" ||
        code === "email-verification-required")
    ) {
      logServerWarning("direct-message-request-rejected", {
        code,
        reason: blockReason,
        requesterId: authResult.user.id,
        recipientId: parsed.data.recipientId
      });
    }

    const status =
      code === "email-verification-required" ||
      code === "member-unavailable" ||
      code === "recipient-not-verified" ||
      code === "direct-message-blocked"
        ? 403
        : code === "invalid-direct-message-origin" || code === "cannot-message-self"
          ? 400
          : 500;

    return NextResponse.json(
      {
        error:
          code === "email-verification-required"
            ? "Verify your email before sending private chat requests."
            : code === "recipient-not-verified" || code === "member-unavailable"
              ? "That member is not available for private chat yet."
              : code === "direct-message-blocked"
                ? "Private chat is not available between these members."
                : code === "invalid-direct-message-origin"
                  ? "Private chat must begin from a real community interaction."
                  : code === "cannot-message-self"
                    ? "You cannot open a private chat with yourself."
                    : "Unable to send the private chat request."
      },
      { status, headers }
    );
  }
}
