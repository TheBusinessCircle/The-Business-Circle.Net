"use server";

import { CommunityPromptTriggerSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { publishCommunityEvent } from "@/lib/community";
import { ensureCommunityRealtimePublisherConfigured } from "@/lib/community/ably-publisher";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { maybePublishQuietCommunityPrompt } from "@/server/community";

const deleteModerationMessageSchema = z.object({
  returnPath: z.string().optional(),
  messageId: z.string().cuid()
});

const runPromptCheckSchema = z.object({
  returnPath: z.string().optional()
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

function revalidateCommunityModerationSurface() {
  revalidatePath("/admin");
  revalidatePath("/admin/community");
  revalidatePath("/community");
}

export async function deleteModerationMessageAction(formData: FormData) {
  await requireAdmin();
  ensureCommunityRealtimePublisherConfigured();

  const parsed = deleteModerationMessageSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    messageId: String(formData.get("messageId") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/community"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  const message = await db.message.findUnique({
    where: { id: parsed.data.messageId },
    select: {
      id: true,
      deletedAt: true,
      channel: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!message || message.deletedAt) {
    redirectWithError(returnPath, "not-found");
  }

  await db.message.update({
    where: { id: message.id },
    data: {
      deletedAt: new Date(),
      editedAt: new Date(),
      isEdited: true,
      content: "[Message removed by admin]"
    }
  });

  await publishCommunityEvent({
    type: "message.deleted",
    channelSlug: message.channel.slug,
    messageId: message.id
  });

  revalidateCommunityModerationSurface();
  redirectWithNotice(returnPath, "message-deleted");
}

export async function runCommunityPromptCheckAction(formData: FormData) {
  const session = await requireAdmin();

  const parsed = runPromptCheckSchema.safeParse({
    returnPath: String(formData.get("returnPath") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/community"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  const post = await maybePublishQuietCommunityPrompt({
    actorUserId: session.user.id,
    triggerSource: CommunityPromptTriggerSource.ADMIN_MANUAL
  });

  revalidateCommunityModerationSurface();
  redirectWithNotice(returnPath, post ? "prompt-published" : "prompt-skipped");
}
