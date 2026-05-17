"use server";

import { InboundEmailStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import { updateInboundEmailStatusForAdmin } from "@/server/inbound-email";

const statusActionSchema = z.object({
  emailId: z.string().cuid(),
  status: z.nativeEnum(InboundEmailStatus),
  returnPath: z.string().optional()
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function revalidateEmailInbox(emailId?: string) {
  revalidatePath("/admin/emails");
  if (emailId) {
    revalidatePath(`/admin/emails/${emailId}`);
  }
}

export async function updateInboundEmailStatusAction(formData: FormData) {
  await requireAdmin();

  const parsed = statusActionSchema.safeParse({
    emailId: formData.get("emailId"),
    status: formData.get("status"),
    returnPath: formData.get("returnPath")
  });

  const fallbackReturnPath = safeRedirectPath(
    typeof formData.get("returnPath") === "string" ? String(formData.get("returnPath")) : undefined,
    "/admin/emails"
  );

  if (!parsed.success) {
    redirect(appendQueryParam(fallbackReturnPath, "error", "invalid"));
  }

  const returnPath = safeRedirectPath(parsed.data.returnPath, fallbackReturnPath);

  try {
    await updateInboundEmailStatusForAdmin(parsed.data.emailId, parsed.data.status);
  } catch {
    redirect(appendQueryParam(returnPath, "error", "not-found"));
  }

  revalidateEmailInbox(parsed.data.emailId);
  redirect(appendQueryParam(returnPath, "notice", "status-updated"));
}
