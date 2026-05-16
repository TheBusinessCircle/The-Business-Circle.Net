"use server";

import { revalidatePath } from "next/cache";
import {
  COMMUNITY_SAFETY_CONFIRMATIONS,
  communityContentIdSchema,
  communitySafetyErrorState,
  communitySafetySuccessState,
  isValidCommunitySafetyConfirmation,
  readCommunitySafetyFormString,
  type CommunitySafetyActionState
} from "@/actions/admin/community-safety.shared";
import { requireAdmin } from "@/lib/session";
import {
  deleteAllCommunityCommentsForAdmin,
  deleteAllCommunityPostsAndCommentsForAdmin,
  deleteCommunityCommentForAdmin,
  deleteCommunityPostForAdmin,
  type CommunitySafetyDeleteResult
} from "@/server/community/community-safety-admin.service";

function revalidateCommunitySafetySurface(result?: CommunitySafetyDeleteResult) {
  revalidatePath("/admin");
  revalidatePath("/admin/community");
  revalidatePath("/community");
  revalidatePath("/dashboard");

  if (result?.affectedPath) {
    revalidatePath(result.affectedPath);
  }

  if (result?.affectedChannelPath) {
    revalidatePath(result.affectedChannelPath);
  }
}

function invalidConfirmationState(expected: string) {
  return communitySafetyErrorState(`Type ${expected} to confirm this action.`);
}

async function runSafely(
  task: () => Promise<CommunitySafetyDeleteResult>,
  successMessage: string
): Promise<CommunitySafetyActionState> {
  try {
    const result = await task();
    revalidateCommunitySafetySurface(result);

    return communitySafetySuccessState({
      message: successMessage,
      postsRemoved: result.postsRemoved,
      commentsRemoved: result.commentsRemoved,
      completedAt: result.completedAt
    });
  } catch {
    return communitySafetyErrorState(
      "The community safety action could not be completed. Check the item still exists and try again."
    );
  }
}

export async function deleteAllCommunityComments(
  _previousState: CommunitySafetyActionState,
  formData: FormData
): Promise<CommunitySafetyActionState> {
  const session = await requireAdmin();
  const confirmation = readCommunitySafetyFormString(formData, "confirmation");

  if (
    !isValidCommunitySafetyConfirmation(
      confirmation,
      COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments
    )
  ) {
    return invalidConfirmationState(COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments);
  }

  return runSafely(
    () => deleteAllCommunityCommentsForAdmin({ adminUserId: session.user.id }),
    "Community comments have been removed from member view."
  );
}

export async function deleteAllCommunityPostsAndComments(
  _previousState: CommunitySafetyActionState,
  formData: FormData
): Promise<CommunitySafetyActionState> {
  const session = await requireAdmin();
  const confirmation = readCommunitySafetyFormString(formData, "confirmation");

  if (
    !isValidCommunitySafetyConfirmation(
      confirmation,
      COMMUNITY_SAFETY_CONFIRMATIONS.deleteCommunity
    )
  ) {
    return invalidConfirmationState(COMMUNITY_SAFETY_CONFIRMATIONS.deleteCommunity);
  }

  return runSafely(
    () => deleteAllCommunityPostsAndCommentsForAdmin({ adminUserId: session.user.id }),
    "Community posts and comments have been removed from member view."
  );
}

export async function deleteCommunityPost(
  _previousState: CommunitySafetyActionState,
  formData: FormData
): Promise<CommunitySafetyActionState> {
  const session = await requireAdmin();
  const parsedPostId = communityContentIdSchema.safeParse(
    readCommunitySafetyFormString(formData, "postId")
  );
  const confirmation = readCommunitySafetyFormString(formData, "confirmation");

  if (!parsedPostId.success) {
    return communitySafetyErrorState("The post could not be identified safely.");
  }

  if (
    !isValidCommunitySafetyConfirmation(confirmation, COMMUNITY_SAFETY_CONFIRMATIONS.deletePost)
  ) {
    return invalidConfirmationState(COMMUNITY_SAFETY_CONFIRMATIONS.deletePost);
  }

  return runSafely(
    () =>
      deleteCommunityPostForAdmin({
        adminUserId: session.user.id,
        postId: parsedPostId.data
      }),
    "The community post has been removed from member view."
  );
}

export async function deleteCommunityComment(
  _previousState: CommunitySafetyActionState,
  formData: FormData
): Promise<CommunitySafetyActionState> {
  const session = await requireAdmin();
  const parsedCommentId = communityContentIdSchema.safeParse(
    readCommunitySafetyFormString(formData, "commentId")
  );
  const confirmation = readCommunitySafetyFormString(formData, "confirmation");

  if (!parsedCommentId.success) {
    return communitySafetyErrorState("The comment could not be identified safely.");
  }

  if (
    !isValidCommunitySafetyConfirmation(
      confirmation,
      COMMUNITY_SAFETY_CONFIRMATIONS.deleteComment
    )
  ) {
    return invalidConfirmationState(COMMUNITY_SAFETY_CONFIRMATIONS.deleteComment);
  }

  return runSafely(
    () =>
      deleteCommunityCommentForAdmin({
        adminUserId: session.user.id,
        commentId: parsedCommentId.data
      }),
    "The community comment has been removed from member view."
  );
}
