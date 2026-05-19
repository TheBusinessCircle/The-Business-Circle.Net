export const GOOGLE_REVIEW_TESTIMONIAL_MIN_LENGTH = 20;
export const BCN_GOOGLE_REVIEW_URL = "https://g.page/r/CZfk3NbmnutQEAI/review";

type GoogleReviewCtaSettings = {
  enabled?: boolean;
  showButton?: boolean;
  googleReviewUrl?: string | null;
};

export function testimonialIsReadyForGoogleReview(testimonialText: string) {
  return testimonialText.trim().length >= GOOGLE_REVIEW_TESTIMONIAL_MIN_LENGTH;
}

export function googleReviewCtaIsActive({
  enabled,
  showButton,
  googleReviewUrl
}: GoogleReviewCtaSettings) {
  return Boolean(enabled && showButton && googleReviewUrl?.trim());
}

export function shouldShowGoogleReviewPendingState(settings: GoogleReviewCtaSettings) {
  return Boolean(settings.showButton && !googleReviewCtaIsActive(settings));
}
