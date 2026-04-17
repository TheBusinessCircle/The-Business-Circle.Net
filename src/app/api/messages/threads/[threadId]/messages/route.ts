import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { directMessageSendSchema } from "@/lib/messages/validators";
import {
  publishMessagesThreadRefresh,
  publishMessagesUserRefresh
} from "@/lib/messages/ably-publisher";
import {
  isFileValue,
  MAX_DIRECT_MESSAGE_UPLOAD_COUNT,
  persistDirectMessageAttachment,
  sendDirectMessage
} from "@/server/messages";

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

  const rateLimit = await consumeRateLimit({
    key: `api:messages:send:${authResult.user.id}:${clientIpFromHeaders(request.headers)}`,
    limit: 40,
    windowMs: 60 * 1000
  });
  const headers = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "You are sending messages too quickly." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const formData = await request.formData();
  const parsed = directMessageSendSchema.safeParse({
    content: String(formData.get("content") || "")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400, headers });
  }

  const files = formData.getAll("attachments").filter(isFileValue);
  if (files.length > MAX_DIRECT_MESSAGE_UPLOAD_COUNT) {
    return NextResponse.json(
      { error: `Please keep uploads to ${MAX_DIRECT_MESSAGE_UPLOAD_COUNT} files or fewer.` },
      { status: 400, headers }
    );
  }

  try {
    const { threadId } = await params;
    const attachments = await Promise.all(
      files.map((file) => persistDirectMessageAttachment(file, threadId))
    );
    const message = await sendDirectMessage({
      threadId,
      senderId: authResult.user.id,
      content: parsed.data.content || "",
      attachments
    });

    await publishMessagesThreadRefresh(threadId, { type: "message.created" });
    await Promise.all(
      message.participantUserIds.map((userId) =>
        publishMessagesUserRefresh(userId, { type: "message.created", threadId })
      )
    );

    return NextResponse.json({ message }, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : "message-send-failed";
    const status =
      code === "thread-not-found" ? 404 : code === "message-empty" || code === "upload-too-large" || code === "invalid-upload-type" ? 400 : code === "direct-message-blocked" ? 403 : 500;

    return NextResponse.json(
      {
        error:
          code === "message-empty"
            ? "Add a message or attach a file before sending."
            : code === "upload-too-large"
              ? "One of the files is too large."
              : code === "invalid-upload-type"
                ? "That file type is not allowed in private chat."
                : code === "direct-message-blocked"
                  ? "Private chat is not available in this conversation."
                  : code === "thread-not-found"
                    ? "This private conversation is no longer available."
                    : code === "community-content-blocked"
                      ? "Please rewrite that message before sending."
                      : "Unable to send the message."
      },
      { status, headers }
    );
  }
}
