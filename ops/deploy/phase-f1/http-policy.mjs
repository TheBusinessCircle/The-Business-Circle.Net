export const OWNER_ROUTE_VARIANTS = Object.freeze([
  "/api/stripe/webhook",
  "//api//stripe//webhook",
  "/api%2Fstripe%2Fwebhook",
  "/api/stripe/%2e/webhook",
  "/API/STRIPE/WEBHOOK",
  "/api/stripe/webhook/",
  "/api/stripe/webhook?disguise=/safe",
  "/api/webhooks/resend/inbound",
  "/api%2Fwebhooks%2Fresend%2Finbound",
  "/api/cron/test",
  "/api%2Fcron%2Ftest",
  "/api/internal/test",
  "/api%2Finternal%2Ftest"
]);
export const OWNER_ROUTE_METHODS = Object.freeze(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
export function assertOwnerRouteDenial({ status, location }, method, path) {
  if (status < 400 || status >= 500 || location) throw new Error(`Owner route denial failed: ${method} ${path}`);
  return true;
}
export function assertUncachedPublicResponse(headers) {
  const value = headers.get("cf-cache-status");
  if (!value || value.toUpperCase() === "HIT") throw new Error("Public smoke response lacks non-stale Cloudflare cache evidence.");
  return value;
}

export function isCircleOwnerRequestTarget(target) {
  const rawPath = String(target).split("?", 1)[0];
  let decoded = rawPath;
  try { decoded = decodeURIComponent(rawPath); } catch { return true; }
  const normalized = decoded.replace(/\/{2,}/gu, "/").replace(/\/\.\//gu, "/").toLowerCase().replace(/\/+$/u, "");
  return normalized === "/api/stripe/webhook" || normalized === "/api/webhooks/resend/inbound" || normalized === "/api/cron" || normalized.startsWith("/api/cron/") || normalized === "/api/internal" || normalized.startsWith("/api/internal/");
}

export function expectedCircleHttpStatusClass(method, target) {
  if (isCircleOwnerRequestTarget(target)) return 404;
  return new Set(["GET", "HEAD"]).has(method) ? 308 : 405;
}
