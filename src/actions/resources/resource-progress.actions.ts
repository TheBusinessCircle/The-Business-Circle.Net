"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { roleToTier } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import {
  markResourceAsReadForUser,
  markResourceAsUnreadForUser
} from "@/server/resources";

function resolveReturnPath(value: FormDataEntryValue | null, fallback: string) {
  return safeRedirectPath(typeof value === "string" ? value : undefined, fallback);
}

async function updateReadState(formData: FormData, mode: "read" | "unread") {
  const session = await requireUser();
  const slug = String(formData.get("slug") || "").trim();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/resources");
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  if (!slug) {
    redirect(returnPath);
  }

  if (mode === "read") {
    await markResourceAsReadForUser({
      userId: session.user.id,
      slug,
      membershipTier: effectiveTier
    });
  } else {
    await markResourceAsUnreadForUser({
      userId: session.user.id,
      slug,
      membershipTier: effectiveTier
    });
  }

  revalidatePath("/dashboard/resources");
  revalidatePath(returnPath.split("?")[0] || returnPath);
  redirect(returnPath);
}

export async function markResourceAsReadAction(formData: FormData) {
  await updateReadState(formData, "read");
}

export async function markResourceAsUnreadAction(formData: FormData) {
  await updateReadState(formData, "unread");
}
