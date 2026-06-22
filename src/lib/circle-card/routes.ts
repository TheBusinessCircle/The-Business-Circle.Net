export const CIRCLE_CARD_REGISTRATION_SOURCE = "circle-card";
export const CIRCLE_CARD_SPIN_REGISTRATION_SOURCE = "circle-card-spin";
export const CIRCLE_CARD_DASHBOARD_PATH = "/dashboard/circle-card";
export const CIRCLE_CARD_ONBOARDING_PATH = "/dashboard/circle-card/onboarding";

export function isCircleCardDashboardPath(pathname: string) {
  return (
    pathname === CIRCLE_CARD_DASHBOARD_PATH ||
    pathname.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}/`)
  );
}

export function isCircleCardRegistrationSource(value: string | null | undefined) {
  return value === CIRCLE_CARD_REGISTRATION_SOURCE;
}

export function isCircleCardAccountSource(value: string | null | undefined) {
  return (
    value === CIRCLE_CARD_REGISTRATION_SOURCE ||
    value === CIRCLE_CARD_SPIN_REGISTRATION_SOURCE
  );
}

export function isCircleCardFirstAccount(input?: {
  registrationSource?: string | null;
  hasCircleCard?: boolean | null;
  suspended?: boolean | null;
}) {
  if (!input || input.suspended) {
    return false;
  }

  return Boolean(input.hasCircleCard) || isCircleCardAccountSource(input.registrationSource);
}
