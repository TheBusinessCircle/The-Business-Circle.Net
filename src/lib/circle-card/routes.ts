export const CIRCLE_CARD_REGISTRATION_SOURCE = "circle-card";
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
