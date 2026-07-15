const ANALYTICS_URL_BASE = "https://analytics.invalid";

// Replay snapshots serialize DOM attributes, including bearer-link hrefs.
// Keep replay off until those attributes can be proven scrubbed before capture.
export const ANALYTICS_SESSION_REPLAY_ENABLED = false;

const AUTHENTICATION_PATHS = [
  "/login",
  "/sign-in",
  "/register",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/api/auth"
];

const SENSITIVE_QUERY_KEY =
  /^(?:auth|authorization|code|email|invite|inviteCode|key|launchCode|password|referralCode|referredBy|requestToken|resetToken|secret|signature|token|verificationToken|session_id|checkout_session_id|stripe_session_id)$/i;

const NESTED_LOCATION_KEY =
  /^(?:callback|continue|destination|from|href|next|path|redirect|referrer|return|returnTo|returnUrl|url|uri)$/i;

const SENSITIVE_ANALYTICS_PROPERTY_KEY =
  /(?:address|authorization|checkout[_-]?session|email|invite|password|phone|secret|stripe|token)/i;

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
}

function isAuthenticationPath(pathname: string) {
  const normalized = pathname.toLowerCase();
  return AUTHENTICATION_PATHS.some(
    (path) => normalized === path || normalized.startsWith(`${path}/`)
  );
}

function redactBearerPath(pathname: string) {
  return pathname
    .replace(/^\/invite\/[^/]+/i, "/invite/[redacted]")
    .replace(/^\/testimonial\/[^/]+/i, "/testimonial/[redacted]");
}

export function isAnalyticsLocationProperty(key: string) {
  return NESTED_LOCATION_KEY.test(key) || /(?:url|uri|href|path|referrer|destination)/i.test(key);
}

/**
 * Scrub an analytics payload at every nesting level. PostHog can place person
 * properties outside the ordinary `properties` object (for example in
 * `$set_once`), so a shallow event hook is not a sufficient secret boundary.
 */
export function sanitizeAnalyticsPayload<T>(value: T, propertyName?: string): T {
  if (typeof value === "string") {
    return (
      propertyName && isAnalyticsLocationProperty(propertyName)
        ? sanitizeAnalyticsLocation(value) ?? "/"
        : value
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAnalyticsPayload(item, propertyName)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_ANALYTICS_PROPERTY_KEY.test(key)) {
      continue;
    }

    sanitized[key] = sanitizeAnalyticsPayload(nestedValue, key);
  }

  return sanitized as T;
}

export function sanitizeAnalyticsLocation(
  value: string | null | undefined
): string | null {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  try {
    const absolute = isAbsoluteUrl(candidate);
    const protocolRelative = candidate.startsWith("//");
    const url = new URL(candidate, ANALYTICS_URL_BASE);
    url.hash = "";
    url.pathname = redactBearerPath(url.pathname);

    if (
      isAuthenticationPath(url.pathname) ||
      url.pathname.startsWith("/invite/") ||
      url.pathname.startsWith("/testimonial/")
    ) {
      url.search = "";
    } else {
      for (const key of [...url.searchParams.keys()]) {
        if (SENSITIVE_QUERY_KEY.test(key)) {
          url.searchParams.delete(key);
          continue;
        }

        if (NESTED_LOCATION_KEY.test(key)) {
          const nested = url.searchParams.get(key);
          const sanitizedNested = sanitizeAnalyticsLocation(nested);
          if (sanitizedNested) {
            url.searchParams.set(key, sanitizedNested);
          }
        }
      }
    }

    const relative = `${url.pathname}${url.search}`;
    if (absolute) {
      return `${url.origin}${relative}`;
    }
    if (protocolRelative) {
      return `//${url.host}${relative}`;
    }
    return relative;
  } catch {
    const pathOnly = candidate.split(/[?#]/, 1)[0] || "/";
    return redactBearerPath(pathOnly);
  }
}
