export const CIRCLE_CARD_ACTIVITY_TYPES = [
  "CARD_CREATED",
  "CARD_UPDATED",
  "CONTACT_SAVED",
  "CONTACT_UPDATED",
  "CONNECTION_REQUEST_SENT",
  "CONNECTION_ACCEPTED",
  "RECOMMENDATION_CREATED",
  "RECOMMENDATION_RECEIVED",
  "INTRODUCTION_CREATED",
  "INTRODUCTION_ACCEPTED",
  "INTRODUCTION_DECLINED",
  "INTRODUCTION_COMPLETED",
  "REFERRAL_CREATED",
  "REFERRAL_RECEIVED",
  "REFERRAL_ACCEPTED",
  "REFERRAL_WON",
  "REFERRAL_LOST",
  "OPPORTUNITY_CREATED",
  "OPPORTUNITY_UPDATED",
  "OPPORTUNITY_WON",
  "OPPORTUNITY_LOST",
  "BUSINESS_CARD_SCANNED",
  "BUSINESS_CARD_CONTACT_CREATED",
  "SMART_LINK_CLICKED",
  "PRIVATE_LINK_UNLOCKED"
] as const;

export type CircleCardActivityTypeValue = (typeof CIRCLE_CARD_ACTIVITY_TYPES)[number];

export const CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "connections", label: "Connections" },
  { value: "wallet", label: "Wallet" },
  { value: "recommendations", label: "Recommendations" },
  { value: "introductions", label: "Introductions" },
  { value: "referrals", label: "Referrals" },
  { value: "opportunities", label: "Opportunities" },
  { value: "scanner", label: "Scanner" },
  { value: "files", label: "Files" }
] as const;

export type CircleCardActivityFilter = (typeof CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS)[number]["value"];

export const CIRCLE_CARD_ACTIVITY_FILTER_TYPE_MAP: Record<
  Exclude<CircleCardActivityFilter, "all">,
  readonly CircleCardActivityTypeValue[]
> = {
  connections: ["CONNECTION_REQUEST_SENT", "CONNECTION_ACCEPTED"],
  wallet: ["CONTACT_SAVED", "CONTACT_UPDATED"],
  recommendations: ["RECOMMENDATION_CREATED", "RECOMMENDATION_RECEIVED"],
  introductions: [
    "INTRODUCTION_CREATED",
    "INTRODUCTION_ACCEPTED",
    "INTRODUCTION_DECLINED",
    "INTRODUCTION_COMPLETED"
  ],
  referrals: ["REFERRAL_CREATED", "REFERRAL_RECEIVED", "REFERRAL_ACCEPTED", "REFERRAL_WON", "REFERRAL_LOST"],
  opportunities: ["OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED", "OPPORTUNITY_WON", "OPPORTUNITY_LOST"],
  scanner: ["BUSINESS_CARD_SCANNED", "BUSINESS_CARD_CONTACT_CREATED"],
  files: ["SMART_LINK_CLICKED", "PRIVATE_LINK_UNLOCKED"]
};

export function resolveCircleCardActivityFilter(value: string | undefined): CircleCardActivityFilter {
  return CIRCLE_CARD_ACTIVITY_FILTER_OPTIONS.some((option) => option.value === value)
    ? (value as CircleCardActivityFilter)
    : "all";
}

export function circleCardActivityTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "CARD_CREATED":
      return "Card created";
    case "CARD_UPDATED":
      return "Card updated";
    case "CONTACT_SAVED":
      return "Contact saved";
    case "CONTACT_UPDATED":
      return "Contact updated";
    case "CONNECTION_REQUEST_SENT":
      return "Connection request";
    case "CONNECTION_ACCEPTED":
      return "Connection accepted";
    case "RECOMMENDATION_CREATED":
      return "Recommendation created";
    case "RECOMMENDATION_RECEIVED":
      return "Recommendation received";
    case "INTRODUCTION_CREATED":
      return "Introduction created";
    case "INTRODUCTION_ACCEPTED":
      return "Introduction accepted";
    case "INTRODUCTION_DECLINED":
      return "Introduction declined";
    case "INTRODUCTION_COMPLETED":
      return "Introduction completed";
    case "REFERRAL_CREATED":
      return "Referral created";
    case "REFERRAL_RECEIVED":
      return "Referral received";
    case "REFERRAL_ACCEPTED":
      return "Referral accepted";
    case "REFERRAL_WON":
      return "Referral won";
    case "REFERRAL_LOST":
      return "Referral lost";
    case "OPPORTUNITY_CREATED":
      return "Opportunity created";
    case "OPPORTUNITY_UPDATED":
      return "Opportunity updated";
    case "OPPORTUNITY_WON":
      return "Opportunity won";
    case "OPPORTUNITY_LOST":
      return "Opportunity lost";
    case "BUSINESS_CARD_SCANNED":
      return "Business card scanned";
    case "BUSINESS_CARD_CONTACT_CREATED":
      return "Scanned contact created";
    case "SMART_LINK_CLICKED":
      return "Smart link clicked";
    case "PRIVATE_LINK_UNLOCKED":
      return "Private link unlocked";
    default:
      return "Activity";
  }
}

export function circleCardActivityHref(activity: {
  type: string | null | undefined;
  entityType?: string | null;
  entityId?: string | null;
}) {
  if (activity.entityType === "WALLET_CONTACT" && activity.entityId) {
    return `/dashboard/circle-card/wallet?contactId=${encodeURIComponent(activity.entityId)}`;
  }

  switch (activity.type) {
    case "CARD_CREATED":
    case "CARD_UPDATED":
      return "/dashboard/circle-card?section=my-card#public-card";
    case "CONTACT_SAVED":
    case "CONTACT_UPDATED":
      return "/dashboard/circle-card/wallet";
    case "CONNECTION_REQUEST_SENT":
    case "CONNECTION_ACCEPTED":
      return "/dashboard/circle-card?section=network#connect-hub";
    case "RECOMMENDATION_CREATED":
    case "RECOMMENDATION_RECEIVED":
      return "/dashboard/circle-card/wallet?view=recommended";
    case "INTRODUCTION_CREATED":
    case "INTRODUCTION_ACCEPTED":
    case "INTRODUCTION_DECLINED":
    case "INTRODUCTION_COMPLETED":
      return "/dashboard/circle-card?section=network#introductions";
    case "REFERRAL_CREATED":
    case "REFERRAL_RECEIVED":
    case "REFERRAL_ACCEPTED":
    case "REFERRAL_WON":
    case "REFERRAL_LOST":
      return "/dashboard/circle-card?section=business#referrals";
    case "OPPORTUNITY_CREATED":
    case "OPPORTUNITY_UPDATED":
    case "OPPORTUNITY_WON":
    case "OPPORTUNITY_LOST":
      return "/dashboard/circle-card?section=business#opportunities";
    case "BUSINESS_CARD_SCANNED":
    case "BUSINESS_CARD_CONTACT_CREATED":
      return "/dashboard/circle-card?section=network#connect-hub";
    case "SMART_LINK_CLICKED":
    case "PRIVATE_LINK_UNLOCKED":
      return "/dashboard/circle-card?section=my-card#custom-links";
    default:
      return "/dashboard/circle-card?section=network#activity";
  }
}
