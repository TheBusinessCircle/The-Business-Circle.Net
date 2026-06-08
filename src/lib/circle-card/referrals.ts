import { z } from "zod";
import { normalizeCircleCardUrl } from "@/lib/circle-card/schema";

export const CIRCLE_CARD_REFERRAL_REASON_MAX_LENGTH = 800;
export const CIRCLE_CARD_REFERRAL_STATUSES = [
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "WON",
  "LOST",
  "CANCELLED"
] as const;
export const CIRCLE_CARD_REFERRAL_VISIBILITIES = ["PRIVATE", "PUBLIC_SUCCESS"] as const;
export const CIRCLE_CARD_REFERRAL_STATUS_ACTIONS = [
  "ACCEPTED",
  "DECLINED",
  "WON",
  "LOST",
  "CANCELLED"
] as const;
export const CIRCLE_CARD_REFERRAL_OPEN_STATUSES = ["SENT", "ACCEPTED"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalEmail = z.string().trim().email().max(320).optional().or(z.literal(""));
const optionalWebsite = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform((value) => normalizeCircleCardUrl(value))
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Website must be a valid web address." }
  );
const optionalMoney = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d{1,9}(?:\.\d{1,2})?$/.test(value), {
    message: "Use a positive value with up to 2 decimal places."
  });

export const circleCardReferralFormSchema = z.object({
  recipientWalletContactId: z.string().cuid().optional().or(z.literal("")),
  recipientCardId: z.string().cuid().optional().or(z.literal("")),
  referredContactName: z.string().trim().min(2).max(140),
  referredContactBusiness: optionalText(140),
  referredContactEmail: optionalEmail,
  referredContactPhone: optionalText(48),
  referredContactWebsite: optionalWebsite,
  reason: z.string().trim().min(10).max(CIRCLE_CARD_REFERRAL_REASON_MAX_LENGTH),
  estimatedValue: optionalMoney,
  visibility: z.enum(CIRCLE_CARD_REFERRAL_VISIBILITIES).default("PRIVATE"),
  returnPath: optionalText(600),
  source: optionalText(80)
});

export const circleCardReferralStatusSchema = z.object({
  referralId: z.string().cuid(),
  status: z.enum(CIRCLE_CARD_REFERRAL_STATUS_ACTIONS),
  actualValue: optionalMoney,
  visibility: z.enum(CIRCLE_CARD_REFERRAL_VISIBILITIES).optional().or(z.literal("")),
  returnPath: optionalText(600)
});

export function circleCardReferralStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "SENT":
      return "Sent";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Referral";
  }
}

export function circleCardReferralVisibilityLabel(value: string | null | undefined) {
  return value === "PUBLIC_SUCCESS" ? "Public success if won" : "Private";
}

export function circleCardReferralEventTypeForStatus(
  status: (typeof CIRCLE_CARD_REFERRAL_STATUS_ACTIONS)[number]
) {
  switch (status) {
    case "ACCEPTED":
      return "REFERRAL_ACCEPTED";
    case "DECLINED":
      return "REFERRAL_DECLINED";
    case "WON":
      return "REFERRAL_WON";
    case "LOST":
      return "REFERRAL_LOST";
    case "CANCELLED":
      return "REFERRAL_CANCELLED";
  }
}
