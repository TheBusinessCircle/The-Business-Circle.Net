"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CommunityPostKind } from "@prisma/client";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  buildConnectionWinTags,
  buildConnectionWinTitle,
  serializeConnectionWin
} from "@/lib/connection-wins";
import { buildCommunityPostPath } from "@/lib/community-paths";
import { roleToTier } from "@/lib/permissions";
import { hasAcceptedBcnRules } from "@/lib/rules-acceptance";
import { requireUser } from "@/lib/session";
import {
  createCommunityComment,
  createCommunityPost,
  toggleCommunityCommentLike,
  toggleCommunityPostLike
} from "@/server/community";

const createPostSchema = z.object({
  returnPath: z.string().optional(),
  channelSlug: z.string().trim().min(2).max(120),
  title: z.string().trim().min(4).max(160),
  content: z.string().trim().min(12).max(4000),
  tags: z.string().trim().max(120).optional().or(z.literal(""))
});

const createCommentSchema = z.object({
  returnPath: z.string().optional(),
  postId: z.string().cuid(),
  parentCommentId: z.string().cuid().optional().or(z.literal("")),
  content: z.string().trim().min(2).max(2000)
});

const createConnectionWinSchema = z.object({
  returnPath: z.string().optional(),
  whatHappened: z.string().trim().min(8).max(320),
  whoConnectedWith: z.string().trim().min(3).max(160),
  whatChanged: z.string().trim().min(8).max(320),
  resultSoFar: z.string().trim().min(8).max(320)
});

const toggleLikeSchema = z.object({
  returnPath: z.string().optional(),
  postId: z.string().cuid()
});

