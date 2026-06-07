export const CIRCLE_CARD_EVENT_TYPES = [
  "CARD_VIEW",
  "QR_VIEW",
  "VCARD_DOWNLOAD",
  "SHARE",
  "WEBSITE_CLICK",
  "EMAIL_CLICK",
  "PHONE_CLICK",
  "CUSTOM_LINK_CLICK",
  "CUSTOM_LINK_UNLOCK_SUCCESS",
  "CUSTOM_LINK_UNLOCK_FAILED",
  "WALLET_SAVE",
  "WALLET_REMOVE",
  "CONNECTION_REQUEST_SENT",
  "CONNECTION_REQUEST_ACCEPTED",
  "CONNECTION_REQUEST_DECLINED",
  "CONNECTION_REQUEST_CANCELLED"
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
  CUSTOM_LINK_UNLOCK_SUCCESS: "Unlocked private link",
  CUSTOM_LINK_UNLOCK_FAILED: "Private link failed",
  WALLET_SAVE: "Saved to wallet",
  WALLET_REMOVE: "Removed from wallet",
  CONNECTION_REQUEST_SENT: "Connection request sent",
  CONNECTION_REQUEST_ACCEPTED: "Connection request accepted",
  CONNECTION_REQUEST_DECLINED: "Connection request declined",
  CONNECTION_REQUEST_CANCELLED: "Connection request cancelled"
};
