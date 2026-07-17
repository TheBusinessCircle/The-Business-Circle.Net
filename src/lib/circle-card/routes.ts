import type { RuntimeBrandKey } from "@/config/runtime-brand";

export const CIRCLE_CARD_REGISTRATION_SOURCE = "circle-card";
export const CIRCLE_CARD_SPIN_REGISTRATION_SOURCE = "circle-card-spin";
export const CIRCLE_CARD_DASHBOARD_PATH = "/dashboard/circle-card";
export const CIRCLE_CARD_ONBOARDING_PATH = "/dashboard/circle-card/onboarding";
export const CIRCLE_CARD_STUDIO_PATH = "/dashboard/circle-card/studio";
export const CIRCLE_CARD_WALLET_PATH = "/dashboard/circle-card/wallet";
export const CIRCLE_CARD_TESTIMONIAL_PATH = "/dashboard/circle-card/testimonial";
export const CIRCLE_CARD_CLEAN_DASHBOARD_PATH = "/app";
export const CIRCLE_CARD_CLEAN_ONBOARDING_PATH = "/app/onboarding";
export const CIRCLE_CARD_CLEAN_STUDIO_PATH = "/app/studio";
export const CIRCLE_CARD_CLEAN_WALLET_PATH = "/app/wallet";
export const CIRCLE_CARD_CLEAN_TESTIMONIAL_PATH = "/app/testimonial";

export type CircleCardRouteSet = {
  landing: string;
  pro: string;
  teams: string;
  communityStandards: string;
  dashboard: string;
  onboarding: string;
  studio: string;
  wallet: string;
  testimonial: string;
};

const BCN_CIRCLE_CARD_ROUTES: CircleCardRouteSet = {
  landing: "/circle-card",
  pro: "/circle-card/pro",
  teams: "/circle-card/teams",
  communityStandards: "/circle-card/community-standards",
  dashboard: CIRCLE_CARD_DASHBOARD_PATH,
  onboarding: CIRCLE_CARD_ONBOARDING_PATH,
  studio: CIRCLE_CARD_STUDIO_PATH,
  wallet: CIRCLE_CARD_WALLET_PATH,
  testimonial: CIRCLE_CARD_TESTIMONIAL_PATH
};

const STANDALONE_CIRCLE_CARD_ROUTES: CircleCardRouteSet = {
  landing: "/",
  pro: "/pro",
  teams: "/teams",
  communityStandards: "/community-standards",
  dashboard: CIRCLE_CARD_CLEAN_DASHBOARD_PATH,
  onboarding: CIRCLE_CARD_CLEAN_ONBOARDING_PATH,
  studio: CIRCLE_CARD_CLEAN_STUDIO_PATH,
  wallet: CIRCLE_CARD_CLEAN_WALLET_PATH,
  testimonial: CIRCLE_CARD_CLEAN_TESTIMONIAL_PATH
};

export function getCircleCardRoutes(runtimeBrand: RuntimeBrandKey): CircleCardRouteSet {
  return runtimeBrand === "circle-card"
    ? STANDALONE_CIRCLE_CARD_ROUTES
    : BCN_CIRCLE_CARD_ROUTES;
}

export function preferCircleCardRuntimePath(path: string, runtimeBrand: RuntimeBrandKey) {
  if (runtimeBrand !== "circle-card") {
    return path;
  }

  if (
    path === CIRCLE_CARD_DASHBOARD_PATH ||
    path.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}/`) ||
    path.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}?`) ||
    path.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}#`)
  ) {
    return `${CIRCLE_CARD_CLEAN_DASHBOARD_PATH}${path.slice(CIRCLE_CARD_DASHBOARD_PATH.length)}`;
  }

  const publicMappings = [
    ["/circle-card/community-standards", "/community-standards"],
    ["/circle-card/teams", "/teams"],
    ["/circle-card/pro", "/pro"],
    ["/circle-card", "/"]
  ] as const;

  for (const [legacyPath, cleanPath] of publicMappings) {
    if (
      path === legacyPath ||
      path.startsWith(`${legacyPath}?`) ||
      path.startsWith(`${legacyPath}#`)
    ) {
      return `${cleanPath}${path.slice(legacyPath.length)}`;
    }
  }

  return path;
}

export function resolveCircleCardAuthReturnPath(
  path: string | null | undefined,
  runtimeBrand: RuntimeBrandKey,
  fallback = getCircleCardRoutes(runtimeBrand).dashboard
) {
  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return fallback;
  }

  let preferredPath: string;
  let pathname: string;

  try {
    preferredPath = preferCircleCardRuntimePath(path, runtimeBrand);
    const parsed = new URL(preferredPath, "http://circle-card.internal");
    if (parsed.origin !== "http://circle-card.internal") {
      return fallback;
    }
    pathname = parsed.pathname;
  } catch {
    return fallback;
  }

  if (runtimeBrand === "bcn") {
    return preferredPath;
  }

  const allowedExactPaths = new Set([
    "/",
    "/pro",
    "/teams",
    "/community-standards"
  ]);
  const allowedPrefixes = ["/app", "/card", "/r", "/testimonial"];
  const allowed =
    allowedExactPaths.has(pathname) ||
    allowedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

  return allowed ? preferredPath : fallback;
}

export function isCircleCardDashboardPath(pathname: string) {
  return (
    pathname === CIRCLE_CARD_DASHBOARD_PATH ||
    pathname.startsWith(`${CIRCLE_CARD_DASHBOARD_PATH}/`) ||
    pathname === CIRCLE_CARD_CLEAN_DASHBOARD_PATH ||
    pathname.startsWith(`${CIRCLE_CARD_CLEAN_DASHBOARD_PATH}/`)
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
