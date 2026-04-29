"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  resetBlueprintCardVotes,
  saveBlueprintManagerPayload
} from "@/server/blueprint";

const saveSchema = z.object({
  payload: z.string().min(2)
});

const resetVotesSchema = z.object({
  returnPath: z.string().optional(),
  cardId: z.string().min(1)
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function revalidateBlueprintSurfaces() {
  revalidatePath("/blueprint");
  revalidatePath("/admin/blueprint");
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

export async function saveBlueprintAction(formData: FormData) {
  await requireAdmin();

  const parsed = saveSchema.safeParse({
    payload: String(formData.get("payload") || "")
  });
  const returnPath = "/admin/blueprint";

  if (!parsed.success) {
    redirectWithError(returnPath, "blueprint-save-invalid");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(parsed.data.payload);
  } catch {
    redirectWithError(returnPath, "blueprint-save-invalid-json");
  }

  try {
    await saveBlueprintManagerPayload({ payload });
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectWithError(returnPath, "blueprint-save-invalid");
    }

    throw error;
  }

  revalidateBlueprintSurfaces();
  redirectWithNotice(returnPath, "blueprint-saved");
}

export async function resetBlueprintVotesAction(formData: FormData) {
  await requireAdmin();

  const parsed = resetVotesSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    cardId: String(formData.get("cardId") || "")
  });
  const returnPath = safeRedirectPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/blueprint"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "blueprint-reset-invalid");
  }

  await resetBlueprintCardVotes({
    cardId: parsed.data.cardId
  });

  revalidateBlueprintSurfaces();
  redirectWithNotice(returnPath, "blueprint-votes-reset");
}
