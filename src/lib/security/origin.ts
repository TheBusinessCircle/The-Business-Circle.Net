import { getRuntimeBrand } from "@/config/runtime-brand";
import {
  normalizeRuntimeOrigin,
  validateRuntimeOriginEnvironment,
  type RuntimeOriginEnvironment
} from "@/config/runtime-origin";
import { isTrustedRuntimeRequestHost } from "@/lib/security/host";

type TrustedOriginOptions = {
  allowMissingOrigin?: boolean;
};

function toOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getTrustedRuntimeOrigins(
  environment: RuntimeOriginEnvironment = {
    APP_BRAND: process.env.APP_BRAND,
    APP_URL: process.env.APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV
  }
): ReadonlySet<string> {
  const validation = validateRuntimeOriginEnvironment(environment);

  if (validation.issues.length > 0) {
    throw new Error(validation.issues.map(({ message }) => message).join(" "));
  }

  const brand = validation.brand ?? getRuntimeBrand(environment);
  const origins = new Set<string>([brand.canonicalOrigin]);

  for (const { origin } of validation.configuredOrigins) {
    origins.add(origin);
  }

  if (environment.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add(brand.key === "bcn" ? "http://bcn.test" : "http://circle-card.test");
  }

  return origins;
}

function isSameSiteBrowserRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();

  return fetchSite === "same-origin" || fetchSite === "same-site";
}

export function isTrustedOrigin(
  request: Request,
  options: TrustedOriginOptions = {}
): boolean {
  if (!isTrustedRuntimeRequestHost(request)) {
    return false;
  }

  const allowed = getTrustedRuntimeOrigins();
  const originHeader = request.headers.get("origin");
  const normalizedOrigin = originHeader ? normalizeRuntimeOrigin(originHeader) : null;

  if (originHeader) {
    return normalizedOrigin ? allowed.has(normalizedOrigin) : false;
  }

  const normalizedReferer = toOrigin(request.headers.get("referer"));
  if (normalizedReferer) {
    return allowed.has(normalizedReferer);
  }

  if (isSameSiteBrowserRequest(request)) {
    return true;
  }

  return options.allowMissingOrigin ?? false;
}
