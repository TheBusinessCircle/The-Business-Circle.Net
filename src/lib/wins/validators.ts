import { WinCategory } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

export const winFormSchema = z.object({
  winId: z.string().cuid().optional().or(z.literal("")),
  threadId: z.string().cuid().optional().or(z.literal("")),
  title: z.string().trim().min(4).max(140),
  summary: z.string().trim().min(12).max(1200),
  category: z.nativeEnum(WinCategory),
  tagsInput: optionalText(240),
  quote: optionalText(400),
  creditedUserIds: z.array(z.string().cuid()).default([]),
  intent: z.enum(["save_draft", "publish"])
});

export const winCreditResponseSchema = z.object({
  decision: z.enum(["approve", "decline"])
});

export const winModerationSchema = z.object({
  status: z.enum(["PUBLISHED", "ARCHIVED", "CHANGES_REQUESTED"]),
  notes: optionalText(800)
});

export type WinFormInput = z.infer<typeof winFormSchema>;
