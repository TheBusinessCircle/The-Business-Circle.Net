import { requireApiUser } from "@/lib/auth/api";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
import { conversationActionSchema } from "@/lib/bcn-v2/conversations";
import { prisma } from "@/lib/prisma";
import { BCN_RULES_VERSION } from "@/config/legal";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { connectedPairCanTalk } from "@/server/bcn-v2/connections-policy";
import {
  createDirectMessageRequest,
  respondToDirectMessageRequest,
  sendDirectMessage,
  getDirectMessageThreadDetail,
  blockDirectMessageUser,
  reportDirectMessage,
  setDirectMessageArchiveState,
} from "@/server/messages";
import {
  publishMessagesThreadRefresh,
  publishMessagesUserRefresh,
} from "@/lib/messages/ably-publisher";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "conversations", 100);
  if (blocked) return blocked;
  const auth = await requireApiUser({
    allowUnentitled: true,
    requireVerifiedEmail: true,
  });
  if ("response" in auth) return auth.response;
  const userId = auth.user.id;
  try {
    const parsed = conversationActionSchema.safeParse(
      await boundedJson(request),
    );
    if (!parsed.success)
      return json(
        { error: "Check your conversation details and try again." },
        400,
      );
    const data = parsed.data;
    if (data.action === "rules") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          acceptedRulesAt: new Date(),
          acceptedRulesVersion: BCN_RULES_VERSION,
        },
      });
      return json({ ok: true });
    }
    // Blocking, declining and reporting always remain available for safety.
    if (
      !["block", "report", "archive"].includes(data.action) &&
      !(data.action === "respond" && data.choice !== "accept") &&
      !(await hasAcceptedBcnRules(userId))
    )
      return json(
        {
          error: "Read and accept the BCN rules before opening conversations.",
        },
        403,
      );
    if (
      process.env.PRIVATE_MESSAGING_ENABLED === "false" &&
      ["request", "send"].includes(data.action)
    )
      return json({ error: "New messages are temporarily paused." }, 503);
    if (data.action === "request") {
      const profile = await prisma.bcnBusinessProfile.findUnique({
        where: { id: data.profileId },
        select: { userId: true },
      });
      if (!profile)
        return json({ error: "This business is not accepting requests." }, 404);
      // Additional per-account limit prevents an owner using different networks to spam.
      const count = await prisma.directMessageRequest.count({
        where: {
          requesterId: userId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (count >= 10)
        return json(
          {
            error:
              "You have reached today's limit of 10 conversation requests. Give people time to reply.",
          },
          429,
        );
      const result = await createDirectMessageRequest({
        requesterId: userId,
        recipientId: profile.userId,
        originProfileId: data.profileId,
        introMessage: data.intro,
      });
      await publishMessagesUserRefresh(profile.userId, {
        type: "request.updated",
      });
      return json({
        ok: true,
        threadId: result.status === "existing-thread" ? result.threadId : null,
        message:
          result.status === "pending-existing"
            ? "A request is already waiting. Check your requests."
            : "Request sent. They choose whether to accept.",
      });
    }
    if (data.action === "respond") {
      const result = await respondToDirectMessageRequest({
        requestId: data.requestId,
        recipientId: userId,
        action: data.choice,
      });
      await publishMessagesUserRefresh(result.requesterId, {
        type: "request.updated",
      });
      return json({ ok: true, threadId: result.threadId });
    }
    if (data.action === "report" && data.requestId) {
      const item = await prisma.directMessageRequest.findFirst({
        where: {
          id: data.requestId,
          OR: [{ requesterId: userId }, { recipientId: userId }],
        },
        select: { requesterId: true, recipientId: true },
      });
      if (!item) return json({ error: "Request unavailable." }, 404);
      await reportDirectMessage({
        reporterId: userId,
        reportedUserId:
          item.requesterId === userId ? item.recipientId : item.requesterId,
        reason: "OTHER",
        detail: `Conversation request ${data.requestId}: ${data.detail}`,
      });
      return json({ ok: true, message: "Report submitted for moderation." });
    }
    if (!data.threadId) return json({ error: "Choose a conversation." }, 400);
    const thread = await getDirectMessageThreadDetail({
      threadId: data.threadId,
      userId,
    });
    if (!thread) return json({ error: "Conversation unavailable." }, 404);
    if (data.action === "send") {
      if (!(await connectedPairCanTalk(userId, thread.otherMember.id)))
        return json(
          {
            error:
              "This conversation is read-only. A participant is unavailable.",
          },
          403,
        );
      await sendDirectMessage({
        threadId: data.threadId,
        senderId: userId,
        content: data.content,
      });
      await publishMessagesThreadRefresh(data.threadId, {
        type: "message.created",
      });
    } else if (data.action === "block") {
      await blockDirectMessageUser({
        blockerId: userId,
        blockedUserId: thread.otherMember.id,
        reason: "Blocked from private conversation.",
      });
    } else if (data.action === "archive") {
      await setDirectMessageArchiveState({
        threadId: data.threadId,
        userId,
        archived: data.archived,
      });
    } else if (data.action === "report") {
      await reportDirectMessage({
        reporterId: userId,
        threadId: data.threadId,
        reportedUserId: thread.otherMember.id,
        reason: "OTHER",
        detail: data.detail,
      });
    }
    return json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return json(
      {
        error:
          code === "community-content-blocked"
            ? "Please rephrase that message respectfully."
            : "This request cannot be completed. The conversation or member may be unavailable.",
      },
      400,
    );
  }
}
