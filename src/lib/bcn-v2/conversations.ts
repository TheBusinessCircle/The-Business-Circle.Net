import { z } from "zod";
const id = z.string().cuid();
export const conversationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rules") }).strict(),
  z
    .object({
      action: z.literal("request"),
      profileId: id,
      intro: z.string().trim().min(20).max(1200),
    })
    .strict(),
  z
    .object({
      action: z.literal("respond"),
      requestId: id,
      choice: z.enum(["accept", "decline", "block"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("send"),
      threadId: id,
      content: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z
    .object({
      action: z.literal("archive"),
      threadId: id,
      archived: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("block"), threadId: id }).strict(),
  z
    .object({
      action: z.literal("report"),
      threadId: id.optional(),
      requestId: id.optional(),
      detail: z.string().trim().min(10).max(1000),
    })
    .strict(),
]);
