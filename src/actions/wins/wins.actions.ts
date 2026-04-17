"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin, requireUser } from "@/lib/session";
import { winCreditResponseSchema, winFormSchema, winModerationSchema } from "@/lib/wins/validators";
import { isFileValue, MAX_WIN_UPLOAD_COUNT, persistWinAttachment } from "@/server/messages";
import {
  moderateWinStatus,
  respondToWinCredit,
  saveWinDraft
} from "@/server/wins";

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

export async function saveWinAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/wins");
  const creditedUserIds = formData
    .getAll("creditedUserIds")
    .map((value) => String(value))
    .filter(Boolean);
  const parsed = winFormSchema.safeParse({
    winId: String(formData.get("winId") || ""),
    threadId: String(formData.get("threadId") || ""),
    title: String(formData.get("title") || ""),
    summary: String(formData.get("summary") || ""),
    category: String(formData.get("category") || ""),
    tagsInput: String(formData.get("tagsInput") || ""),
    quote: String(formData.get("quote") || ""),
    creditedUserIds,
    intent: String(formData.get("intent") || "")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-win");
  }

  const files = formData.getAll("attachments").filter(isFileValue);
  if (files.length > MAX_WIN_UPLOAD_COUNT) {
    redirectWithError(returnPath, "too-many-attachments");
  }

  try {
    let persistedWin = await saveWinDraft({
      authorId: session.user.id,
      winId: parsed.data.winId || null,
      threadId: parsed.data.threadId || null,
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      tagsInput: parsed.data.tagsInput || "",
      quote: parsed.data.quote || null,
      creditedUserIds: parsed.data.creditedUserIds,
      intent: parsed.data.intent,
      attachments: []
    });

    if (files.length) {
      persistedWin = await saveWinDraft({
        authorId: session.user.id,
        winId: persistedWin.id,
        threadId: parsed.data.threadId || null,
        title: parsed.data.title,
        summary: parsed.data.summary,
        category: parsed.data.category,
        tagsInput: parsed.data.tagsInput || "",
        quote: parsed.data.quote || null,
        creditedUserIds: parsed.data.creditedUserIds,
        intent: parsed.data.intent,
        attachments: await Promise.all(files.map((file) => persistWinAttachment(file, persistedWin.id)))
      });
    }

    revalidatePath("/wins");
    revalidatePath("/messages");
    if (persistedWin.sourceThreadId) {
      revalidatePath(`/messages/${persistedWin.sourceThreadId}`);
    }

    if (parsed.data.intent === "publish") {
      redirect(`/wins/${persistedWin.slug}?notice=win-saved`);
    }

    redirect(`/wins/new?draft=${persistedWin.id}&notice=win-draft-saved`);
  } catch (error) {
    const code = error instanceof Error ? error.message : "win-save-failed";
    redirectWithError(
      returnPath,
      code === "thread-not-found" ? "thread-not-found" : "win-save-failed"
    );
  }
}

export async function respondToWinCreditAction(formData: FormData) {
  const session = await requireUser();
  const winId = String(formData.get("winId") || "");
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/wins");
  const parsed = winCreditResponseSchema.safeParse({
    decision: String(formData.get("decision") || "")
  });

  if (!winId || !parsed.success) {
    redirectWithError(returnPath, "invalid-credit-response");
  }

  try {
    await respondToWinCredit({
      winId,
      userId: session.user.id,
      decision: parsed.data.decision
    });
    revalidatePath("/wins");
    redirectWithNotice(returnPath, "credit-response-saved");
  } catch {
    redirectWithError(returnPath, "credit-response-failed");
  }
}

export async function moderateWinStatusAction(formData: FormData) {
  const session = await requireAdmin();
  const winId = String(formData.get("winId") || "");
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/admin/wins");
  const parsed = winModerationSchema.safeParse({
    status: String(formData.get("status") || ""),
    notes: String(formData.get("notes") || "")
  });

  if (!winId || !parsed.success) {
    redirectWithError(returnPath, "invalid-win-moderation");
  }

  try {
    await moderateWinStatus({
      adminUserId: session.user.id,
      winId,
      status: parsed.data.status,
      notes: parsed.data.notes || null
    });
    revalidatePath("/admin/wins");
    revalidatePath("/wins");
    redirectWithNotice(returnPath, "win-moderated");
  } catch {
    redirectWithError(returnPath, "win-moderation-failed");
  }
}