const toggleCommentLikeSchema = z.object({
  returnPath: z.string().optional(),
  commentId: z.string().cuid()
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback = "/community") {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

async function requireRulesAcceptedOrRedirect(userId: string, returnPath: string) {
  if (!(await hasAcceptedBcnRules(userId))) {
    redirectWithError(returnPath, "bcn-rules-required");
  }
}

function normalizeRevalidationPath(path: string) {
  const url = new URL(path, "http://localhost");
  return url.pathname;
}

function revalidateCommunitySurfaces(extraPaths: string[] = []) {
  revalidatePath("/community");
  revalidatePath("/dashboard");

  for (const path of extraPaths) {
    revalidatePath(normalizeRevalidationPath(path));
  }
}

export async function createCommunityPostAction(formData: FormData) {
  const session = await requireUser();

  const parsed = createPostSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    channelSlug: String(formData.get("channelSlug") || ""),
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || ""),
    tags: String(formData.get("tags") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/community"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "post-invalid");
  }

  await requireRulesAcceptedOrRedirect(session.user.id, returnPath);

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  let createdPostId: string | null = null;

  try {
    const post = await createCommunityPost({
      channelSlug: parsed.data.channelSlug,
      userId: session.user.id,
      userRole: session.user.role,
      userTier: effectiveTier,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags
    });
    createdPostId = post.id;
  } catch (error) {
    if (error instanceof Error && error.message === "community-channel-forbidden") {
      redirectWithError(returnPath, "channel-forbidden");
    }

    if (error instanceof Error && error.message === "community-channel-readonly") {
      redirectWithError(returnPath, "channel-readonly");
    }

    if (error instanceof Error && error.message === "community-content-blocked") {
      redirectWithError(returnPath, "post-blocked");
    }

    throw error;
  }

  if (!createdPostId) {
    revalidateCommunitySurfaces();
    redirectWithNotice(returnPath, "post-created");
  }

  const postPath = buildCommunityPostPath(createdPostId, parsed.data.channelSlug);
  revalidateCommunitySurfaces([postPath]);
  redirectWithNotice(postPath, "post-created");
}

export async function createCommunityCommentAction(formData: FormData) {
  const session = await requireUser();

  const parsed = createCommentSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    postId: String(formData.get("postId") || ""),
    parentCommentId: String(formData.get("parentCommentId") || ""),
    content: String(formData.get("content") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/community"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "comment-invalid");
  }

  await requireRulesAcceptedOrRedirect(session.user.id, returnPath);

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  try {
    await createCommunityComment({
      postId: parsed.data.postId,
      userId: session.user.id,
      userTier: effectiveTier,
      content: parsed.data.content,
      parentCommentId: parsed.data.parentCommentId || null
    });
  } catch (error) {
    if (error instanceof Error && error.message === "community-post-forbidden") {
      redirectWithError(returnPath, "post-forbidden");
    }

    if (error instanceof Error && error.message === "community-comment-forbidden") {
      redirectWithError(returnPath, "comment-forbidden");
    }

    if (error instanceof Error && error.message === "community-content-blocked") {
      redirectWithError(returnPath, "comment-blocked");
    }

    throw error;
  }

  revalidateCommunitySurfaces([returnPath, `/community/post/${parsed.data.postId}`]);
  redirectWithNotice(returnPath, "comment-created");
}

export async function createConnectionWinAction(formData: FormData) {
  const session = await requireUser();

  const parsed = createConnectionWinSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    whatHappened: String(formData.get("whatHappened") || ""),
    whoConnectedWith: String(formData.get("whoConnectedWith") || ""),
    whatChanged: String(formData.get("whatChanged") || ""),
    resultSoFar: String(formData.get("resultSoFar") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/dashboard"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "connection-win-invalid");
  }

  await requireRulesAcceptedOrRedirect(session.user.id, returnPath);

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  try {
    await createCommunityPost({
      channelSlug: "wins-and-progress",
      userId: session.user.id,
      userRole: session.user.role,
      userTier: effectiveTier,
      title: buildConnectionWinTitle(parsed.data),
      content: serializeConnectionWin(parsed.data),
      tags: buildConnectionWinTags(),
      kind: CommunityPostKind.WIN
    });
  } catch (error) {
    if (error instanceof Error && error.message === "community-channel-forbidden") {
      redirectWithError(returnPath, "connection-win-unavailable");
    }

    throw error;
  }

  revalidateCommunitySurfaces();
  redirectWithNotice(returnPath, "connection-win-created");
}

export async function toggleCommunityPostLikeAction(formData: FormData) {
  const session = await requireUser();

  const parsed = toggleLikeSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    postId: String(formData.get("postId") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/community"
  );

  if (!parsed.success) {
    redirect(returnPath);
  }

  await requireRulesAcceptedOrRedirect(session.user.id, returnPath);

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  try {
    await toggleCommunityPostLike({
      postId: parsed.data.postId,
      userId: session.user.id,
      userTier: effectiveTier
    });
  } catch (error) {
    if (error instanceof Error && error.message === "community-post-forbidden") {
      redirectWithError(returnPath, "post-forbidden");
    }

    throw error;
  }

  revalidateCommunitySurfaces([returnPath, `/community/post/${parsed.data.postId}`]);
  redirect(returnPath);
}

export async function toggleCommunityCommentLikeAction(formData: FormData) {
  const session = await requireUser();

  const parsed = toggleCommentLikeSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    commentId: String(formData.get("commentId") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/community"
  );

  if (!parsed.success) {
    redirect(returnPath);
  }

  await requireRulesAcceptedOrRedirect(session.user.id, returnPath);

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);

  let postId: string;

  try {
    const result = await toggleCommunityCommentLike({
      commentId: parsed.data.commentId,
      userId: session.user.id,
      userTier: effectiveTier
    });
    postId = result.postId;
  } catch (error) {
    if (error instanceof Error && error.message === "community-comment-forbidden") {
      redirectWithError(returnPath, "comment-forbidden");
    }

    throw error;
  }

  revalidateCommunitySurfaces([returnPath, `/community/post/${postId}`]);
  redirect(returnPath);
}
