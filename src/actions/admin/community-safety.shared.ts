import { z } from "zod";

export const COMMUNITY_SAFETY_CONFIRMATIONS = {
  deleteComments: "DELETE COMMENTS",
  deleteCommunity: "DELETE COMMUNITY",
  deletePost: "DELETE POST",
  deleteComment: "DELETE COMMENT"
} as const;

export type CommunitySafetyActionState = {
  status: "idle" | "success" | "error";
  message: string;
  postsRemoved?: number;
  commentsRemoved?: number;
  completedAt?: string;
};

export const COMMUNITY_SAFETY_IDLE_STATE: CommunitySafetyActionState = {
  status: "idle",
  message: ""
};

export const communityContentIdSchema = z
  .string()
  .trim()
  .min(4)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

export function readCommunitySafetyFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function isValidCommunitySafetyConfirmation(value: string, expected: string) {
  return value.trim() === expected;
}

export function communitySafetyErrorState(message: string): CommunitySafetyActionState {
  return {
    status: "error",
    message
  };
}

export function communitySafetySuccessState(input: {
  message: string;
  postsRemoved?: number;
  commentsRemoved?: number;
  completedAt: Date;
}): CommunitySafetyActionState {
  return {
    status: "success",
    message: input.message,
    postsRemoved: input.postsRemoved,
    commentsRemoved: input.commentsRemoved,
    completedAt: input.completedAt.toISOString()
  };
}
