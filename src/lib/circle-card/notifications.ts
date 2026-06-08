import { z } from "zod";

export const CIRCLE_CARD_NOTIFICATION_TYPES = [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "RECOMMENDATION_RECEIVED",
  "INTRODUCTION_RECEIVED",
  "INTRODUCTION_ACCEPTED",
  "INTRODUCTION_DECLINED",
  "REFERRAL_RECEIVED",
  "REFERRAL_ACCEPTED",
  "REFERRAL_WON",
  "REFERRAL_LOST",
  "OPPORTUNITY_FOLLOWUP_DUE",
  "OPPORTUNITY_UPDATED",
  "BUSINESS_CARD_CLAIMED",
  "SYSTEM"
] as const;

export type CircleCardNotificationTypeValue = (typeof CIRCLE_CARD_NOTIFICATION_TYPES)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const circleCardNotificationIdSchema = z.object({
  notificationId: z.string().cuid(),
  returnPath: optionalText(600)
});

export const circleCardNotificationMarkAllSchema = z.object({
  returnPath: optionalText(600)
});

export function circleCardNotificationTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "CONNECTION_REQUEST":
      return "Connection request";
    case "CONNECTION_ACCEPTED":
      return "Connection accepted";
    case "RECOMMENDATION_RECEIVED":
      return "Recommendation";
    case "INTRODUCTION_RECEIVED":
      return "Introduction";
    case "INTRODUCTION_ACCEPTED":
      return "Introduction accepted";
    case "INTRODUCTION_DECLINED":
      return "Introduction declined";
    case "REFERRAL_RECEIVED":
      return "Referral";
    case "REFERRAL_ACCEPTED":
      return "Referral accepted";
    case "REFERRAL_WON":
      return "Referral won";
    case "REFERRAL_LOST":
      return "Referral lost";
    case "OPPORTUNITY_FOLLOWUP_DUE":
      return "Follow-up due";
    case "OPPORTUNITY_UPDATED":
      return "Opportunity";
    case "BUSINESS_CARD_CLAIMED":
      return "Business card claimed";
    case "SYSTEM":
    default:
      return "System";
  }
}

export function circleCardNotificationHref(value: string | null | undefined) {
  switch (value) {
    case "CONNECTION_REQUEST":
    case "CONNECTION_ACCEPTED":
      return "/dashboard/circle-card?walletView=requests#wallet";
    case "INTRODUCTION_RECEIVED":
    case "INTRODUCTION_ACCEPTED":
    case "INTRODUCTION_DECLINED":
      return "/dashboard/circle-card#introductions";
    case "REFERRAL_RECEIVED":
    case "REFERRAL_ACCEPTED":
    case "REFERRAL_WON":
    case "REFERRAL_LOST":
      return "/dashboard/circle-card#referrals";
    case "OPPORTUNITY_FOLLOWUP_DUE":
    case "OPPORTUNITY_UPDATED":
      return "/dashboard/circle-card#opportunities";
    case "RECOMMENDATION_RECEIVED":
      return "/dashboard/circle-card#wallet";
    default:
      return "/dashboard/circle-card";
  }
}
