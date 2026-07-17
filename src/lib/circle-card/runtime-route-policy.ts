import type { RuntimeBrandKey } from "@/config/runtime-brand";

export type RuntimeRouteDecision =
  | { action: "allow" }
  | { action: "redirect"; destination: "/"; reason: "bcn-customer-surface" }
  | { action: "reject"; status: 404; reason: "bcn-customer-surface" };

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
  "/manifest.webmanifest",
  "/opengraph-image"
]);

const CIRCLE_CARD_PATH_PREFIXES = [
  "/app",
  "/circle-card",
  "/dashboard/circle-card",
  "/card",
  "/r",
  "/testimonial"
] as const;

const CIRCLE_CARD_PUBLIC_ASSET_PREFIXES = [
  "/branding",
  "/uploads",
  "/visual-media"
] as const;

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isRootPublicAsset(pathname: string) {
  return pathname.lastIndexOf("/") === 0 && pathname.slice(1).includes(".");
}

export function getCustomerShellKind(runtimeBrand: RuntimeBrandKey) {
  return runtimeBrand === "circle-card" ? "circle-card" : "bcn";
}

export function evaluateCustomerRuntimeRoute(
  runtimeBrand: RuntimeBrandKey,
  pathname: string,
  method = "GET"
): RuntimeRouteDecision {
  if (runtimeBrand === "bcn") {
    return { action: "allow" };
  }

  if (
    startsWithPath(pathname, "/api") ||
    startsWithPath(pathname, "/_next") ||
    CIRCLE_CARD_AUTH_PATHS.has(pathname) ||
    CIRCLE_CARD_LEGAL_PATHS.has(pathname) ||
    CIRCLE_CARD_EXACT_PATHS.has(pathname) ||
    CIRCLE_CARD_PATH_PREFIXES.some((prefix) => startsWithPath(pathname, prefix)) ||
    CIRCLE_CARD_PUBLIC_ASSET_PREFIXES.some((prefix) => startsWithPath(pathname, prefix)) ||
    isRootPublicAsset(pathname)
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
