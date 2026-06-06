export const CIRCLE_CARD_EVENT_TYPES = [
  "CARD_VIEW",
  "QR_VIEW",
  "VCARD_DOWNLOAD",
  "SHARE",
  "WEBSITE_CLICK",
  "EMAIL_CLICK",
  "PHONE_CLICK",
  "CUSTOM_LINK_CLICK",
  "WALLET_SAVE",
  "WALLET_REMOVE"
] as const;

export type CircleCardEventTypeValue = (typeof CIRCLE_CARD_EVENT_TYPES)[number];

export const CIRCLE_CARD_EVENT_LABELS: Record<CircleCardEventTypeValue, string> = {
  CARD_VIEW: "Viewed card",
  QR_VIEW: "Viewed QR code",
  VCARD_DOWNLOAD: "Downloaded contact",
  SHARE: "Shared card",
  WEBSITE_CLICK: "Clicked website",
  EMAIL_CLICK: "Clicked email",
  PHONE_CLICK: "Clicked phone",
  CUSTOM_LINK_CLICK: "Clicked custom link",
  WALLET_SAVE: "Saved to wallet",
  WALLET_REMOVE: "Removed from wallet"
};
