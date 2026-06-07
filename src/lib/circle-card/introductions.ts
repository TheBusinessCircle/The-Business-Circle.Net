import { z } from "zod";

export const CIRCLE_CARD_INTRODUCTION_REASON_MAX_LENGTH = 600;

export const CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES = ["PENDING", "ACCEPTED"] as const;

export const circleCardIntroductionFormSchema = z.object({
  personAWalletContactId: z.string().cuid(),
  personBWalletContactId: z.string().cuid(),
  reason: z.string().trim().min(10).max(CIRCLE_CARD_INTRODUCTION_REASON_MAX_LENGTH),
  returnPath: z.string().trim().max(600).optional().or(z.literal(""))
});

export const circleCardIntroductionIdSchema = z.object({
  introductionId: z.string().cuid(),
  returnPath: z.string().trim().max(600).optional().or(z.literal(""))
});

export function circleCardIntroductionStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Introduction";
  }
}
