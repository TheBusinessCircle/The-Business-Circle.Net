export const CIRCLE_CARD_REFERRAL_COOKIE_CODE = "bcn_circle_referral_code";
export const CIRCLE_CARD_REFERRAL_COOKIE_CLICK_ID = "bcn_circle_referral_click_id";
export const CIRCLE_CARD_REFERRAL_COOKIE_SOURCE = "bcn_circle_referral_source";
export const CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_TYPE = "bcn_circle_referral_source_type";
export const CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_CARD_SLUG = "bcn_circle_referral_source_card";
export const CIRCLE_CARD_REFERRAL_COOKIE_SOURCE_EVENT = "bcn_circle_referral_source_event";
export const CIRCLE_CARD_REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export const CIRCLE_CARD_REFERRAL_SOURCE_TYPES = [
  "direct_referral_route",
  "circle_card_landing_ref",
  "public_card_ref",
  "spin_to_connect",
  "last_safe_source",
  "signup_referral_code"
] as const;

export type CircleCardReferralSourceType =
  (typeof CIRCLE_CARD_REFERRAL_SOURCE_TYPES)[number];

export const CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES = [
  "CLICKED",
  "SIGNED_UP",
  "ACTIVATED"
] as const;

export type CircleCardReferralActivationStatus =
  (typeof CIRCLE_CARD_REFERRAL_ACTIVATION_STATUSES)[number];

const REFERRAL_CODE_PATTERN = /^[a-z0-9-]{2,120}$/;
const REFERRAL_SOURCE_CARD_PATTERN = /^[a-z0-9-]{2,120}$/;

export function normalizeCircleCardReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : "";
}

export function normalizeCircleCardReferralSourceType(
  value: string | null | undefined
): CircleCardReferralSourceType | null {
  return CIRCLE_CARD_REFERRAL_SOURCE_TYPES.includes(value as CircleCardReferralSourceType)
    ? (value as CircleCardReferralSourceType)
    : null;
}

export function normalizeCircleCardReferralSourceCardSlug(
  value: string | null | undefined
) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return REFERRAL_SOURCE_CARD_PATTERN.test(normalized) ? normalized : "";
}

export function isExplicitCircleCardReferralSource(
  value: CircleCardReferralSourceType | null | undefined
) {
  return (
    value === "direct_referral_route" ||
    value === "circle_card_landing_ref" ||
    value === "public_card_ref" ||
    value === "signup_referral_code"
  );
}

export function shouldStoreCircleCardReferralAttribution(input: {
  hasExistingAttribution?: boolean;
  nextSourceType?: CircleCardReferralSourceType | null;
  hasExplicitReferralCode?: boolean;
}) {
  if (!input.hasExistingAttribution) {
    return true;
  }

  return Boolean(
    input.hasExplicitReferralCode ||
      isExplicitCircleCardReferralSource(input.nextSourceType)
  );
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
