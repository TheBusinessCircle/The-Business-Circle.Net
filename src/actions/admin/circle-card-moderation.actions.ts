"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { circleCardModerationUpdateSchema } from "@/lib/circle-card/reports";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import { updateCircleCardReportForAdmin } from "@/server/circle-card/moderation.service";

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function resolveReturnPath(value: FormDataEntryValue | null | undefined) {
  return safeRedirectPath(typeof value === "string" ? value : null, "/admin/circle-card/moderation");
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function noticeForIntent(intent: string) {
  if (intent === "resolve") {
    return "report-resolved";
  }

  if (intent === "dismiss") {
    return "report-dismissed";
  }

  if (intent === "review") {
    return "report-reviewing";
  }

  return "report-notes-saved";
}

export async function updateCircleCardReportModerationAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = circleCardModerationUpdateSchema.safeParse({
    reportId: formData.get("reportId"),
    intent: formData.get("intent"),
    adminNotes: formData.get("adminNotes")
  });
  const returnPath = resolveReturnPath(formData.get("returnPath"));

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-report-action");
  }

  try {
    await updateCircleCardReportForAdmin({
      adminUserId: session.user.id,
      reportId: parsed.data.reportId,
      intent: parsed.data.intent,
      adminNotes: parsed.data.adminNotes
    });
  } catch {
    redirectWithError(returnPath, "report-not-found");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/circle-card/moderation");
  redirectWithNotice(returnPath, noticeForIntent(parsed.data.intent));
}
