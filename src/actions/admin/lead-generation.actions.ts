"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  parseLeadFollowUpDraftType,
  sendLeadFollowUpEmail,
  updateLeadForAdmin
} from "@/server/lead-generation";

const leadUpdateSchema = z.object({
  leadId: z.string().cuid(),
  status: z.nativeEnum(LeadStatus),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  tags: z.string().trim().max(1000).optional().or(z.literal("")),
  nextStep: z.string().trim().max(500).optional().or(z.literal("")),
  followUpDate: z.string().trim().max(10).optional().or(z.literal("")),
  returnPath: z.string().optional()
});

const leadFollowUpSendSchema = z.object({
  leadId: z.string().cuid(),
  draftType: z.string(),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(8000),
  returnPath: z.string().optional()
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function updateLeadGenerationLeadAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = safeRedirectPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/lead-generation"
  );
  const parsed = leadUpdateSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    notes: formData.get("notes"),
    tags: formData.has("tags") ? formData.get("tags") : undefined,
    nextStep: formData.has("nextStep") ? formData.get("nextStep") : undefined,
    followUpDate: formData.has("followUpDate") ? formData.get("followUpDate") : undefined,
    returnPath: formData.has("returnPath") ? formData.get("returnPath") : undefined
  });

  if (!parsed.success) {
    redirect(appendQueryParam(fallbackReturnPath, "error", "invalid"));
  }

  const returnPath = safeRedirectPath(parsed.data.returnPath, fallbackReturnPath);

  try {
    await updateLeadForAdmin({
      leadId: parsed.data.leadId,
      status: parsed.data.status,
      notes: parsed.data.notes,
      ...(formData.has("tags") ? { tags: parsed.data.tags } : {}),
      ...(formData.has("nextStep") ? { nextStep: parsed.data.nextStep } : {}),
      ...(formData.has("followUpDate") ? { followUpDate: parsed.data.followUpDate } : {})
    });
  } catch {
    redirect(appendQueryParam(returnPath, "error", "not-found"));
  }

  revalidatePath("/admin/lead-generation");
  revalidatePath(`/admin/lead-generation/${parsed.data.leadId}`);
  redirect(appendQueryParam(returnPath, "notice", "lead-updated"));
}

export async function sendLeadFollowUpEmailAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = safeRedirectPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/lead-generation"
  );
  const parsed = leadFollowUpSendSchema.safeParse({
    leadId: formData.get("leadId"),
    draftType: formData.get("draftType"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    returnPath: formData.has("returnPath") ? formData.get("returnPath") : undefined
  });

  if (!parsed.success) {
    redirect(appendQueryParam(fallbackReturnPath, "error", "invalid-email"));
  }

  const returnPath = safeRedirectPath(parsed.data.returnPath, fallbackReturnPath);
  let sendResult: Awaited<ReturnType<typeof sendLeadFollowUpEmail>>;

  try {
    sendResult = await sendLeadFollowUpEmail({
      leadId: parsed.data.leadId,
      draftType: parseLeadFollowUpDraftType(parsed.data.draftType),
      subject: parsed.data.subject,
      body: parsed.data.body
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.toLowerCase().includes("marketing")
      ? "marketing-consent-required"
      : message.toLowerCase().includes("do not contact")
        ? "do-not-contact"
        : "email-send-blocked";
    redirect(appendQueryParam(returnPath, "error", code));
  }

  if (sendResult.sent) {
    revalidatePath("/admin/lead-generation");
    revalidatePath(`/admin/lead-generation/${parsed.data.leadId}`);
    redirect(appendQueryParam(returnPath, "notice", "follow-up-sent"));
  }

  redirect(
    appendQueryParam(
      returnPath,
      "error",
      sendResult.skipped ? "email-not-configured" : "email-send-failed"
    )
  );
}
