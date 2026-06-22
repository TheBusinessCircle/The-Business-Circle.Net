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

export function circleCardNotificationTypeLabel(
  value: string | null | undefined,
  entityType?: string | null
) {
  if (value === "SYSTEM") {
    if (entityType?.startsWith("ACTIVATION_")) {
      return "Activation";
    }

    if (entityType?.startsWith("USAGE_")) {
      return "Usage";
    }

    if (entityType?.startsWith("UPGRADE_")) {
      return "Readiness";
    }
  }

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

export function circleCardNotificationHref(
  value: string | null | undefined,
  entityType?: string | null
) {
  if (value === "SYSTEM") {
    switch (entityType) {
      case "ACTIVATION_PROFILE_IMAGE":
        return "/dashboard/circle-card?section=my-card#circle-card-media";
      case "ACTIVATION_BIO":
      case "ACTIVATION_LOCATION":
        return "/dashboard/circle-card?section=my-card#circle-card-form";
      case "ACTIVATION_FEATURED_LINK":
        return "/dashboard/circle-card?section=my-card#featured-links";
      case "ACTIVATION_LOW_COMPLETION":
      case "ACTIVATION_FINISH_CARD":
      case "USAGE_PROFILE_PROGRESS":
        return "/dashboard/circle-card?section=home#circle-card-completion";
      case "USAGE_CARD_VIEWED":
      case "USAGE_FEATURED_LINK_CLICKED":
        return "/dashboard/circle-card?section=my-card#analytics";
      case "USAGE_CARD_SHARED":
      case "USAGE_SHARE_TODAY":
        return "/dashboard/circle-card?section=share#share-assets";
      case "USAGE_CONTACT_SAVED":
      case "USAGE_CIRCLE_GROWING":
        return "/dashboard/circle-card/wallet";
      case "USAGE_INACTIVE_7D":
        return "/dashboard/circle-card";
      case "UPGRADE_PRO_READINESS":
        return "/dashboard/circle-card?section=home#circle-card-upgrade-signals";
      case "UPGRADE_TEAMS_READINESS":
        return "/dashboard/circle-card?section=home#circle-card-upgrade-signals";
      default:
        break;
    }
  }

  switch (value) {
    case "CONNECTION_REQUEST":
    case "CONNECTION_ACCEPTED":
      return "/dashboard/circle-card?section=network#connect-hub";
    case "INTRODUCTION_RECEIVED":
    case "INTRODUCTION_ACCEPTED":
    case "INTRODUCTION_DECLINED":
      return "/dashboard/circle-card?section=network#introductions";
    case "REFERRAL_RECEIVED":
    case "REFERRAL_ACCEPTED":
    case "REFERRAL_WON":
    case "REFERRAL_LOST":
      return "/dashboard/circle-card?section=business#referrals";
    case "OPPORTUNITY_FOLLOWUP_DUE":
    case "OPPORTUNITY_UPDATED":
      return "/dashboard/circle-card?section=business#opportunities";
    case "RECOMMENDATION_RECEIVED":
      return "/dashboard/circle-card/wallet?view=recommended";
    default:
      return "/dashboard/circle-card";
  }
}
