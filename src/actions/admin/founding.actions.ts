"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import { updateFoundingOfferSettings } from "@/server/founding";

const updateFoundingSettingsSchema = z.object({
  returnPath: z.string().optional(),
  enabled: z.boolean(),
  foundationLimit: z.number().int().min(0).max(5000),
  innerCircleLimit: z.number().int().min(0).max(5000),
  coreLimit: z.number().int().min(0).max(5000),
  foundationFoundingPrice: z.number().int().min(0).max(5000),
  innerCircleFoundingPrice: z.number().int().min(0).max(5000),
  coreFoundingPrice: z.number().int().min(0).max(5000)
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(path: string | undefined, fallback = "/admin/founding") {
  return safeRedirectPath(path, fallback);
}

export async function updateFoundingOfferSettingsAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateFoundingSettingsSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    enabled: Boolean(formData.get("enabled")),
    foundationLimit: Number(formData.get("foundationLimit") || 0),
    innerCircleLimit: Number(formData.get("innerCircleLimit") || 0),
    coreLimit: Number(formData.get("coreLimit") || 0),
    foundationFoundingPrice: Number(formData.get("foundationFoundingPrice") || 0),
    innerCircleFoundingPrice: Number(formData.get("innerCircleFoundingPrice") || 0),
    coreFoundingPrice: Number(formData.get("coreFoundingPrice") || 0)
  });

  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(appendQueryParam(returnPath, "error", "invalid"));
  }

  try {
    await updateFoundingOfferSettings(parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "founding-limit-below-claimed") {
      redirect(appendQueryParam(returnPath, "error", "limit-below-claimed"));
    }

    throw error;
  }

  revalidatePath("/admin/founding");
  revalidatePath("/membership");
  revalidatePath("/join");
  revalidatePath("/");
  redirect(appendQueryParam(returnPath, "notice", "founding-settings-updated"));
}
