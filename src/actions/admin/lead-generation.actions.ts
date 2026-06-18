"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import { updateLeadForAdmin } from "@/server/lead-generation";

const leadUpdateSchema = z.object({
  leadId: z.string().cuid(),
  status: z.nativeEnum(LeadStatus),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
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
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirect(appendQueryParam(fallbackReturnPath, "error", "invalid"));
  }

  const returnPath = safeRedirectPath(parsed.data.returnPath, fallbackReturnPath);

  try {
    await updateLeadForAdmin({
      leadId: parsed.data.leadId,
      status: parsed.data.status,
      notes: parsed.data.notes
    });
  } catch {
    redirect(appendQueryParam(returnPath, "error", "not-found"));
  }

  revalidatePath("/admin/lead-generation");
  redirect(appendQueryParam(returnPath, "notice", "lead-updated"));
}
