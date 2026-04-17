import { CollaborationStatus, DirectMessageReportReason } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

export const directMessageRequestSchema = z
  .object({
    recipientId: z.string().cuid(),
    originPostId: z.string().cuid().optional().or(z.literal("")),
    originCommentId: z.string().cuid().optional().or(z.literal("")),
    introMessage: optionalText(280)
  })
  .superRefine((value, ctx) => {
    if (!value.originPostId && !value.originCommentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A community context is required before continuing privately.",
        path: ["originPostId"]
      });
    }
  });

export const directMessageResponseSchema = z.object({
  action: z.enum(["accept", "decline", "block"])
});

export const directMessageSendSchema = z.object({
  content: z.string().trim().max(4000).optional().or(z.literal(""))
});

export const directMessageArchiveSchema = z.object({
  archived: z.coerce.boolean()
});

export const directMessageMuteSchema = z.object({
  muted: z.coerce.boolean()
});

export const directMessageCollaborationSchema = z.object({
  collaborationStatus: z.nativeEnum(CollaborationStatus),
  collaborationNotes: optionalText(1500)
});

export const directMessageReportSchema = z.object({
  threadId: z.string().cuid().optional().or(z.literal("")),
  messageId: z.string().cuid().optional().or(z.literal("")),
  reportedUserId: z.string().cuid().optional().or(z.literal("")),
  reason: z.nativeEnum(DirectMessageReportReason),
  detail: optionalText(1200)
});

export const directMessageBlockSchema = z.object({
  blockedUserId: z.string().cuid(),
  reason: optionalText(280)
});

export type DirectMessageRequestInput = z.infer<typeof directMessageRequestSchema>;
export type DirectMessageSendInput = z.infer<typeof directMessageSendSchema>;
