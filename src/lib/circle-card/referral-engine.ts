export const CIRCLE_CARD_REFERRAL_COOKIE_CODE = "bcn_circle_referral_code";
export const CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID = "bcn_circle_referral_click_id";
export const CIRCLE_CARD_REFERRAL_COOKIE_SOURCE = "bcn_circle_referral_source";
export const CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export const CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES = [
  "CLICKED",
  "SIGNED_UP",
  "ACTIVATED"
] as const;

export type CircleCardReferralActivationStatus =
  (typeof CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES)[number];

const REFERRAL_CODE_PATTERN = /^[a-z0-9-]{2,120}$/;

export function normalizeCircleCardReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : "";
}

export function buildCircleCardReferralPath(code: string) {
  const normalized = normalizeCircleCardReferralCode(code);

  return normalized ? `/r/${normalized}` : "";
}

export function circleCardReferralStatusLabel(
  status: string | null | undefined
) {
  switch (status) {
    case "ACTIVATED":
      return "Activated";
    case "SIGNED_UP":
      return "Signed up";
    default:
      return "Clicked";
  }
}
