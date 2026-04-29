"use server";

import { BlueprintVoteType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireUser } from "@/lib/session";
import {
  castBlueprintVote,
  createBlueprintDiscussionComment,
  deleteBlueprintDiscussionComment,
  toggleBlueprintDiscussionLike
} from "@/server/blueprint";

const voteSchema = z.object({
  returnPath: z.string().optional(),
  cardId: z.string().min(1),
  voteType: z.nativeEnum(BlueprintVoteType)
});

const commentSchema = z.object({
  returnPath: z.string().optional(),
  cardId: z.string().min(1),
  parentCommentId: z.string().optional().or(z.literal("")),
  content: z.string().trim().min(2).max(2000)
});

const likeSchema = z.object({
  returnPath: z.string().optional(),
  commentId: z.string().min(1)
});

const deleteCommentSchema = z.object({
  returnPath: z.string().optional(),
  commentId: z.string().min(1)
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined) {
  return safeRedirectPath(value, "/blueprint");
}

function revalidateBlueprint() {
  revalidatePath("/blueprint");
  revalidatePath("/admin/blueprint");
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

export async function castBlueprintVoteAction(formData: FormData) {
  const session = await requireUser();
  const parsed = voteSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    cardId: String(formData.get("cardId") || ""),
    voteType: String(formData.get("voteType") || "")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirectWithError(returnPath, "blueprint-vote-invalid");
  }

  try {
    await castBlueprintVote({
      cardId: parsed.data.cardId,
      userId: session.user.id,
      userRole: session.user.role,
      userTier: session.user.membershipTier,
      voteType: parsed.data.voteType
    });
  } catch (error) {
    if (error instanceof Error && error.message === "blueprint-vote-forbidden") {
      redirectWithError(returnPath, "blueprint-vote-locked");
    }

    if (error instanceof Error && error.message === "blueprint-card-not-found") {
      redirectWithError(returnPath, "blueprint-card-missing");
    }

    throw error;
  }

  revalidateBlueprint();
  redirectWithNotice(returnPath, "blueprint-vote-saved");
}

export async function createBlueprintDiscussionCommentAction(formData: FormData) {
  const session = await requireUser();
  const parsed = commentSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    cardId: String(formData.get("cardId") || ""),
    parentCommentId: String(formData.get("parentCommentId") || ""),
    content: String(formData.get("content") || "")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirectWithError(returnPath, "blueprint-comment-invalid");
  }

  try {
    await createBlueprintDiscussionComment({
      cardId: parsed.data.cardId,
      userId: session.user.id,
      userRole: session.user.role,
      userTier: session.user.membershipTier,
      parentCommentId: parsed.data.parentCommentId || null,
      content: parsed.data.content
    });
  } catch (error) {
    if (error instanceof Error && error.message === "blueprint-discussion-forbidden") {
      redirectWithError(returnPath, "blueprint-discussion-forbidden");
    }

    if (error instanceof Error && error.message === "blueprint-discussion-locked") {
      redirectWithError(returnPath, "blueprint-discussion-locked");
    }

    if (error instanceof Error && error.message === "blueprint-comment-forbidden") {
      redirectWithError(returnPath, "blueprint-comment-forbidden");
    }

    throw error;
  }

  revalidateBlueprint();
  redirectWithNotice(returnPath, "blueprint-comment-created");
}

export async function toggleBlueprintDiscussionLikeAction(formData: FormData) {
  const session = await requireUser();
  const parsed = likeSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    commentId: String(formData.get("commentId") || "")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success) {
    redirect(returnPath);
  }

  try {
    await toggleBlueprintDiscussionLike({
      commentId: parsed.data.commentId,
      userId: session.user.id,
      userRole: session.user.role,
      userTier: session.user.membershipTier
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("blueprint-")) {
      redirectWithError(returnPath, "blueprint-like-unavailable");
    }

    throw error;
  }

  revalidateBlueprint();
  redirect(returnPath);
}

export async function deleteBlueprintDiscussionCommentAction(formData: FormData) {
  const session = await requireUser();
  const parsed = deleteCommentSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    commentId: String(formData.get("commentId") || "")
  });
  const returnPath = resolveReturnPath(parsed.success ? parsed.data.returnPath : undefined);

  if (!parsed.success || session.user.role !== "ADMIN") {
    redirectWithError(returnPath, "blueprint-comment-delete-forbidden");
  }

  await deleteBlueprintDiscussionComment({
    commentId: parsed.data.commentId,
    adminUserId: session.user.id
  });

  revalidateBlueprint();
  redirectWithNotice(returnPath, "blueprint-comment-removed");
}
