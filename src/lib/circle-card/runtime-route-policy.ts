import type { RuntimeBrandKey } from "@/config/runtime-brand";

export type RuntimeRouteDecision =
  | { action: "allow" }
  | { action: "redirect"; destination: "/"; reason: "bcn-customer-surface" }
  | {
      action: "reject";
      status: 404;
      reason:
        | "bcn-customer-surface"
        | "bcn-process-owned-endpoint"
        | "api-not-allowlisted";
    };

const BCN_PROCESS_OWNED_API_PREFIXES = [
  "/api/webhooks/resend/inbound",
  "/api/cron",
  "/api/internal"
] as const;

const CIRCLE_CARD_EXACT_API_PATHS = new Set([
  "/api/analytics/collect",
  "/api/register",
  "/api/auth/callback/credentials",
  "/api/auth/csrf",
  "/api/auth/error",
  "/api/auth/forgot-password",
  "/api/auth/providers",
  "/api/auth/reset-password",
  "/api/auth/session",
  "/api/auth/signin",
  "/api/auth/signin/credentials",
  "/api/auth/signout",
  "/api/auth/verify-email",
  "/api/circle-card/analytics",
  "/api/circle-card/business-card-scan",
  "/api/circle-card/link-access",
  "/api/circle-card/referral-attribution",
  "/api/circle-card/referral-attribution/signup",
  "/api/circle-card/upload",
  "/api/stripe/circle-card/checkout",
  "/api/stripe/circle-card/portal",
  "/api/stripe/webhook"
]);

const CIRCLE_CARD_SCHEDULER_API_PATHS = new Set([
  "/api/internal/circle-card/activation-reminders/run",
  "/api/internal/circle-card/weekly-summary/run"
]);

const CIRCLE_CARD_DYNAMIC_API_PATTERNS = [
  /^\/api\/circle-card\/link-file\/[^/]+$/,
  /^\/api\/circle-card\/public-image\/[^/]+$/
] as const;

const CIRCLE_CARD_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password"
]);

const CIRCLE_CARD_LEGAL_PATHS = new Set([
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
  "/dpia"
]);

const CIRCLE_CARD_EXACT_PATHS = new Set([
  "/",
  "/pro",
  "/teams",
  "/community-standards",
  "/circle-card.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/circle-card-icon-192.png",
  "/circle-card-icon-512.png",
  "/circle-card-apple-touch-icon.png"
]);

const BCN_BRANDED_EXACT_PATHS = new Set([
  "/manifest.webmanifest",
  "/opengraph-image"
]);

const CIRCLE_CARD_PATH_PREFIXES = [
  "/app",
  "/circle-card",
  "/dashboard/circle-card",
  "/card",
  "/r"
] as const;

const CIRCLE_CARD_PUBLIC_ASSET_PREFIXES = [
  "/branding",
  "/uploads",
  "/visual-media"
] as const;

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function normalizePathForOwnership(pathname: string) {
  let decoded = pathname.trim();

  for (let pass = 0; pass < 8; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  const segments: string[] = [];
  for (const segment of decoded.replaceAll("\\", "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `/${segments.join("/")}`.toLowerCase();
}

function isCanonicalApiPath(pathname: string) {
  return pathname === normalizePathForOwnership(pathname);
}

function isApiLikePath(pathname: string) {
  return startsWithPath(normalizePathForOwnership(pathname), "/api");
}

function isAllowedCircleCardApiPath(pathname: string) {
  if (!isCanonicalApiPath(pathname)) {
    return false;
  }

  return (
    CIRCLE_CARD_EXACT_API_PATHS.has(pathname) ||
    CIRCLE_CARD_DYNAMIC_API_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

export function isBcnProcessOwnedRuntimePath(pathname: string) {
  const normalizedPathname = normalizePathForOwnership(pathname);
  return BCN_PROCESS_OWNED_API_PREFIXES.some((prefix) =>
    startsWithPath(normalizedPathname, prefix)
  );
}

export function getCustomerShellKind(runtimeBrand: RuntimeBrandKey) {
  return runtimeBrand === "circle-card" ? "circle-card" : "bcn";
}

export function evaluateCustomerRuntimeRoute(
  runtimeBrand: RuntimeBrandKey,
  pathname: string,
  method = "GET"
): RuntimeRouteDecision {
  if (
    CIRCLE_CARD_SCHEDULER_API_PATHS.has(pathname) &&
    isCanonicalApiPath(pathname)
  ) {
    return runtimeBrand === "circle-card" && method.toUpperCase() === "POST"
      ? { action: "allow" }
      : {
          action: "reject",
          status: 404,
          reason: "api-not-allowlisted"
        };
  }

  if (runtimeBrand === "bcn") {
    return { action: "allow" };
  }

  if (isBcnProcessOwnedRuntimePath(pathname)) {
    return {
      action: "reject",
      status: 404,
      reason: "bcn-process-owned-endpoint"
    };
  }

  if (isApiLikePath(pathname)) {
    return isAllowedCircleCardApiPath(pathname)
      ? { action: "allow" }
      : {
          action: "reject",
          status: 404,
          reason: "api-not-allowlisted"
        };
  }

  if (BCN_BRANDED_EXACT_PATHS.has(pathname)) {
    return {
      action: "reject",
      status: 404,
      reason: "bcn-customer-surface"
    };
  }

  if (
    startsWithPath(pathname, "/_next") ||
    CIRCLE_CARD_AUTH_PATHS.has(pathname) ||
    CIRCLE_CARD_LEGAL_PATHS.has(pathname) ||
    CIRCLE_CARD_EXACT_PATHS.has(pathname) ||
    CIRCLE_CARD_PATH_PREFIXES.some((prefix) => startsWithPath(pathname, prefix)) ||
    CIRCLE_CARD_PUBLIC_ASSET_PREFIXES.some((prefix) => startsWithPath(pathname, prefix))
  ) {
    return { action: "allow" };
  }

  return method === "GET" || method === "HEAD"
    ? {
        action: "redirect",
        destination: "/",
        reason: "bcn-customer-surface"
      }
    : {
        action: "reject",
        status: 404,
        reason: "bcn-customer-surface"
      };
}
