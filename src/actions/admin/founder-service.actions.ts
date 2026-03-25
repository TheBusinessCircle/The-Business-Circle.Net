"use server";

import {
  FounderServicePaymentStatus,
  FounderServiceStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import { updateFounderServiceRequestForAdmin } from "@/server/founder";

const updateFounderRequestSchema = z.object({
  requestId: z.string().cuid(),
  returnPath: z.string().optional(),
  paymentStatus: z.nativeEnum(FounderServicePaymentStatus),
  serviceStatus: z.nativeEnum(FounderServiceStatus),
  adminNotes: z.string().trim().max(4000).optional().or(z.literal(""))
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback: string): string {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function revalidateFounderServiceAdminPaths(requestId: string) {
  revalidatePath("/admin/founder-services");
  revalidatePath(`/admin/founder-services/${requestId}`);
  revalidatePath("/founder");
}

export async function updateFounderServiceRequestAction(formData: FormData) {
  await requireAdmin();

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/founder-services"
  );

  const parsed = updateFounderRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    returnPath: formData.get("returnPath"),
    paymentStatus: formData.get("paymentStatus"),
    serviceStatus: formData.get("serviceStatus"),
    adminNotes: formData.get("adminNotes")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const returnPath = resolveReturnPath(parsed.data.returnPath, fallbackReturnPath);

  try {
    await updateFounderServiceRequestForAdmin({
      requestId: parsed.data.requestId,
      paymentStatus: parsed.data.paymentStatus,
      serviceStatus: parsed.data.serviceStatus,
      adminNotes: parsed.data.adminNotes
    });
  } catch {
    redirectWithError(returnPath, "not-found");
  }

  revalidateFounderServiceAdminPaths(parsed.data.requestId);
  redirectWithNotice(returnPath, "request-updated");
}
