"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  publishMessagesThreadRefresh,
  publishMessagesUserRefresh
} from "@/lib/messages/ably-publisher";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  directMessageBlockSchema,
  directMessageCollaborationSchema,
  directMessageReportSchema
} from "@/lib/messages/validators";
import {
  blockDirectMessageUser,
  reportDirectMessage,
  respondToDirectMessageRequest,
  resolveDirectMessageReport,
  setDirectMessageArchiveState,
  setDirectMessageMuteState,
  updateDirectMessageCollaboration
} from "@/server/messages";

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function redirectWithNotice(path: string, notice: string): never {
  redirect(appendQueryParam(path, "notice", notice));
}

function redirectWithError(path: string, error: string): never {
  redirect(appendQueryParam(path, "error", error));
}

function resolveReturnPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  return safeRedirectPath(typeof value === "string" ? value : null, fallback);
}

function revalidateMessaging() {
  revalidatePath("/messages");
  revalidatePath("/messages/requests");
  revalidatePath("/admin/messages");
}

export async function respondToDirectMessageRequestAction(formData: FormData) {
  const session = await requireUser();
  const requestId = String(formData.get("requestId") || "");
  const action = String(formData.get("action") || "");
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/messages/requests");

  if (!requestId || !["accept", "decline", "block"].includes(action)) {
    redirectWithError(returnPath, "invalid-request-response");
  }

  try {
    const result = await respondToDirectMessageRequest({
      requestId,
      recipientId: session.user.id,
      action: action as "accept" | "decline" | "block"
    });

    await publishMessagesUserRefresh(result.requesterId, { type: "request.updated" });
    await publishMessagesUserRefresh(result.recipientId, { type: "request.updated" });
    if (result.threadId) {
      await publishMessagesThreadRefresh(result.threadId, { type: "thread.created" });
    }

    revalidateMessaging();

    if (action === "accept" && result.threadId) {
      redirect(`/messages/${result.threadId}?notice=request-accepted`);
    }

    redirectWithNotice(
      returnPath,
      action === "decline" ? "request-declined" : action === "block" ? "request-blocked" : "request-updated"
    );
  } catch {
    redirectWithError(returnPath, "request-response-failed");
  }
}

export async function archiveDirectMessageThreadAction(formData: FormData) {
  const session = await requireUser();
  const threadId = String(formData.get("threadId") || "");
  const archived = String(formData.get("archived") || "") === "true";
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/messages");

  if (!threadId) {
    redirectWithError(returnPath, "invalid-thread");
  }

  try {
    await setDirectMessageArchiveState({
      threadId,
      userId: session.user.id,
      archived
    });
    revalidateMessaging();
    revalidatePath(`/messages/${threadId}`);
    redirectWithNotice(returnPath, archived ? "chat-archived" : "chat-restored");
  } catch {
    redirectWithError(returnPath, "thread-update-failed");
  }
}

export async function muteDirectMessageThreadAction(formData: FormData) {
  const session = await requireUser();
  const threadId = String(formData.get("threadId") || "");
  const muted = String(formData.get("muted") || "") === "true";
  const returnPath = resolveReturnPath(formData.get("returnPath"), `/messages/${threadId}`);

  if (!threadId) {
    redirectWithError(returnPath, "invalid-thread");
  }

  try {
    await setDirectMessageMuteState({
      threadId,
      userId: session.user.id,
      muted
    });
    revalidateMessaging();
    revalidatePath(`/messages/${threadId}`);
    redirectWithNotice(returnPath, muted ? "chat-muted" : "chat-unmuted");
  } catch {
    redirectWithError(returnPath, "thread-update-failed");
  }
}

export async function updateDirectMessageCollaborationAction(formData: FormData) {
  const session = await requireUser();
  const threadId = String(formData.get("threadId") || "");
  const returnPath = resolveReturnPath(formData.get("returnPath"), `/messages/${threadId}`);
  const parsed = directMessageCollaborationSchema.safeParse({
    collaborationStatus: String(formData.get("collaborationStatus") || ""),
    collaborationNotes: String(formData.get("collaborationNotes") || "")
  });

  if (!threadId || !parsed.success) {
    redirectWithError(returnPath, "invalid-collaboration");
  }

  try {
    await updateDirectMessageCollaboration({
      threadId,
      userId: session.user.id,
      collaborationStatus: parsed.data.collaborationStatus,
      collaborationNotes: parsed.data.collaborationNotes || null
    });
    revalidatePath(`/messages/${threadId}`);
    redirectWithNotice(returnPath, "collaboration-updated");
  } catch {
    redirectWithError(returnPath, "thread-update-failed");
  }
}

export async function blockDirectMessageUserAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/messages");
  const parsed = directMessageBlockSchema.safeParse({
    blockedUserId: String(formData.get("blockedUserId") || ""),
    reason: String(formData.get("reason") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-block");
  }

  try {
    await blockDirectMessageUser({
      blockerId: session.user.id,
      blockedUserId: parsed.data.blockedUserId,
      reason: parsed.data.reason || null
    });
    revalidateMessaging();
    redirectWithNotice(returnPath, "user-blocked");
  } catch {
    redirectWithError(returnPath, "block-failed");
  }
}

export async function reportDirectMessageAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/messages");
  const parsed = directMessageReportSchema.safeParse({
    threadId: String(formData.get("threadId") || ""),
    messageId: String(formData.get("messageId") || ""),
    reportedUserId: String(formData.get("reportedUserId") || ""),
    reason: String(formData.get("reason") || ""),
    detail: String(formData.get("detail") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-report");
  }

  try {
    await reportDirectMessage({
      reporterId: session.user.id,
      threadId: parsed.data.threadId || null,
      messageId: parsed.data.messageId || null,
      reportedUserId: parsed.data.reportedUserId || null,
      reason: parsed.data.reason,
      detail: parsed.data.detail || null
    });
    revalidateMessaging();
    redirectWithNotice(returnPath, "report-submitted");
  } catch {
    redirectWithError(returnPath, "report-failed");
  }
}

export async function resolveDirectMessageReportAction(formData: FormData) {
  const session = await requireAdmin();
  const reportId = String(formData.get("reportId") || "");
  const action = String(formData.get("action") || "");
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/messages");

  if (!reportId || !["resolve", "dismiss"].includes(action)) {
    redirectWithError(returnPath, "invalid-report-moderation");
  }

  try {
    await resolveDirectMessageReport({
      adminUserId: session.user.id,
      reportId,
      action: action as "resolve" | "dismiss",
      notes: String(formData.get("notes") || "")
    });
    revalidatePath("/admin/messages");
    redirectWithNotice(returnPath, "report-updated");
  } catch {
    redirectWithError(returnPath, "report-moderation-failed");
  }
}
